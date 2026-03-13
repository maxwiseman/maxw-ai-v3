/**
 * Plan Management Tool
 * Writes/updates a plan.md file in the sandbox workspace.
 */

import { tool } from "ai";
import { z } from "zod";
import { getOrCreateSandbox } from "@/ai/sandbox/sandbox-manager";

export function createUpdatePlanTool(
  chatId: string,
  userId: string,
  friendlyChatId?: string,
) {
  return tool({
    description:
      "Write or update a structured plan file under /chat/<friendlyId>. Use this to track multi-step tasks, record progress, and organize work. The plan persists across turns.",
    inputSchema: z.object({
      content: z
        .string()
        .describe(
          "Full Markdown content for the plan. This completely replaces the existing plan.md.",
        ),
    }),
    execute: async ({ content }) => {
      // Fire-and-forget: don't block streaming on sandbox spinup / file write
      const planPath = friendlyChatId
        ? `/home/daytona/workspace/chat/${friendlyChatId}/plan.md`
        : "/home/daytona/workspace/plan.md";
      getOrCreateSandbox(userId, chatId, friendlyChatId)
        .then((sandbox) =>
          sandbox.fs.uploadFile(Buffer.from(content), planPath),
        )
        .catch((err) =>
          console.error("[update_plan] sandbox write failed:", err),
        );
      return "plan.md updated successfully.";
    },
  });
}
