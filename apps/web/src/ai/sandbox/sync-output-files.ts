/**
 * Sync Output Files
 * Scans the chat output directory and uploads any new files to Vercel Blob.
 * Called in onFinish to ensure all output files are available for download,
 * even if the agent didn't explicitly call share_file.
 */

import { put } from "@vercel/blob";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sandboxFile } from "@/db/schema/sandbox-files";
import type { Sandbox } from "./sandbox-manager";

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
 * Scans the output directory for this chat and uploads any files not yet in the DB.
 * Safe to call even if no output directory exists.
 */
export async function syncOutputFiles(
  sandbox: Sandbox,
  userId: string,
  chatId: string,
  friendlyChatId: string,
): Promise<void> {
  const outputDir = `/home/daytona/workspace/chat/${friendlyChatId}/output`;

  // List files in the output directory
  let fileInfos: Array<{ name: string; size: number }>;
  try {
    fileInfos = await sandbox.fs.listFiles(outputDir);
  } catch {
    // Output directory doesn't exist — nothing to sync
    return;
  }

  // Filter to files only (exclude directories)
  const fileNames = fileInfos
    .filter((f) => !f.name.endsWith("/"))
    .map((f) => (f.name.includes("/") ? f.name.split("/").pop()! : f.name))
    .filter(Boolean);

  if (fileNames.length === 0) return;

  // Find which files are already uploaded for this chat
  const existingFiles = await db
    .select({ filename: sandboxFile.filename })
    .from(sandboxFile)
    .where(
      and(
        eq(sandboxFile.chatId, chatId),
        eq(sandboxFile.userId, userId),
        inArray(sandboxFile.filename, fileNames),
      ),
    );

  const existingFilenames = new Set(existingFiles.map((f) => f.filename));
  const newFileNames = fileNames.filter((n) => !existingFilenames.has(n));

  if (newFileNames.length === 0) return;

  // Upload new files in parallel
  await Promise.allSettled(
    newFileNames.map(async (filename) => {
      const absolutePath = `${outputDir}/${filename}`;
      try {
        const buffer = await sandbox.fs.downloadFile(absolutePath);
        const contentType = getMimeType(filename);

        const blob = await put(`sandbox-files/${chatId}/${filename}`, buffer, {
          access: "private",
          contentType,
          addRandomSuffix: true,
        });

        await db.insert(sandboxFile).values({
          userId,
          chatId,
          filename,
          blobUrl: blob.url,
          contentType,
          sizeBytes: buffer.length,
        });
      } catch (err) {
        console.error(`[syncOutputFiles] Failed to sync ${filename}:`, err);
      }
    }),
  );
}
