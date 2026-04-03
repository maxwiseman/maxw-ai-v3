/**
 * View File Tool
 * Reads a file from the sandbox and returns it as multimodal content for the model.
 * Supports images (png, jpg, gif, webp), PDFs, and plain text files.
 * For Markdown and HTML files, embedded images are extracted and returned as
 * separate media content parts so they don't bloat the text context.
 */

import * as nodePath from "node:path";
import { tool } from "ai";
import { z } from "zod";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";
import type { Sandbox } from "@/ai/sandbox/sandbox-manager";

// MIME types supported natively as multimodal media content parts
const MEDIA_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};

// Extensions we'll read as UTF-8 text
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

// Text extensions that may contain embedded images we should extract
const IMAGE_BEARING_EXTENSIONS = new Set(["md", "html", "htm"]);

interface ExtractedImage {
  /** Short placeholder inserted into the text in place of the image source */
  placeholder: string;
  data: string; // base64
  mediaType: string;
}

export interface ViewFileResult {
  path: string;
  mimeType: string;
  /** Processed text (placeholders replace extracted images) or base64 for binary */
  content: string;
  isText: boolean;
  /** Images extracted from markdown/HTML, returned as separate media parts */
  images: ExtractedImage[];
}

/**
 * Extract embedded images from markdown/HTML text.
 * Replaces each image source with a short placeholder and returns the
 * base64 data + MIME type for each image found.
 *
 * Handles:
 *  - Markdown data URIs:  ![alt](data:image/png;base64,...)
 *  - HTML data URIs:      <img src="data:image/png;base64,...">
 *  - Markdown file refs:  ![alt](./relative.png) or ![alt](/abs/path.png)
 *  - HTML file refs:      <img src="./relative.png">
 */
async function extractImages(
  text: string,
  filePath: string,
  sandbox: Sandbox,
): Promise<{ text: string; images: ExtractedImage[] }> {
  const images: ExtractedImage[] = [];
  const baseDir = nodePath.dirname(filePath);
  let n = 0;

  const nextPlaceholder = (alt?: string) => {
    n++;
    return alt?.trim() ? `[image-${n}: ${alt.trim()}]` : `[image-${n}]`;
  };

  // --- Markdown data URI: ![alt](data:mime;base64,DATA) ---
  let processed = text.replace(
    /!\[([^\]]*)\]\(data:([^;)]+);base64,([A-Za-z0-9+/=\r\n]+)\)/g,
    (_, alt: string, mimeType: string, rawData: string) => {
      const placeholder = nextPlaceholder(alt);
      images.push({
        placeholder,
        data: rawData.replace(/[\r\n]/g, ""),
        mediaType: mimeType.trim(),
      });
      return placeholder;
    },
  );

  // --- HTML img data URI: <img ...src="data:mime;base64,DATA"...> ---
  processed = processed.replace(
    /<img\b[^>]*\bsrc=["']data:([^;"']+);base64,([A-Za-z0-9+/=\r\n]+)["'][^>]*>/gi,
    (_, mimeType: string, rawData: string) => {
      const placeholder = nextPlaceholder();
      images.push({
        placeholder,
        data: rawData.replace(/[\r\n]/g, ""),
        mediaType: mimeType.trim(),
      });
      return placeholder;
    },
  );

  // --- Markdown file reference: ![alt](path) ---
  // Collect matches first, then resolve asynchronously
  const mdFileMatches: Array<{ full: string; alt: string; src: string }> = [];
  const mdFileRe = /!\[([^\]]*)\]\((?!data:)([^)]+)\)/g;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration
  while ((m = mdFileRe.exec(processed)) !== null) {
    const src = m[2].split(" ")[0]; // strip optional title: ![alt](path "title")
    if (!src.startsWith("http://") && !src.startsWith("https://")) {
      mdFileMatches.push({ full: m[0], alt: m[1], src });
    }
  }

  for (const { full, alt, src } of mdFileMatches) {
    const absPath = src.startsWith("/")
      ? src
      : nodePath.resolve(baseDir, src);
    const ext = absPath.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = MEDIA_TYPES[ext];
    if (!mimeType || mimeType === "application/pdf") continue; // only inline images
    try {
      const buf = await sandbox.fs.downloadFile(absPath);
      const placeholder = nextPlaceholder(alt);
      images.push({ placeholder, data: buf.toString("base64"), mediaType: mimeType });
      processed = processed.replace(full, placeholder);
    } catch {
      // File not accessible — leave reference as-is
    }
  }

  // --- HTML img file reference: <img src="path"> ---
  const htmlFileMatches: Array<{ full: string; src: string }> = [];
  const htmlFileRe = /<img\b[^>]*\bsrc=["'](?!data:)((?!https?:\/\/)[^"']+)["'][^>]*>/gi;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration
  while ((m = htmlFileRe.exec(processed)) !== null) {
    htmlFileMatches.push({ full: m[0], src: m[1] });
  }

  for (const { full, src } of htmlFileMatches) {
    const absPath = src.startsWith("/")
      ? src
      : nodePath.resolve(baseDir, src);
    const ext = absPath.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = MEDIA_TYPES[ext];
    if (!mimeType || mimeType === "application/pdf") continue;
    try {
      const buf = await sandbox.fs.downloadFile(absPath);
      const placeholder = nextPlaceholder();
      images.push({ placeholder, data: buf.toString("base64"), mediaType: mimeType });
      processed = processed.replace(full, placeholder);
    } catch {
      // File not accessible — leave reference as-is
    }
  }

  return { text: processed, images };
}

export function createViewImageTool(chatId: string, userId: string) {
  return tool({
    description:
      "Read a file from the sandbox filesystem and return its contents to the model. Supports images (PNG, JPEG, GIF, WebP), PDFs, and plain text files. For Markdown and HTML files, embedded images are automatically extracted and returned as separate visual attachments. Use this to view charts, documents, screenshots, or any other file the agent has created or downloaded.",
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

      if (TEXT_EXTENSIONS.has(ext)) {
        let content = buffer.toString("utf-8");
        let images: ExtractedImage[] = [];

        if (IMAGE_BEARING_EXTENSIONS.has(ext)) {
          const result = await extractImages(content, path, sandbox);
          content = result.text;
          images = result.images;
        }

        return { path, mimeType: "text/plain", content, isText: true, images };
      }

      const mimeType = MEDIA_TYPES[ext];
      if (mimeType) {
        return {
          path,
          mimeType,
          content: buffer.toString("base64"),
          isText: false,
          images: [],
        };
      }

      // Unsupported type — best-effort UTF-8 fallback
      const text = buffer.toString("utf-8");
      if (/[\x00-\x08\x0E-\x1F]/.test(text)) {
        return `Unsupported file type ".${ext}". Only images (PNG, JPEG, GIF, WebP), PDFs, and text-based files are supported.`;
      }
      return { path, mimeType: "text/plain", content: text, isText: true, images: [] };
    },

    toModelOutput: ({ output }) => {
      if (typeof output === "string") {
        return { type: "text", value: output };
      }

      if (output.isText) {
        const parts: Array<
          | { type: "text"; text: string }
          | { type: "media"; data: string; mediaType: `${string}/${string}` }
        > = [{ type: "text", text: `Contents of ${output.path}:\n\n${output.content}` }];

        for (const img of output.images) {
          parts.push({ type: "text", text: img.placeholder });
          parts.push({
            type: "media",
            data: img.data,
            mediaType: img.mediaType as `${string}/${string}`,
          });
        }

        return { type: "content", value: parts };
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
