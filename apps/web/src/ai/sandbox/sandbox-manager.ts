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
  await sandbox.process.executeCommand(
    `mkdir -p "${chatDir}"`,
    workspace,
  );
}

/**
 * Get an existing sandbox or create a new one for this chat.
 * Reconnects to a stopped/archived sandbox if one exists (fast/slow respectively).
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
      await sandbox.start();
      await ensureChatDirectory(sandbox, friendlyChatId);
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

  await redis.set(key, sandbox.id, { ex: REDIS_TTL_SECONDS });
  await ensureChatDirectory(sandbox, friendlyChatId);
  return sandbox;
}

/**
 * Stop a sandbox after request completes. Preserves filesystem.
 */
export async function stopSandbox(
  userId: string,
  chatId: string,
): Promise<void> {
  const key = REDIS_KEY(userId, chatId);
  const sandboxId = await redis.get<string>(key);
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
