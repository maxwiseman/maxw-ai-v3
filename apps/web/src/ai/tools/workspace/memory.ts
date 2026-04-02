/**
 * Custom Memory Tool for non-Anthropic providers
 *
 * Mirrors the interface of Anthropic's native memory_20250818 tool but
 * implemented as a standard AI SDK tool() so any model can use it.
 * The execute handler delegates to the same executeMemoryCommand backend.
 */

import { tool } from "ai";
import { z } from "zod";
import { executeMemoryCommand } from "@/ai/utils/memory-helpers";

const memoryParams = z.object({
  command: z
    .enum(["view", "create", "str_replace", "insert", "delete", "rename"])
    .describe("Memory operation to perform"),
  path: z
    .string()
    .optional()
    .describe(
      "Target path (required for view, create, str_replace, insert, delete)",
    ),
  view_range: z
    .array(z.number())
    .optional()
    .describe("Line range [start, end] — two numbers, only for view command on a file"),
  file_text: z
    .string()
    .optional()
    .describe("File content — only for create command"),
  old_str: z
    .string()
    .optional()
    .describe("Exact string to replace — only for str_replace command"),
  new_str: z
    .string()
    .optional()
    .describe("Replacement string — only for str_replace command"),
  insert_line: z
    .number()
    .optional()
    .describe("Line number to insert after — only for insert command"),
  insert_text: z
    .string()
    .optional()
    .describe("Text to insert — only for insert command"),
  old_path: z
    .string()
    .optional()
    .describe("Source path — only for rename command"),
  new_path: z
    .string()
    .optional()
    .describe("Destination path — only for rename command"),
});

export function createMemoryTool(userId: string) {
  return tool({
    description: `Manage persistent memory files across conversations using a virtual filesystem rooted at /memories.

Operations:
- view: Display directory listing or file contents with line numbers
- create: Create a new file (fails if already exists)
- str_replace: Replace a unique string in a file
- insert: Insert a line of text at a specific line number
- delete: Delete a file or directory recursively
- rename: Rename or move a file/directory

All paths must start with /memories. Check memory before asking the user to repeat information. Proactively save important facts the user shares.`,
    inputSchema: memoryParams,
    execute: async (action) =>
      executeMemoryCommand(userId, action),
  });
}
