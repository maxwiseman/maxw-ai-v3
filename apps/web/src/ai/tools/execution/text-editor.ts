/**
 * Text Editor Tool
 * Backed by Daytona sandbox filesystem for all read/write operations.
 */

import { anthropic } from "@ai-sdk/anthropic";
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

export function createTextEditorTool(chatId: string) {
  return anthropic.tools.textEditor_20250728({
    execute: async (action) => {
      const sandbox = await getOrCreateSandbox(chatId);

      switch (action.command) {
        case "view": {
          const result = await sandbox.process.executeCommand(
            `cat -n "${action.path}" 2>&1`,
            "/home/daytona/workspace",
          );
          if (result.exitCode !== 0) {
            // Try listing directory if path looks like a dir
            const lsResult = await sandbox.process.executeCommand(
              `ls -la "${action.path}" 2>&1`,
              "/home/daytona/workspace",
            );
            return lsResult.exitCode === 0
              ? lsResult.result
              : `File not found: ${action.path}`;
          }
          // Apply view_range if provided
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
    },
  });
}
