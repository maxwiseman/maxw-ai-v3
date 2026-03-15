/**
 * Sandbox workspace sync API — called by the in-sandbox sync script.
 *
 * No R2 credentials are ever placed inside the sandbox. Instead the sandbox
 * holds a short-lived HMAC sync token (userId + chatId + expiry). This endpoint
 * verifies the token and brokers short-lived presigned S3 URLs.
 *
 * POST /api/sandbox/sync   — upload: returns presigned PUT URLs for the chat workspace
 * GET  /api/sandbox/sync   — restore: returns presigned GET URLs merging all three sources:
 *                              1. global/skills/         → skills/{filename}
 *                              2. users/{id}/skills/     → skills/{filename}  (wins over global)
 *                              3. users/{id}/chats/{chatId}/workspace/  → relative path
 * DELETE /api/sandbox/sync — delete a file from the chat workspace
 */

import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type NextRequest, NextResponse } from "next/server";
import {
  GLOBAL_SKILLS_PREFIX,
  chatWorkspacePrefix,
  listR2Objects,
  r2,
  r2Key,
  userSkillKey,
  userSkillsPrefix,
} from "@/ai/sandbox/r2-client";
import { invalidateSkillsTree } from "@/ai/sandbox/skills-tree";
import { verifySyncToken } from "@/ai/sandbox/sync-token";
import { env } from "@/env";

const MAX_FILES_PER_REQUEST = 200;
/** Presigned URL lifetime — short so a leaked URL is useless quickly. */
const PRESIGN_TTL_SECONDS = 5 * 60;

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function sanitizePath(rawPath: string): string | null {
  if (rawPath.includes("\0")) return null;
  // Normalize resolves all `.` and `..` components; stripping the leading `/`
  // means a path that escapes the root will start with `..` after normalization.
  const normalized = path.posix.normalize("/" + rawPath.trim()).slice(1);
  if (!normalized || normalized.startsWith("..") || normalized.startsWith("/")) return null;
  return normalized;
}

const presign = (key: string) =>
  getSignedUrl(r2, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }), {
    expiresIn: PRESIGN_TTL_SECONDS,
  });

/**
 * POST — upload
 * Body: { files: string[] }
 * Returns: { uploads: Array<{ path: string; url: string }> }
 */
export async function POST(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claims = verifySyncToken(token);
  if (!claims) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });

  let body: { files?: unknown };
  try {
    body = (await req.json()) as { files?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.files) || body.files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: "Invalid files array" }, { status: 400 });
  }

  const uploads = await Promise.all(
    (body.files as unknown[]).map(async (rawPath) => {
      if (typeof rawPath !== "string") return null;
      const safePath = sanitizePath(rawPath);
      if (!safePath) return null;

      // skills/ files belong under users/{userId}/skills/, not per-chat workspace
      const key = safePath.startsWith("skills/")
        ? userSkillKey(claims.userId, safePath.slice("skills/".length))
        : r2Key(claims.userId, claims.chatId, safePath);
      const url = await getSignedUrl(
        r2,
        new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
        { expiresIn: PRESIGN_TTL_SECONDS },
      );
      return { path: rawPath, url };
    }),
  );

  // Invalidate cached skills tree if any skill file changed
  const touchedSkills = (body.files as unknown[]).some(
    (p) => typeof p === "string" && p.startsWith("skills/"),
  );
  if (touchedSkills) await invalidateSkillsTree(claims.userId);

  return NextResponse.json({ uploads: uploads.filter(Boolean) });
}

/**
 * GET — restore
 * Merges three sources into one file list for the sandbox to download:
 *   1. global/skills/        → skills/{filename}          (lowest priority)
 *   2. users/{id}/skills/    → skills/{filename}          (overrides globals)
 *   3. chat workspace        → relative path as-is        (chat files, may override skills)
 *
 * Returns: { files: Array<{ path: string; url: string; size: number }> }
 */
export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claims = verifySyncToken(token);
  if (!claims) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });

  const workspacePrefix = chatWorkspacePrefix(claims.userId, claims.chatId);
  const userSkillPrefix = userSkillsPrefix(claims.userId);

  const [globalObjects, userSkillObjects, workspaceObjects] = await Promise.all([
    listR2Objects(GLOBAL_SKILLS_PREFIX),
    listR2Objects(userSkillPrefix),
    listR2Objects(workspacePrefix),
  ]);

  const globalFiles = await Promise.all(
    globalObjects.map(async (obj) => ({
      path: `skills/${obj.key.slice(GLOBAL_SKILLS_PREFIX.length)}`,
      url: await presign(obj.key),
      size: obj.size,
    })),
  );

  const userSkillFiles = await Promise.all(
    userSkillObjects.map(async (obj) => ({
      path: `skills/${obj.key.slice(userSkillPrefix.length)}`,
      url: await presign(obj.key),
      size: obj.size,
    })),
  );

  const workspaceFiles = await Promise.all(
    workspaceObjects.map(async (obj) => ({
      path: obj.key.slice(workspacePrefix.length),
      url: await presign(obj.key),
      size: obj.size,
    })),
  );

  // Process in priority order: globals first, user skills override, workspace files last
  return NextResponse.json({ files: [...globalFiles, ...userSkillFiles, ...workspaceFiles] });
}

/**
 * DELETE — delete a file from the chat workspace.
 * Body: { path: string }
 */
export async function DELETE(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claims = verifySyncToken(token);
  if (!claims) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });

  let body: { path?: unknown };
  try {
    body = (await req.json()) as { path?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.path !== "string")
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });

  const safePath = sanitizePath(body.path);
  if (!safePath) return NextResponse.json({ error: "Invalid path" }, { status: 400 });

  const key = safePath.startsWith("skills/")
    ? userSkillKey(claims.userId, safePath.slice("skills/".length))
    : r2Key(claims.userId, claims.chatId, safePath);
  await r2.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));

  if (safePath.startsWith("skills/")) await invalidateSkillsTree(claims.userId);

  return NextResponse.json({ ok: true });
}
