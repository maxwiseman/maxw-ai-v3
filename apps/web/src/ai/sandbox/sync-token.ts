/**
 * Short-lived HMAC tokens used to authenticate the sandbox's sync script
 * against /api/sandbox/sync. The token contains userId + chatId so the API
 * can scope all R2 operations to that chat's workspace without ever placing
 * real R2 credentials inside the sandbox.
 *
 * Format: base64url(payload) + "." + base64url(HMAC-SHA256(payload, AUTH_SECRET))
 */

import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/env";

interface SyncTokenPayload {
  userId: string;
  chatId: string;
  /** Unix ms expiry */
  exp: number;
}

export function createSyncToken(
  userId: string,
  chatId: string,
  /** Defaults to 8 hours — longer than the max sandbox lifetime. */
  expiresInMs = 8 * 60 * 60 * 1000,
): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, chatId, exp: Date.now() + expiresInMs } satisfies SyncTokenPayload),
  ).toString("base64url");

  const sig = createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");

  return `${payload}.${sig}`;
}

export function verifySyncToken(token: string): SyncTokenPayload | null {
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx === -1) return null;

  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);

  const expectedSig = createHmac("sha256", env.AUTH_SECRET)
    .update(payloadB64)
    .digest("base64url");

  try {
    if (!timingSafeEqual(Buffer.from(sigB64, "base64url"), Buffer.from(expectedSig, "base64url")))
      return null;
  } catch {
    return null;
  }

  let payload: SyncTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as SyncTokenPayload;
  } catch {
    return null;
  }

  if (
    typeof payload.userId !== "string" ||
    typeof payload.chatId !== "string" ||
    typeof payload.exp !== "number"
  )
    return null;
  if (payload.exp < Date.now()) return null;

  return payload;
}
