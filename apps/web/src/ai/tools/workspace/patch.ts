/**
 * Apply Patch Tool
 * Applies a unified diff patch to files in the sandbox.
 */

import { tool } from "ai";
import { z } from "zod";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";

export function createApplyPatchTool(chatId: string, userId: string) {
  return tool({
    description:
      "Apply a unified diff patch to one or more files in the sandbox. Accepts standard unified diff format (as produced by `diff -u` or `git diff`). Use this for precise multi-line edits when you know exactly what the before/after should look like.",
    inputSchema: z.object({
      patch: z
        .string()
        .describe(
          "Unified diff patch string. Must include --- a/file and +++ b/file headers.",
        ),
    }),
    execute: async ({ patch }) => {
      const sandbox = await getOrCreateSandbox(userId, chatId);

      // Write the patch to a temp file and apply with `patch` command
      const patchPath = "/tmp/agent.patch";
      await sandbox.fs.uploadFile(Buffer.from(patch), patchPath);

      const workingDir = "/home/daytona/workspace";
      const result = await sandbox.process.executeCommand(
        `patch -p1 < "${patchPath}" 2>&1`,
        workingDir,
      );

      if (result.exitCode !== 0) {
        return `Patch failed (exit ${result.exitCode}):\n${result.result}`;
      }
      return `Patch applied successfully:\n${result.result}`;
    },
  });
}
