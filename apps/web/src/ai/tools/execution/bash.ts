/**
 * Bash / Shell Tools
 * Both variants are backed by Daytona sandboxes.
 *
 * - createBashTool: Anthropic native bash_20250124 wrapper
 * - createShellToolOpenAI: OpenAI native shell wrapper (Responses API), Daytona-backed
 */

import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { seedCanvasData } from "@/ai/sandbox/data-seeder";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";

/** Maximum characters returned from a single shell command. */
const MAX_OUTPUT_CHARS = 100_000;

function truncateOutput(text: string, label: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) return text;
  return (
    `Error: ${label} was too large (${text.length.toLocaleString()} characters). ` +
    `The limit is ${MAX_OUTPUT_CHARS.toLocaleString()} characters. ` +
    "Use head/tail/grep to read specific portions, or pipe through a filter."
  );
}

/** Shared Daytona execution logic */
async function runInSandbox(
  userId: string,
  chatId: string,
  command: string,
  timeoutSecs = 60,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const sandbox = await getOrCreateSandbox(userId, chatId);
  const workingDir = "/home/daytona/workspace";
  await seedCanvasData(userId, sandbox);
  const result = await sandbox.process.executeCommand(
    command,
    workingDir,
    undefined,
    timeoutSecs,
  );
  const raw = result.result ?? "";
  const isError = result.exitCode !== 0;
  const limited = truncateOutput(raw, isError ? "stderr" : "stdout");
  return {
    stdout: isError ? "" : limited,
    stderr: isError ? limited : "",
    exitCode: result.exitCode,
  };
}

/** Anthropic — bash_20250124 */
export function createBashTool(chatId: string, userId: string) {
  return anthropic.tools.bash_20250124({
    execute: async ({ command, restart }) => {
      if (restart) {
        return "Shell restarted.";
      }

      try {
        const { stdout, stderr, exitCode } = await runInSandbox(
          userId,
          chatId,
          command,
        );
        if (exitCode !== 0) {
          return `Exit ${exitCode}:\n${stderr}`;
        }
        return stdout;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[bash] Sandbox error for chat ${chatId}:`, err);
        return `Sandbox error: ${message}`;
      }
    },
  });
}

/** OpenAI — native shell tool (Responses API), Daytona-backed */
export function createShellToolOpenAI(chatId: string, userId: string) {
  return openai.tools.shell({
    execute: async ({ action }) => {
      const command = action.commands.join("\n");
      const timeoutSecs = action.timeoutMs
        ? Math.ceil(action.timeoutMs / 1000)
        : 60;

      try {
        const { stdout, stderr, exitCode } = await runInSandbox(
          userId,
          chatId,
          command,
          timeoutSecs,
        );
        return {
          output: [
            {
              stdout,
              stderr,
              outcome: { type: "exit" as const, exitCode },
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[shell] Sandbox error for chat ${chatId}:`, err);
        return {
          output: [
            {
              stdout: "",
              stderr: `Sandbox error: ${message}`,
              outcome: { type: "exit" as const, exitCode: 1 },
            },
          ],
        };
      }
    },
  });
}
