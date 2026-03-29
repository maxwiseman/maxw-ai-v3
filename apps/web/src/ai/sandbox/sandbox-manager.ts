/**
 * Sandbox Manager
 * Manages Daytona sandbox lifecycle with Upstash Redis caching.
 *
 * Since workspace state is fully persisted in R2, sandboxes are disposable.
 * If the cached sandbox ID is gone or not running, we just create a fresh one
 * and let the sync script restore the workspace automatically.
 */

import { Daytona, DaytonaNotFoundError, type Sandbox } from "@daytonaio/sdk";
import { Redis } from "@upstash/redis";
import { env } from "@/env";
import { createSyncToken } from "./sync-token";

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
const REDIS_TTL_SECONDS = 60 * 60; // 1 hour — sandboxes auto-delete after 30 min of inactivity

/**
 * Block until the sync script has finished restoring the workspace from R2.
 * The script writes /home/daytona/.sync-ready when done.
 * Without this, the agent can run bash commands against an empty workspace.
 */
async function waitForSyncReady(
  sandbox: Sandbox,
  timeoutSeconds = 60,
): Promise<void> {
  const t0 = Date.now();
  await sandbox.process.executeCommand(
    `timeout ${timeoutSeconds} bash -c 'until [ -f /home/daytona/.sync-ready ]; do sleep 0.5; done'`,
  );
  console.log(`[sandbox] ${sandbox.id} sync-ready in ${Date.now() - t0}ms`);
}

/** Create a fresh sandbox. R2 credentials never enter the sandbox — only the sync token. */
async function createSandbox(userId: string, chatId: string): Promise<Sandbox> {
  const syncToken = createSyncToken(userId, chatId, 8 * 60 * 60 * 1000);

  const t0 = Date.now();
  console.log(`[sandbox] creating new sandbox for chat ${chatId}...`);

  const sandbox = await daytona.create({
    ...(env.DAYTONA_SNAPSHOT
      ? { snapshot: env.DAYTONA_SNAPSHOT }
      : { language: "python" }),
    autoStopInterval: 30, // stop after 30 min of inactivity
    autoDeleteInterval: 0, // delete immediately after stopping — workspace lives in R2, no reason to keep around
    envVars: {
      SYNC_API_URL: getSyncApiUrl(),
      SYNC_TOKEN: syncToken,
    },
  });

  console.log(
    `[sandbox] sandbox ${sandbox.id} created in ${Date.now() - t0}ms`,
  );
  return sandbox;
}

/**
 * Get the running sandbox for this chat, or create a fresh one.
 * If the cached ID is gone or not in "started" state, we create a new one —
 * the sync script will restore the workspace from R2 automatically.
 */
export async function getOrCreateSandbox(
  userId: string,
  chatId: string,
): Promise<Sandbox> {
  const key = REDIS_KEY(userId, chatId);
  const existingId = await redis.get<string>(key);

  if (existingId) {
    try {
      const sandbox = await daytona.get(existingId);
      if (sandbox.state === "started") {
        await waitForSyncReady(sandbox);
        return sandbox;
      }
      console.log(
        `[sandbox] ${existingId} is ${sandbox.state} — creating fresh (workspace in R2)`,
      );
    } catch (err) {
      if (!(err instanceof DaytonaNotFoundError)) throw err;
      console.log(`[sandbox] ${existingId} was deleted — creating fresh`);
    }
  }

  const sandbox = await createSandbox(userId, chatId);
  await redis.set(key, sandbox.id, { ex: REDIS_TTL_SECONDS });
  await waitForSyncReady(sandbox);
  return sandbox;
}

/**
 * Returns the sandbox only if it is currently running.
 * Safe to call in onFinish — does not create or start anything.
 */
export async function getSandboxIfRunning(
  userId: string,
  chatId: string,
): Promise<Sandbox | null> {
  const sandboxId = await redis.get<string>(REDIS_KEY(userId, chatId));
  if (!sandboxId) return null;

  try {
    const sandbox = await daytona.get(sandboxId);
    return sandbox.state === "started" ? sandbox : null;
  } catch {
    return null;
  }
}

/** Explicitly delete a sandbox and clear its Redis entry. */
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
    // Already gone — that's fine
  }

  await redis.del(key);
}

export type { Sandbox };
