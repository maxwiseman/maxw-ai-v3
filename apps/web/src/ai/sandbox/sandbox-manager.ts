/**
 * Sandbox Manager
 * Manages Daytona sandbox lifecycle with Upstash Redis caching.
 * Sandboxes are stopped after each request (filesystem persists) and
 * auto-archived after 10 minutes of inactivity.
 */

import { Daytona, DaytonaNotFoundError, type Sandbox } from "@daytonaio/sdk";
import { Redis } from "@upstash/redis";
import { env } from "@/env";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const daytona = new Daytona({ apiKey: env.DAYTONA_API_KEY });

const REDIS_KEY = (chatId: string) => `sandbox:chat:${chatId}`;
// 30 days — sandbox can be archived but ID is still valid for reconnection
const REDIS_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * Get an existing sandbox or create a new one for this chat.
 * Reconnects to a stopped/archived sandbox if one exists (fast/slow respectively).
 */
export async function getOrCreateSandbox(chatId: string): Promise<Sandbox> {
  const existingId = await redis.get<string>(REDIS_KEY(chatId));

  if (existingId) {
    try {
      const sandbox = await daytona.get(existingId);
      await sandbox.start();
      return sandbox;
    } catch (err) {
      if (!(err instanceof DaytonaNotFoundError)) {
        throw err;
      }
      // Sandbox was deleted externally — fall through to create a new one
      console.log(`[sandbox] Sandbox ${existingId} not found for chat ${chatId}, creating new one`);
    }
  }

  const sandbox = await daytona.create({
    language: "python",
    autoStopInterval: 0, // we stop manually at end of each request
    autoArchiveInterval: 10, // auto-archive 10min after stop
  });

  await redis.set(REDIS_KEY(chatId), sandbox.id, { ex: REDIS_TTL_SECONDS });
  return sandbox;
}

/**
 * Stop a sandbox after request completes. Preserves filesystem.
 */
export async function stopSandbox(chatId: string): Promise<void> {
  const sandboxId = await redis.get<string>(REDIS_KEY(chatId));
  if (!sandboxId) return;

  try {
    const sandbox = await daytona.get(sandboxId);
    await sandbox.stop();
  } catch {
    // Ignore errors — sandbox may already be stopped or deleted
  }
}

/**
 * Remove a sandbox and its Redis entry (used for sub-agent cleanup).
 */
export async function deleteSandbox(chatId: string): Promise<void> {
  const sandboxId = await redis.get<string>(REDIS_KEY(chatId));
  if (!sandboxId) return;

  try {
    const sandbox = await daytona.get(sandboxId);
    await sandbox.stop();
    await sandbox.delete();
  } catch {
    // Ignore errors
  }

  await redis.del(REDIS_KEY(chatId));
}

export type { Sandbox };
