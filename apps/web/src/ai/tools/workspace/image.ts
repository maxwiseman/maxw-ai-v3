/**
 * View File Tool
 * Reads a file from the sandbox and returns it as multimodal content for the model.
 * Supports images (png, jpg, gif, webp, svg), PDFs, and plain text files.
 */

import { tool } from "ai";
import { z } from "zod";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";

// MIME types supported natively by Anthropic/OpenAI as multimodal content
const MEDIA_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};

// Extensions we'll read as UTF-8 text and return inline
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "xml",
  "html",
  "htm",
  "yaml",
  "yml",
  "toml",
  "log",
  "ts",
  "js",
  "py",
  "sh",
  "css",
]);

export interface ViewFileResult {
  path: string;
  mimeType: string;
  /** base64-encoded content for binary files, or raw string for text */
  content: string;
  isText: boolean;
}

export function createViewImageTool(chatId: string, userId: string) {
  return tool({
    description:
      "Read a file from the sandbox filesystem and return its contents to the model. Supports images (PNG, JPEG, GIF, WebP), PDFs, and plain text files. Use this to view charts, documents, screenshots, or any other file the agent has created or downloaded.",
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "Absolute or workspace-relative path to the file (e.g., /home/daytona/workspace/chart.png)",
        ),
    }),
    execute: async ({ path }): Promise<ViewFileResult | string> => {
      const sandbox = await getOrCreateSandbox(userId, chatId);

      const ext = path.split(".").pop()?.toLowerCase() ?? "";

      let buffer: Buffer;
      try {
        buffer = await sandbox.fs.downloadFile(path);
      } catch {
        return `File not found or could not be read: ${path}`;
      }

      // Plain text — return as a readable string
      if (TEXT_EXTENSIONS.has(ext)) {
        return {
          path,
          mimeType: "text/plain",
          content: buffer.toString("utf-8"),
          isText: true,
        };
      }

      // Binary media type supported by the model
      const mimeType = MEDIA_TYPES[ext];
      if (mimeType) {
        return {
          path,
          mimeType,
          content: buffer.toString("base64"),
          isText: false,
        };
      }

      // Unsupported type — try returning as text as a best-effort fallback
      const text = buffer.toString("utf-8");
      if (/[\x00-\x08\x0E-\x1F]/.test(text)) {
        return `Unsupported file type ".${ext}". Only images (PNG, JPEG, GIF, WebP), PDFs, and text-based files are supported.`;
      }
      return {
        path,
        mimeType: "text/plain",
        content: text,
        isText: true,
      };
    },
    toModelOutput: ({ output }) => {
      if (typeof output === "string") {
        return { type: "text", value: output };
      }

      if (output.isText) {
        return {
          type: "content",
          value: [
            {
              type: "text",
              text: `Contents of ${output.path}:\n\n${output.content}`,
            },
          ],
        };
      }

      return {
        type: "content",
        value: [
          { type: "text", text: `File: ${output.path}` },
          {
            type: "media",
            data: output.content,
            mediaType: output.mimeType as `${string}/${string}`,
          },
        ],
      };
    },
  });
}
