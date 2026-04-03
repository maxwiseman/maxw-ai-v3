/**
 * Text Editor Tools
 * Both variants are backed by the Daytona sandbox filesystem.
 *
 * - createTextEditorTool: Anthropic native textEditor_20250728 wrapper
 * - createTextEditorToolOpenAI: Custom tool() with equivalent schema for OpenAI
 */

import { anthropic } from "@ai-sdk/anthropic";
import { tool } from "ai";
import { z } from "zod";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";

function applyStrReplace(
  content: string,
  oldStr: string,
  newStr: string,
): string | null {
  const count = content.split(oldStr).length - 1;
  if (count === 0) return null;
  if (count > 1)
    throw new Error(
      `Multiple occurrences of old_str found (${count}). Make it unique.`,
    );
  return content.replace(oldStr, newStr);
}

function applyInsert(
  content: string,
  insertLine: number,
  newStr: string,
): string {
  const lines = content.split("\n");
  lines.splice(insertLine, 0, newStr);
  return lines.join("\n");
}

/** Shared sandbox file operations */
async function executeFileAction(
  userId: string,
  chatId: string,
  action: {
    command: "view" | "create" | "str_replace" | "insert";
    path: string;
    view_range?: [number, number] | number[];
    file_text?: string;
    old_str?: string;
    new_str?: string;
    insert_line?: number;
  },
): Promise<string> {
  const sandbox = await getOrCreateSandbox(userId, chatId);

  switch (action.command) {
    case "view": {
      const result = await sandbox.process.executeCommand(
        `cat -n "${action.path}" 2>&1`,
        "/home/daytona/workspace",
      );
      if (result.exitCode !== 0) {
        const lsResult = await sandbox.process.executeCommand(
          `ls -la "${action.path}" 2>&1`,
          "/home/daytona/workspace",
        );
        return lsResult.exitCode === 0
          ? lsResult.result
          : `File not found: ${action.path}`;
      }
      if (action.view_range && action.view_range.length === 2) {
        const [start, end] = action.view_range;
        const rangeResult = await sandbox.process.executeCommand(
          `sed -n '${start},${end}p' "${action.path}" | cat -n | awk '{print NR+${start - 1}"\\t"$0}'`,
          "/home/daytona/workspace",
        );
        return rangeResult.result;
      }
      return result.result;
    }

    case "create": {
      const content = action.file_text ?? "";
      await sandbox.fs.uploadFile(Buffer.from(content), action.path);
      return `Created ${action.path}`;
    }

    case "str_replace": {
      const readResult = await sandbox.process.executeCommand(
        `cat "${action.path}"`,
        "/home/daytona/workspace",
      );
      if (readResult.exitCode !== 0) {
        return `File not found: ${action.path}`;
      }
      const newContent = applyStrReplace(
        readResult.result,
        action.old_str ?? "",
        action.new_str ?? "",
      );
      if (newContent === null) {
        return `old_str not found in ${action.path}. No changes made.`;
      }
      await sandbox.fs.uploadFile(Buffer.from(newContent), action.path);
      return `Edited ${action.path}`;
    }

    case "insert": {
      const readResult = await sandbox.process.executeCommand(
        `cat "${action.path}"`,
        "/home/daytona/workspace",
      );
      if (readResult.exitCode !== 0) {
        return `File not found: ${action.path}`;
      }
      const newContent = applyInsert(
        readResult.result,
        action.insert_line ?? 0,
        action.new_str ?? "",
      );
      await sandbox.fs.uploadFile(Buffer.from(newContent), action.path);
      return `Inserted into ${action.path}`;
    }

    default:
      return `Unknown command: ${(action as { command: string }).command}`;
  }
}

/** Anthropic — textEditor_20250728 */
export function createTextEditorTool(chatId: string, userId: string) {
  return anthropic.tools.textEditor_20250728({
    execute: async (action) =>
      executeFileAction(userId, chatId, {
        command: action.command,
        path: action.path,
        view_range: action.view_range,
        file_text: action.file_text,
        old_str: action.old_str,
        new_str: action.new_str,
        insert_line: action.insert_line,
      }),
  });
}

const textEditorParams = z.object({
  command: z
    .enum(["view", "create", "str_replace", "insert"])
    .describe("The operation to perform"),
  path: z.string().describe("Absolute path to the file"),
  view_range: z
    .array(z.number())
    .optional()
    .describe("Line range [start, end] — two numbers, only for view command"),
  file_text: z
    .string()
    .optional()
    .describe("Full file content — only for create command"),
  old_str: z
    .string()
    .optional()
    .describe("Exact string to replace — only for str_replace command"),
  new_str: z
    .string()
    .optional()
    .describe(
      "Replacement string — for str_replace or content to insert for insert command",
    ),
  insert_line: z
    .number()
    .optional()
    .describe("Line number to insert after — only for insert command"),
});

/** OpenAI — custom tool with equivalent schema */
export function createTextEditorToolOpenAI(chatId: string, userId: string) {
  return tool({
    description:
      "Create and edit files in the sandbox. Use 'view' to read a file with line numbers, 'create' to create a new file, 'str_replace' to replace a unique string in a file, or 'insert' to insert text at a specific line.",
    inputSchema: textEditorParams,
    execute: async (action) => executeFileAction(userId, chatId, action),
  });
}
