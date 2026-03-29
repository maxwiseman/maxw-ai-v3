/**
 * Share File Tool
 * Returns a download URL for a file in the sandbox.
 * Since the workspace is R2-backed via s3fs, files within /home/daytona/workspace
 * are already in R2 — we just derive the key and record it in the DB.
 * Files outside the workspace are uploaded to R2 explicitly.
 */

import { tool } from "ai";
import { z } from "zod";
import { getR2SignedUrl, putR2Object, r2Key } from "@/ai/sandbox/r2-client";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";
import { db } from "@/db";
import { sandboxFile } from "@/db/schema/sandbox-files";

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

export interface ShareFileResult {
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

const WORKSPACE_ROOT = "/home/daytona/workspace";

export function createShareFileTool(chatId: string, userId: string) {
  return tool({
    description:
      "Upload a file from the sandbox to cloud storage and return a relative download URL. Use this to deliver output files (reports, PDFs, data exports, scripts, etc.) to the user so they can download them. The returned url field is a relative path (e.g. /api/sandbox-files/abc123) — always use it exactly as-is in markdown links without adding any domain or hostname.",
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "Path to the file in the sandbox. Can be absolute (e.g. /home/daytona/workspace/report.pdf) or relative to the workspace (e.g. report.pdf).",
        ),
      filename: z
        .string()
        .optional()
        .describe(
          "Display filename for the download. Defaults to the basename of the path.",
        ),
    }),
    execute: async ({ path, filename }): Promise<ShareFileResult | string> => {
      const absolutePath = path.startsWith("/")
        ? path
        : `${WORKSPACE_ROOT}/${path}`;

      const displayName = filename ?? absolutePath.split("/").pop() ?? "file";
      const contentType = getMimeType(displayName);

      let key: string;
      let sizeBytes: number;

      if (absolutePath.startsWith(`${WORKSPACE_ROOT}/`)) {
        // File is inside the R2-backed workspace — derive key directly from path
        const relativePath = absolutePath.slice(WORKSPACE_ROOT.length + 1);
        key = r2Key(userId, chatId, relativePath);

        // Get size using stat via the sandbox to avoid downloading the full file
        const sandbox = await getOrCreateSandbox(userId, chatId);
        try {
          const result = await sandbox.process.executeCommand(
            `stat -c %s ${absolutePath}`,
          );
          const sizeStr = result.result.trim();
          const parsedSize = Number.parseInt(sizeStr, 10);
          if (Number.isNaN(parsedSize)) {
            return `File not found or could not be read: ${absolutePath}`;
          }
          sizeBytes = parsedSize;
        } catch {
          return `File not found or could not be read: ${absolutePath}`;
        }
      } else {
        // File is outside the workspace — download and upload to R2 explicitly
        const sandbox = await getOrCreateSandbox(userId, chatId);
        let buffer: Buffer;
        try {
          buffer = await sandbox.fs.downloadFile(absolutePath);
        } catch {
          return `File not found or could not be read: ${absolutePath}`;
        }

        key = r2Key(userId, chatId, "uploads", displayName);
        await putR2Object(key, buffer, contentType);
        sizeBytes = buffer.length;
      }

      const [inserted] = await db
        .insert(sandboxFile)
        .values({
          userId,
          chatId,
          filename: displayName,
          r2Key: key,
          contentType,
          sizeBytes,
        })
        .returning({ id: sandboxFile.id });

      return {
        url: `/api/sandbox-files/${inserted.id}`,
        filename: displayName,
        contentType,
        sizeBytes,
      };
    },
  });
}
