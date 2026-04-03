/**
 * Custom Web Fetch Tool
 *
 * Wraps native HTTP fetch with two enhancements:
 *  1. Google Workspace URL transformation — /edit and /view are rewritten to
 *     export URLs that return parseable content (pdf, csv).
 *  2. Multimodal passthrough — images and PDFs within the size limit are
 *     returned as native media content parts so the model can read them
 *     directly. Larger binaries are offloaded to the sandbox filesystem.
 */

import { tool } from "ai";
import { z } from "zod";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";

/** Responses larger than this (in chars) are offloaded to the sandbox. */
const CHAR_THRESHOLD = 20_000;

/**
 * Multimodal binaries up to this size (bytes) are returned inline as base64
 * media content parts. Larger files are offloaded to the sandbox instead.
 */
const MULTIMODAL_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB

/** MIME type prefixes that should be passed multimodally when small enough. */
const MULTIMODAL_MIME_PREFIXES = ["image/", "application/pdf"];

/** All other binary MIME type prefixes are always offloaded to the sandbox. */
const BINARY_MIME_PREFIXES = [
  "audio/",
  "video/",
  "application/octet-stream",
  "application/zip",
  "application/gzip",
];

function isBinary(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return (
    BINARY_MIME_PREFIXES.some((p) => ct.startsWith(p)) ||
    MULTIMODAL_MIME_PREFIXES.some((p) => ct.startsWith(p))
  );
}

function isMultimodal(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return MULTIMODAL_MIME_PREFIXES.some((p) => ct.startsWith(p));
}

/**
 * Rewrite Google Workspace edit/view/preview URLs to export URLs so that the
 * fetched content is a binary document rather than an interactive JS-rendered page.
 */
function transformGoogleWorkspaceUrl(url: string): string {
  // Google Docs  → export as PDF
  const docMatch = url.match(
    /^(https:\/\/docs\.google\.com\/document\/d\/[^/]+)\/.*/,
  );
  if (docMatch) {
    return `${docMatch[1]}/export?format=md`;
  }

  // Google Sheets → export as CSV
  const sheetMatch = url.match(
    /^(https:\/\/docs\.google\.com\/spreadsheets\/d\/[^/]+)\/.*/,
  );
  if (sheetMatch) {
    return `${sheetMatch[1]}/export?format=csv`;
  }

  // Google Slides → export as PDF
  const slideMatch = url.match(
    /^(https:\/\/docs\.google\.com\/presentation\/d\/[^/]+)\/.*/,
  );
  if (slideMatch) {
    return `${slideMatch[1]}/export?format=pdf`;
  }

  return url;
}

/** Derive a safe filename from a URL and content type. */
function deriveFilename(url: string, contentType: string): string {
  let name = url.split("?")[0].split("/").filter(Boolean).pop() ?? "fetched";
  name = name.replace(/\.[^.]+$/, "");
  name = name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);

  const ct = contentType.toLowerCase();
  if (ct.includes("pdf")) return `${name}.pdf`;
  if (ct.includes("csv")) return `${name}.csv`;
  if (ct.includes("markdown") || ct.includes("/md")) return `${name}.md`;
  if (ct.includes("html")) return `${name}.html`;
  if (ct.includes("json")) return `${name}.json`;
  if (ct.includes("xml")) return `${name}.xml`;
  if (ct.includes("png")) return `${name}.png`;
  if (ct.includes("jpeg") || ct.includes("jpg")) return `${name}.jpg`;
  if (ct.includes("gif")) return `${name}.gif`;
  if (ct.includes("webp")) return `${name}.webp`;
  if (ct.includes("plain")) return `${name}.txt`;
  return `${name}.bin`;
}

async function offloadToSandbox(
  buffer: Buffer,
  url: string,
  transformedUrl: string,
  contentType: string,
  userId: string,
  chatId: string,
): Promise<string> {
  const filename = deriveFilename(transformedUrl, contentType);
  const sandboxPath = `/tmp/web_fetch/${filename}`;

  const sandbox = await getOrCreateSandbox(userId, chatId);
  await sandbox.process.executeCommand(
    "mkdir -p /tmp/web_fetch",
    "/",
    undefined,
    10,
  );
  await sandbox.fs.uploadFile(buffer, sandboxPath);

  const urlNote =
    transformedUrl !== url ? `\n(URL was rewritten from ${url})` : "";
  return `Content saved to sandbox at ${sandboxPath} (${buffer.length.toLocaleString()} bytes, ${contentType}).${urlNote}\nUse the view_file tool to view it, or the bash tool to process it.`;
}

