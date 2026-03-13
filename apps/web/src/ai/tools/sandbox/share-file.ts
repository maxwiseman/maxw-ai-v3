/**
 * Share File Tool
 * Downloads a file from the Daytona sandbox and uploads it to Vercel Blob,
 * returning a public CDN URL that the agent can include in its response.
 */

import { put } from "@vercel/blob";
import { tool } from "ai";
import { z } from "zod";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";
import { db } from "@/db";
import { sandboxFile } from "@/db/schema/sandbox-files";

const MIME_TYPES: Record<string, string> = {
  // Documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  html: "text/html",
  htm: "text/html",
  // Code
  js: "text/javascript",
  ts: "text/typescript",
  py: "text/x-python",
  json: "application/json",
  xml: "application/xml",
  yaml: "text/yaml",
  yml: "text/yaml",
  sh: "text/x-sh",
  // Archives
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  // Typst / LaTeX output
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

export function createShareFileTool(
  chatId: string,
  userId: string,
  friendlyChatId?: string,
) {
  const workspaceDir = friendlyChatId
    ? `/home/daytona/workspace/chat/${friendlyChatId}`
    : "/home/daytona/workspace";

  return tool({
    description:
      "Upload a file from the sandbox to cloud storage and return a relative download URL. Use this to deliver output files (reports, PDFs, data exports, scripts, etc.) to the user so they can download them. The returned url field is a relative path (e.g. /api/sandbox-files/abc123) — always use it exactly as-is in markdown links without adding any domain or hostname.",
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "Path to the file in the sandbox. Can be absolute (e.g. /home/daytona/workspace/chat/abc/report.pdf) or relative to the chat workspace (e.g. report.pdf or output/report.pdf).",
        ),
      filename: z
        .string()
        .optional()
        .describe(
          "Display filename for the download. Defaults to the basename of the path.",
        ),
    }),
    execute: async ({ path, filename }): Promise<ShareFileResult | string> => {
      // Resolve to absolute path
      const absolutePath = path.startsWith("/")
        ? path
        : `${workspaceDir}/${path}`;

      const displayName = filename ?? absolutePath.split("/").pop() ?? "file";

      const sandbox = await getOrCreateSandbox(userId, chatId, friendlyChatId);

      let buffer: Buffer;
      try {
        buffer = await sandbox.fs.downloadFile(absolutePath);
      } catch {
        return `File not found or could not be read: ${absolutePath}`;
      }

      const contentType = getMimeType(displayName);

      const blob = await put(`sandbox-files/${chatId}/${displayName}`, buffer, {
        access: "private",
        contentType,
        addRandomSuffix: true,
      });

      const [inserted] = await db
        .insert(sandboxFile)
        .values({
          userId,
          chatId,
          filename: displayName,
          blobUrl: blob.url,
          contentType,
          sizeBytes: buffer.length,
        })
        .returning({ id: sandboxFile.id });

      // Return a proxied download URL (the raw blob URL requires auth)
      return {
        url: `/api/sandbox-files/${inserted.id}`,
        filename: displayName,
        contentType,
        sizeBytes: buffer.length,
      };
    },
  });
}
