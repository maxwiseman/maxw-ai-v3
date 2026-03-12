/**
 * Plan Management Tool
 * Writes/updates a plan.md file in the sandbox workspace.
 */

import { tool } from "ai";
import { z } from "zod";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";

export function createUpdatePlanTool(chatId: string) {
  return tool({
    description:
      "Write or update a structured plan file (/home/daytona/workspace/plan.md) in the sandbox. Use this to track multi-step tasks, record progress, and organize work. The plan persists across turns.",
    inputSchema: z.object({
      content: z
        .string()
        .describe(
          "Full Markdown content for the plan. This completely replaces the existing plan.md.",
        ),
    }),
    execute: async ({ content }) => {
      const sandbox = await getOrCreateSandbox(chatId);
      await sandbox.fs.uploadFile(
        Buffer.from(content),
        "/home/daytona/workspace/plan.md",
      );
      return "plan.md updated successfully.";
    },
  });
}
