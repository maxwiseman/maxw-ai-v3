import { tool } from "ai";
import * as z from "zod";

export const createStudySetToolInput = z.object({
  displayMode: z.enum(["flashcards", "multiple-choice", "short-answer"]),
  title: z.string(),
  items: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("term"),
        term: z.string(),
        shortDefinition: z.string(),
        fullDefinition: z.string(),
      }),
      z.object({
        type: z.literal("question"),
        prompt: z.string(),
        options: z.array(z.object({ correct: z.boolean(), text: z.string() })),
      }),
    ])
  ),
});

export const createStudySetTool = tool({
  inputSchema: createStudySetToolInput,
  execute: async (data) => {
    console.log(data);
    return "Flashcard created successfully. It is currently being displayed to the user.";
  },
});
