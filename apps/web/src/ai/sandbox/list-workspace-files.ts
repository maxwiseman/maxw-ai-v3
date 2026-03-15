/**
 * Workspace File Indexing
 * Scans the R2 workspace for a chat and upserts DB records for any user files
 * not yet indexed. Called in onFinish *after* a force-sync so files are
 * guaranteed to already be in R2.
 *
 * Also exports getWorkspaceFilesForStream for reading the indexed list back
 * out to stream to the client.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sandboxFile } from "@/db/schema/sandbox-files";
import { chatWorkspacePrefix, listR2Objects } from "./r2-client";

// data/ and skills/ now live at /home/daytona/data/ and /home/daytona/skills/
// (outside the workspace), so they never appear in R2 under the workspace
// prefix and don't need to be filtered here.

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
 * Scan R2 for all user files in a chat's workspace and upsert any new ones
 * into the DB.
 * Safe to call even if the workspace is empty.
 */
export async function indexWorkspaceFiles(
  userId: string,
  chatId: string,
): Promise<void> {
  const workspacePrefix = chatWorkspacePrefix(userId, chatId);

  let objects: Array<{ key: string; size: number }>;
  try {
    objects = await listR2Objects(workspacePrefix);
  } catch (err) {
    console.error("[indexWorkspaceFiles] Failed to list R2 objects:", err);
    return;
  }

  if (objects.length === 0) return;

  // Build entries, using relative path as filename. Filter internal dirs.
  const fileEntries = objects
    .map((obj) => ({
      key: obj.key,
      filename: obj.key.slice(workspacePrefix.length), // e.g. "report.pdf"
      size: obj.size,
    }))
    .filter((f) => f.filename);

  if (fileEntries.length === 0) return;

  const r2Keys = fileEntries.map((f) => f.key);

  // Find which are already indexed by r2Key to avoid duplicate inserts.
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

  console.log(
    `[indexWorkspaceFiles] Indexed ${newEntries.length} new file(s) for chat ${chatId}`,
  );
}

export interface WorkspaceFileEntry {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
}

/**
 * Query the DB for all indexed workspace files for a chat.
 * Returns them in the same shape as the /api/chat/[chatId]/files endpoint.
 */
export async function getWorkspaceFilesForStream(
  userId: string,
  chatId: string,
): Promise<WorkspaceFileEntry[]> {
  const files = await db
    .select()
    .from(sandboxFile)
    .where(
      and(eq(sandboxFile.userId, userId), eq(sandboxFile.chatId, chatId)),
    )
    .orderBy(desc(sandboxFile.createdAt));

  return files.map((f) => ({
    id: f.id,
    filename: f.filename,
    contentType: f.contentType,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
    downloadUrl: `/api/sandbox-files/${f.id}`,
  }));
}
