import { tool } from "ai";
import { z } from "zod";

export const createStudySetToolInput = z.object({
  displayMode: z.enum(["flashcards", "multiple-choice", "short-answer"]),
  title: z.string(),
  items: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("term"),
        tags: z.array(z.string()).nullable(),
        term: z.string(),
        shortDefinition: z.string(),
        fullDefinition: z.string(),
      }),
      z.object({
        type: z.literal("question"),
        tags: z.array(z.string()).nullable(),
        prompt: z.string(),
        thinking: z.string().nullable(),
        explanation: z.string().nullable(),
        options: z.array(z.object({ correct: z.boolean(), text: z.string() })),
      }),
    ]),
  ),
});

export const createStudySetTool = tool({
  description:
    "Create flashcards or practice questions for studying. Supports flashcards with terms/definitions, multiple-choice questions, and short-answer questions. Use LaTeX for math by surrounding formulas with $$.",
  inputSchema: createStudySetToolInput,
  execute: async (data) => {
    // For now, return success message
    // TODO: Implement UI streaming via custom response headers or websocket
    return `Study set "${data.title}" created successfully with ${data.items.length} items in ${data.displayMode} mode. The study set is being displayed to the user.`;
  },
  providerOptions: {
    anthropic: {
      allowedCallers: ["direct", "code_execution_20250825"],
      cacheControl: { type: "ephemeral" },
    },
  },
});
