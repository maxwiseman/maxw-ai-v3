/**
 * Bash Tool
 * Replaces Anthropic's built-in code_execution_20250825 with a custom
 * execute handler backed by Daytona sandboxes.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { seedCanvasData } from "@/ai/sandbox/data-seeder";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";

export function createBashTool(
  chatId: string,
  userId: string,
  friendlyChatId?: string,
) {
  return anthropic.tools.bash_20250124({
    execute: async ({ command, restart }) => {
      if (restart) {
        return "Shell restarted.";
      }

      try {
        const sandbox = await getOrCreateSandbox(
          userId,
          chatId,
          friendlyChatId,
        );
        const workingDir = friendlyChatId
          ? `/home/daytona/workspace/chat/${friendlyChatId}`
          : "/home/daytona/workspace";
        // Lazily seed Canvas data on first sandbox use this turn
        await seedCanvasData(userId, sandbox);
        const result = await sandbox.process.executeCommand(
          command,
          workingDir,
          undefined,
          60, // 60s timeout
        );

        if (result.exitCode !== 0) {
          return `Exit ${result.exitCode}:\n${result.result}`;
        }
        return result.result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[bash] Sandbox error for chat ${chatId}:`, err);
        return `Sandbox error: ${message}`;
      }
    },
  });
}
