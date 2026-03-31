/**
 * Custom Web Fetch Tool
 *
 * Wraps native HTTP fetch with two enhancements:
 *  1. Google Workspace URL transformation — /edit and /view are rewritten to
 *     export URLs that return parseable content (md, csv, pdf).
 *  2. Sandbox offload — responses that are binary or exceed the character
 *     threshold are written to the sandbox filesystem instead of being
 *     returned directly, keeping the context window clean.
 */

import { tool } from "ai";
import { z } from "zod";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";

/** Responses larger than this (in chars) are offloaded to the sandbox. */
const CHAR_THRESHOLD = 20_000;

/** MIME type prefixes that are treated as binary and always offloaded. */
const BINARY_MIME_PREFIXES = [
  "image/",
  "audio/",
  "video/",
  "application/pdf",
  "application/octet-stream",
  "application/zip",
  "application/gzip",
];

function isBinary(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return BINARY_MIME_PREFIXES.some((prefix) => ct.startsWith(prefix));
}

/**
 * Rewrite Google Workspace edit/view/preview URLs to export URLs so that the
 * fetched content is plain text or a binary document rather than an
 * interactive JS-rendered page.
 */
function transformGoogleWorkspaceUrl(url: string): string {
  // Google Docs  → export as Markdown
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
  // Try to pull the last path segment
  let name = url.split("?")[0].split("/").filter(Boolean).pop() ?? "fetched";

  // Strip any existing extension so we can assign the right one
  name = name.replace(/\.[^.]+$/, "");

  // Sanitize to filesystem-safe chars
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

export function createWebFetchTool(chatId: string, userId: string) {
  return tool({
    description: `Fetch content from a URL and return it.

Google Workspace URLs are automatically rewritten to export URLs:
- Google Docs  → /export?format=md   (Markdown)
- Google Sheets → /export?format=csv  (CSV)
- Google Slides → /export?format=pdf  (PDF)

If the response is binary (e.g. a PDF) or exceeds ${CHAR_THRESHOLD.toLocaleString()} characters,
the content is saved to the sandbox at /tmp/web_fetch/<filename> instead of
being returned directly. Use the bash tool to read or search the saved file.
Set save_to_sandbox to true to always offload to the sandbox regardless of size.`,
    inputSchema: z.object({
      url: z.string().describe("The URL to fetch."),
      save_to_sandbox: z
        .boolean()
        .optional()
        .describe(
          "If true, always save the response to the sandbox instead of returning it directly. Useful for large documents you plan to process with bash.",
        ),
    }),
    execute: async ({
      url,
      save_to_sandbox,
    }): Promise<string> => {
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

      const contentType = response.headers.get("content-type") ?? "application/octet-stream";
      const binary = isBinary(contentType);

      // Decide whether to offload before reading the body
      const shouldOffload = save_to_sandbox === true || binary;

      if (shouldOffload) {
        // Stream body into sandbox
        const buffer = Buffer.from(await response.arrayBuffer());
        const filename = deriveFilename(transformedUrl, contentType);
        const sandboxPath = `/tmp/web_fetch/${filename}`;

        try {
          const sandbox = await getOrCreateSandbox(userId, chatId);
          await sandbox.process.executeCommand(
            "mkdir -p /tmp/web_fetch",
            "/",
            undefined,
            10,
          );
          await sandbox.fs.uploadFile(buffer, sandboxPath);
        } catch (err) {
          return `Fetched content (${buffer.length.toLocaleString()} bytes) but failed to save to sandbox: ${err instanceof Error ? err.message : String(err)}`;
        }

        const urlNote =
          transformedUrl !== url
            ? `\n(URL was rewritten from ${url})`
            : "";
        return `Content saved to sandbox at ${sandboxPath} (${buffer.length.toLocaleString()} bytes, ${contentType}).${urlNote}\nUse the bash tool to read or process it, e.g.: \`cat ${sandboxPath}\``;
      }

      // Read as text
      const text = await response.text();

      if (text.length > CHAR_THRESHOLD) {
        // Too large — offload the text we already read
        const buffer = Buffer.from(text, "utf-8");
        const filename = deriveFilename(transformedUrl, contentType);
        const sandboxPath = `/tmp/web_fetch/${filename}`;

        try {
          const sandbox = await getOrCreateSandbox(userId, chatId);
          await sandbox.process.executeCommand(
            "mkdir -p /tmp/web_fetch",
            "/",
            undefined,
            10,
          );
          await sandbox.fs.uploadFile(buffer, sandboxPath);
        } catch (err) {
          // Fall back to returning a truncated version
          const truncated = text.slice(0, CHAR_THRESHOLD);
          return `[Content truncated — sandbox save failed: ${err instanceof Error ? err.message : String(err)}]\n\n${truncated}`;
        }

        const urlNote =
          transformedUrl !== url
            ? `\n(URL was rewritten from ${url})`
            : "";
        return `Content was too long (${text.length.toLocaleString()} chars) and has been saved to the sandbox at ${sandboxPath}.${urlNote}\nUse the bash tool to read or search it, e.g.:\n\`\`\`\ncat ${sandboxPath}\ngrep -n "keyword" ${sandboxPath}\n\`\`\``;
      }

      // Short enough — return directly
      const urlNote =
        transformedUrl !== url
          ? `\n<!-- URL rewritten from ${url} -->\n`
          : "";
      return `${urlNote}${text}`;
    },
  });
}
