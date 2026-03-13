/**
 * Request User Input Tool
 * Allows the agent to pause and ask the user one or more questions mid-task.
 * Supports multiple-choice (with automatic "Other" option) and short-answer questions.
 * The agent should stop after calling this tool; the user's answers are sent
 * as their next message.
 */

import { tool } from "ai";
import { z } from "zod";

const questionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("multiple-choice"),
    question: z.string().describe("The question to ask the user."),
    context: z
      .string()
      .optional()
      .nullable()
      .describe("Brief context explaining why you need this information."),
    options: z
      .array(z.string())
      .min(2)
      .max(6)
      .describe(
        'The answer choices to present. Do not include "Other" — it is added automatically.',
      ),
  }),
  z.object({
    type: z.literal("short-answer"),
    question: z.string().describe("The question to ask the user."),
    context: z
      .string()
      .optional()
      .nullable()
      .describe("Brief context explaining why you need this information."),
    placeholder: z
      .string()
      .optional()
      .nullable()
      .describe("Optional placeholder text for the input field."),
  }),
]);

export type UserInputQuestion = z.infer<typeof questionSchema>;

export const requestUserInputTool = tool({
  description:
    "Ask the user one or more questions and wait for their responses before continuing. Use multiple-choice when the answer set is known, short-answer when freeform text is needed. After calling this tool, stop — the user's answers will arrive in the next turn.",
  inputSchema: z.object({
    questions: z
      .array(questionSchema)
      .min(1)
      .max(5)
      .describe(
        "One or more questions to ask. Batch related questions together into a single call rather than calling this tool multiple times.",
      ),
  }),
  execute: async ({ questions }) => {
    return JSON.stringify({ type: "user_input_required", questions });
  },
});
