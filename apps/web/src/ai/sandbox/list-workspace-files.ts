/**
 * List Workspace Files
 * Scans the R2 output directory for a chat and upserts DB records for any files
 * not yet indexed. Files are persisted to R2 by the in-sandbox sync script —
 * this just keeps the DB index in sync.
 * Called in onFinish as a lightweight post-turn indexing step.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sandboxFile } from "@/db/schema/sandbox-files";
import { chatWorkspacePrefix, listR2Objects } from "./r2-client";

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  html: "text/html",
  htm: "text/html",
  js: "text/javascript",
  ts: "text/typescript",
  py: "text/x-python",
  json: "application/json",
  xml: "application/xml",
  yaml: "text/yaml",
  yml: "text/yaml",
  sh: "text/x-sh",
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  typ: "text/plain",
};

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

/**
 * List all files in a chat's workspace from R2 and upsert any new ones into the DB.
 * Safe to call even if the workspace is empty.
 */
export async function listWorkspaceFiles(
  userId: string,
  chatId: string,
): Promise<void> {
  const workspacePrefix = chatWorkspacePrefix(userId, chatId);

  let objects: Array<{ key: string; size: number }>;
  try {
    objects = await listR2Objects(workspacePrefix);
  } catch (err) {
    console.error("[listWorkspaceFiles] Failed to list R2 objects:", err);
    return;
  }

  if (objects.length === 0) return;

  // Build entries with relative path as display name
  const fileEntries = objects.map((obj) => ({
    key: obj.key,
    filename: obj.key.slice(workspacePrefix.length), // relative path from workspace root
    size: obj.size,
  })).filter((f) => f.filename);

  const r2Keys = fileEntries.map((f) => f.key);

  // Find which are already indexed by r2Key
  const existingFiles = await db
    .select({ r2Key: sandboxFile.r2Key })
    .from(sandboxFile)
    .where(
      and(
        eq(sandboxFile.chatId, chatId),
        eq(sandboxFile.userId, userId),
        inArray(sandboxFile.r2Key, r2Keys),
      ),
    );

  const existingSet = new Set(existingFiles.map((f) => f.r2Key));
  const newEntries = fileEntries.filter((f) => !existingSet.has(f.key));

  if (newEntries.length === 0) return;

  await db.insert(sandboxFile).values(
    newEntries.map((f) => ({
      userId,
      chatId,
      filename: f.filename,
      r2Key: f.key,
      contentType: getMimeType(f.filename.split("/").pop() ?? f.filename),
      sizeBytes: f.size,
    })),
  );

  console.log(`[listWorkspaceFiles] Indexed ${newEntries.length} new file(s) for chat ${chatId}`);
}
