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
import { listR2Objects, r2Key } from "./r2-client";

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
 * List output files for a chat from R2 and upsert any new ones into the DB.
 * Safe to call even if the output directory doesn't exist yet.
 */
export async function listWorkspaceFiles(
  userId: string,
  chatId: string,
  friendlyChatId: string,
): Promise<void> {
  const outputPrefix = r2Key(userId, chatId, "chat", friendlyChatId, "output");

  let objects: Array<{ key: string; size: number }>;
  try {
    objects = await listR2Objects(`${outputPrefix}/`);
  } catch (err) {
    console.error("[listWorkspaceFiles] Failed to list R2 objects:", err);
    return;
  }

  if (objects.length === 0) return;

  // Extract filenames from keys
  const fileEntries = objects.map((obj) => ({
    key: obj.key,
    filename: obj.key.split("/").pop()!,
    size: obj.size,
  })).filter((f) => f.filename);

  const filenames = fileEntries.map((f) => f.filename);

  // Find which are already indexed
  const existingFiles = await db
    .select({ filename: sandboxFile.filename })
    .from(sandboxFile)
    .where(
      and(
        eq(sandboxFile.chatId, chatId),
        eq(sandboxFile.userId, userId),
        inArray(sandboxFile.filename, filenames),
      ),
    );

  const existingSet = new Set(existingFiles.map((f) => f.filename));
  const newEntries = fileEntries.filter((f) => !existingSet.has(f.filename));

  if (newEntries.length === 0) return;

  await db.insert(sandboxFile).values(
    newEntries.map((f) => ({
      userId,
      chatId,
      filename: f.filename,
      r2Key: f.key,
      contentType: getMimeType(f.filename),
      sizeBytes: f.size,
    })),
  );

  console.log(`[listWorkspaceFiles] Indexed ${newEntries.length} new file(s) for chat ${chatId}`);
}
