/**
 * Request User Input Tool
 * Allows the agent to pause and ask the user a question mid-task.
 * The agent should stop after calling this tool; the user's next message
 * serves as the answer.
 */

import { tool } from "ai";
import { z } from "zod";

export const requestUserInputTool = tool({
  description:
    "Ask the user a clarifying question and wait for their response before continuing. Use this when you need information only the user can provide (e.g., a preference, a decision, credentials). After calling this tool, stop and present the question to the user. Resume work in the next turn once they reply.",
  inputSchema: z.object({
    question: z
      .string()
      .describe("The question to ask the user. Be specific and concise."),
    context: z
      .string()
      .optional()
      .describe(
        "Optional: brief context explaining why you need this information.",
      ),
  }),
  execute: async ({ question, context }) => {
    // Return a structured marker that the UI can render as a user-input prompt
    return JSON.stringify({
      type: "user_input_required",
      question,
      context,
    });
  },
});
