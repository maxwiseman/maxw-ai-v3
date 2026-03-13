/**
 * Sandbox Manager
 * Manages Daytona sandbox lifecycle with Upstash Redis caching.
 * Sandboxes auto-stop after 5 minutes of inactivity and auto-archive after 30 minutes.
 * We never stop them manually — the auto-stop handles billing, and avoiding manual stops
 * means the user can immediately use the sandbox again without waiting for a restart.
 */

import { Daytona, DaytonaError, DaytonaNotFoundError, type Sandbox } from "@daytonaio/sdk";
import { Redis } from "@upstash/redis";
import { env } from "@/env";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const daytona = new Daytona({ apiKey: env.DAYTONA_API_KEY });

const REDIS_KEY = (userId: string, chatId: string) =>
  `sandbox:user:${userId}:chat:${chatId}`;
// 30 days — sandbox can be archived but ID is still valid for reconnection
const REDIS_TTL_SECONDS = 60 * 60 * 24 * 30;

async function ensureChatDirectory(
  sandbox: Sandbox,
  friendlyChatId?: string,
): Promise<void> {
  if (!friendlyChatId) return;

  const workspace = "/home/daytona/workspace";
  const chatDir = `${workspace}/chat/${friendlyChatId}`;
  await sandbox.process.executeCommand(`mkdir -p "${chatDir}"`, workspace);
}

/**
 * Get an existing sandbox or create a new one for this chat.
 * Handles "stopping" state gracefully by waiting for it to finish, then starting.
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

      // If the sandbox is in the middle of stopping, wait for it to finish
      // before we attempt to start it again.
      if (sandbox.state === "stopping") {
        console.log(`[sandbox] Sandbox ${existingId} is stopping — waiting for it to stop before restarting`);
        try {
          await sandbox.waitUntilStopped(60);
        } catch (waitErr) {
          // If we time out or get an error, fall through and try start() anyway
          console.warn(`[sandbox] Wait-until-stopped timed out for ${existingId}:`, waitErr);
        }
      }

      // If already started, no need to call start() again
      if (sandbox.state !== "started") {
        await sandbox.start();
      }

      await ensureChatDirectory(sandbox, friendlyChatId);
      return sandbox;
    } catch (err) {
      if (!(err instanceof DaytonaNotFoundError)) {
        // Re-surface any "sandbox is stopping" type errors with a helpful message
        const msg = err instanceof DaytonaError ? err.message : String(err);
        if (/stopping|transition|busy/i.test(msg)) {
          throw new Error(
            `The sandbox is currently stopping. Please try again in a few seconds. (${msg})`,
          );
        }
        throw err;
      }
      // Sandbox was deleted externally — fall through to create a new one
      console.log(
        `[sandbox] Sandbox ${existingId} not found for chat ${chatId}, creating new one`,
      );
    }
  }

  const sandbox = await daytona.create({
    language: "python",
    autoStopInterval: 5,    // auto-stop 5 minutes after last activity
    autoArchiveInterval: 30, // auto-archive 30 minutes after stop
  });

  await redis.set(key, sandbox.id, { ex: REDIS_TTL_SECONDS });
  await ensureChatDirectory(sandbox, friendlyChatId);
  return sandbox;
}

/**
 * Returns the sandbox for this chat only if it is already in the "started" state.
 * Does NOT call sandbox.start() — safe to use in onFinish for opportunistic tasks
 * like syncing output files without spinning up a sandbox unnecessarily.
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
 * Remove a sandbox and its Redis entry (used for cleanup).
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
    await sandbox.stop();
    await sandbox.delete();
  } catch {
    // Ignore errors
  }

  await redis.del(key);
}

export type { Sandbox };