interface MultimodalResult {
  url: string;
  mimeType: string;
  /** base64-encoded content */
  data: string;
}

type FetchResult = string | MultimodalResult;

export function createWebFetchTool(chatId: string, userId: string) {
  return tool({
    description: `Fetch content from a URL and return it.

Google Workspace URLs are automatically rewritten to export URLs:
- Google Docs  → /export?format=pdf  (PDF)
- Google Sheets → /export?format=csv  (CSV)
- Google Slides → /export?format=pdf  (PDF)

Images and PDFs up to 5 MB are returned as native multimodal content so you can read them directly.
Larger binaries and unsupported types are saved to the sandbox at /tmp/web_fetch/<filename>.
Set save_to_sandbox to true to always offload to the sandbox regardless of type or size.`,
    inputSchema: z.object({
      url: z.string().describe("The URL to fetch."),
      save_to_sandbox: z
        .boolean()
        .optional()
        .describe(
          "If true, always save the response to the sandbox instead of returning it directly.",
        ),
    }),
    execute: async ({ url, save_to_sandbox }): Promise<FetchResult> => {
      const transformedUrl = transformGoogleWorkspaceUrl(url);

      let response: Response;
      try {
        response = await fetch(transformedUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; AI-Assistant/1.0; +https://anthropic.com)",
          },
          redirect: "follow",
        });
      } catch (err) {
        return `Failed to fetch ${transformedUrl}: ${err instanceof Error ? err.message : String(err)}`;
      }

      if (!response.ok) {
        return `HTTP ${response.status} ${response.statusText} for ${transformedUrl}`;
      }

      const contentType =
        response.headers.get("content-type") ?? "application/octet-stream";
      const binary = isBinary(contentType);

      if (save_to_sandbox === true || (binary && !isMultimodal(contentType))) {
        // Always-offload path: non-multimodal binary, or user explicitly requested sandbox
        const buffer = Buffer.from(await response.arrayBuffer());
        try {
          return await offloadToSandbox(
            buffer,
            url,
            transformedUrl,
            contentType,
            userId,
            chatId,
          );
        } catch (err) {
          return `Fetched content (${buffer.length.toLocaleString()} bytes) but failed to save to sandbox: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      if (isMultimodal(contentType)) {
        const buffer = Buffer.from(await response.arrayBuffer());

        if (buffer.length > MULTIMODAL_SIZE_LIMIT) {
          // Too large for multimodal — offload instead
          try {
            return await offloadToSandbox(
              buffer,
              url,
              transformedUrl,
              contentType,
              userId,
              chatId,
            );
          } catch (err) {
            return `Fetched ${buffer.length.toLocaleString()} bytes but failed to save to sandbox: ${err instanceof Error ? err.message : String(err)}`;
          }
        }

        // Strip parameters from content type (e.g. "image/png; charset=utf-8" → "image/png")
        const mimeType = contentType.split(";")[0].trim();
        return {
          url: transformedUrl,
          mimeType,
          data: buffer.toString("base64"),
        };
      }

      // Read as text
      const text = await response.text();

      if (text.length > CHAR_THRESHOLD) {
        const buffer = Buffer.from(text, "utf-8");
        try {
          return await offloadToSandbox(
            buffer,
            url,
            transformedUrl,
            contentType,
            userId,
            chatId,
          );
        } catch (err) {
          const truncated = text.slice(0, CHAR_THRESHOLD);
          return `[Content truncated — sandbox save failed: ${err instanceof Error ? err.message : String(err)}]\n\n${truncated}`;
        }
      }

      const urlNote =
        transformedUrl !== url ? `\n<!-- URL rewritten from ${url} -->\n` : "";
      return `${urlNote}${text}`;
    },

    toModelOutput: ({ output }) => {
      if (typeof output === "string") {
        return { type: "text", value: output };
      }

      return {
        type: "content",
        value: [
          { type: "text", text: `Fetched: ${output.url}` },
          {
            type: "media",
            data: output.data,
            mediaType: output.mimeType as `${string}/${string}`,
          },
        ],
      };
    },
  });
}
