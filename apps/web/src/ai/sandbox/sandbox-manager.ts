/**
 * Sandbox Manager
 * Manages Daytona sandbox lifecycle with Upstash Redis caching.
 *
 * Workspaces are synced to R2 via /api/sandbox/sync — the sandbox never holds
 * real R2 credentials. Instead it gets a short-lived HMAC sync token that the
 * sync script uses to obtain presigned PUT/GET URLs scoped to this user's
 * workspace prefix.
 */

import { Daytona, DaytonaError, DaytonaNotFoundError, type Sandbox } from "@daytonaio/sdk";
import { Redis } from "@upstash/redis";
import { createSyncToken } from "./sync-token";
import { env } from "@/env";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Resolve the public URL the sandbox sync script should call back to.
 * On Vercel preview/development deployments VERCEL_URL is used automatically
 * so NEXT_PUBLIC_SERVER_URL doesn't need to be set there.
 */
function getSyncApiUrl(): string {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "preview" || vercelEnv === "development") {
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) return `https://${vercelUrl}`;
  }
  if (env.NEXT_PUBLIC_SERVER_URL) return env.NEXT_PUBLIC_SERVER_URL;
  throw new Error(
    "NEXT_PUBLIC_SERVER_URL is not set. Required for non-Vercel deployments.",
  );
}

const daytona = new Daytona({ apiKey: env.DAYTONA_API_KEY });

const REDIS_KEY = (userId: string, chatId: string) =>
  `sandbox:user:${userId}:chat:${chatId}`;
// 7 days — sandbox IDs are short-lived since we delete and recreate as needed
const REDIS_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Block until the sync script has finished restoring the workspace from R2.
 * The script writes /home/daytona/.sync-ready when done.
 * Without this, the agent can run bash commands against an empty workspace.
 */
async function waitForSyncReady(sandbox: Sandbox, timeoutSeconds = 60): Promise<void> {
  await sandbox.process.executeCommand(
    `timeout ${timeoutSeconds} bash -c 'until [ -f /home/daytona/.sync-ready ]; do sleep 0.5; done'`,
  );
}

async function ensureChatDirectory(
  sandbox: Sandbox,
  friendlyChatId?: string,
): Promise<void> {
  if (!friendlyChatId) return;

  const workspace = "/home/daytona/workspace";
  const chatDir = `${workspace}/chat/${friendlyChatId}`;
  await sandbox.process.executeCommand(`mkdir -p "${chatDir}"`, workspace);
}

/** Create a fresh sandbox. R2 credentials never enter the sandbox — only the sync token. */
async function createSandbox(userId: string, chatId: string): Promise<Sandbox> {
  // 8-hour token — longer than the maximum sandbox lifetime so it never expires mid-session
  const syncToken = createSyncToken(userId, chatId, 8 * 60 * 60 * 1000);

  return daytona.create({
    ...(env.DAYTONA_SNAPSHOT ? { snapshot: env.DAYTONA_SNAPSHOT } : { language: "python" }),
    autoStopInterval: 5,
    autoArchiveInterval: 1,
    envVars: {
      SYNC_API_URL: getSyncApiUrl(),
      SYNC_TOKEN: syncToken,
      // SYNC_INTERVAL can be overridden here if desired (default: 30s)
    },
  });
}

/**
 * Get an existing sandbox or create a new one for this chat.
 * If the sandbox is stopped or archived, it is deleted and a fresh one is
 * created — the sync script restores the workspace from R2 automatically.
 */
export async function getOrCreateSandbox(
  userId: string,
  chatId: string,
  friendlyChatId?: string,
): Promise<Sandbox> {
  const key = REDIS_KEY(userId, chatId);
  const existingId = await redis.get<string>(key);

  if (existingId) {
    try {
      const sandbox = await daytona.get(existingId);

      if (sandbox.state === "started") {
        await waitForSyncReady(sandbox);
        await ensureChatDirectory(sandbox, friendlyChatId);
        return sandbox;
      }

      // If stopping, wait briefly then fall through to delete + recreate
      if (sandbox.state === "stopping") {
        console.log(`[sandbox] Sandbox ${existingId} is stopping — waiting before recreating`);
        try {
          await sandbox.waitUntilStopped(30);
        } catch {
          // Continue to delete regardless
        }
      }

      // Sandbox is stopped/archived — delete it (R2 has the state) and create fresh
      console.log(
        `[sandbox] Sandbox ${existingId} is ${sandbox.state} — deleting and recreating (workspace persisted in R2)`,
      );
      try {
        await sandbox.delete();
      } catch {
        // Ignore delete errors — might already be gone
      }
    } catch (err) {
      if (!(err instanceof DaytonaNotFoundError)) {
        const msg = err instanceof DaytonaError ? err.message : String(err);
        if (/stopping|transition|busy/i.test(msg)) {
          throw new Error(
            `The sandbox is currently stopping. Please try again in a few seconds. (${msg})`,
          );
        }
        throw err;
      }
      console.log(
        `[sandbox] Sandbox ${existingId} not found for chat ${chatId}, creating new one`,
      );
    }
  }

  const sandbox = await createSandbox(userId, chatId);
  await redis.set(key, sandbox.id, { ex: REDIS_TTL_SECONDS });
  await waitForSyncReady(sandbox);
  await ensureChatDirectory(sandbox, friendlyChatId);
  return sandbox;
}

/**
 * Returns the sandbox for this chat only if it is already in the "started" state.
 * Does NOT call sandbox.start() — safe to use in onFinish for opportunistic tasks.
 * Returns null if no sandbox exists, or if it is stopped/stopping/archived.
 */
export async function getSandboxIfRunning(
  userId: string,
  chatId: string,
): Promise<Sandbox | null> {
  const key = REDIS_KEY(userId, chatId);
  const sandboxId = await redis.get<string>(key);
  if (!sandboxId) return null;

  try {
    const sandbox = await daytona.get(sandboxId);
    if (sandbox.state !== "started") return null;
    return sandbox;
  } catch {
    return null;
  }
}

/**
 * Remove a sandbox and its Redis entry (used for explicit cleanup).
 */
export async function deleteSandbox(
  userId: string,
  chatId: string,
): Promise<void> {
  const key = REDIS_KEY(userId, chatId);
  const sandboxId = await redis.get<string>(key);
  if (!sandboxId) return;

  try {
    const sandbox = await daytona.get(sandboxId);
    await sandbox.delete();
  } catch {
    // Ignore errors
  }

  await redis.del(key);
}

export type { Sandbox };
