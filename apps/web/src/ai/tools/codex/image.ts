/**
 * View Image Tool
 * Reads an image file from the sandbox and returns it as a base64 data URL
 * so it can be rendered in the UI or passed as vision input.
 */

import { tool } from "ai";
import { z } from "zod";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";

const SUPPORTED_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export function createViewImageTool(chatId: string) {
  return tool({
    description:
      "Read an image file from the sandbox filesystem and return it as a base64 data URL. Useful for viewing charts, diagrams, screenshots, or any image the agent has created or downloaded.",
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "Absolute or workspace-relative path to the image file (e.g., /home/daytona/workspace/chart.png)",
        ),
    }),
    execute: async ({ path }) => {
      const sandbox = await getOrCreateSandbox(chatId);

      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const mimeType = SUPPORTED_TYPES[ext] ?? "application/octet-stream";

      let buffer: Buffer;
      try {
        buffer = await sandbox.fs.downloadFile(path);
      } catch {
        return `File not found or could not be read: ${path}`;
      }

      const base64 = buffer.toString("base64");
      return `data:${mimeType};base64,${base64}`;
    },
  });
}
