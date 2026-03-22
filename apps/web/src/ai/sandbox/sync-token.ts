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
    JSON.stringify({
      userId,
      chatId,
      exp: Date.now() + expiresInMs,
    } satisfies SyncTokenPayload),
  ).toString("base64url");

  const sig = createHmac("sha256", env.AUTH_SECRET)
    .update(payload)
    .digest("base64url");

  return `${payload}.${sig}`;
}

export function verifySyncToken(token: string): SyncTokenPayload | null {
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx === -1) {
    console.error("[sync-token] No dot separator found in token");
    return null;
  }

  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);

  const expectedSig = createHmac("sha256", env.AUTH_SECRET)
    .update(payloadB64)
    .digest("base64url");

  try {
    if (
      !timingSafeEqual(
        Buffer.from(sigB64, "base64url"),
        Buffer.from(expectedSig, "base64url"),
      )
    ) {
      console.error(
        "[sync-token] Signature mismatch — AUTH_SECRET likely differs between token creation and verification",
      );
      return null;
    }
  } catch (e) {
    console.error("[sync-token] timingSafeEqual threw:", e);
    return null;
  }

  let payload: SyncTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString(),
    ) as SyncTokenPayload;
  } catch (e) {
    console.error("[sync-token] Failed to parse payload:", e);
    return null;
  }

  if (
    typeof payload.userId !== "string" ||
    typeof payload.chatId !== "string" ||
    typeof payload.exp !== "number"
  ) {
    console.error("[sync-token] Payload missing required fields:", payload);
    return null;
  }

  if (payload.exp < Date.now()) {
    console.error(
      "[sync-token] Token expired at",
      new Date(payload.exp).toISOString(),
    );
    return null;
  }

  return payload;
}
