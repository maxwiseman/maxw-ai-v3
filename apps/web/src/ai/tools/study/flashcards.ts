import { tool } from "ai";
import { artifact, getWriter } from "ai-sdk-tools";
import * as z from "zod";

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

export const studySetArtifactData = z.object({
  displayMode: z.enum(["flashcards", "multiple-choice", "short-answer"]),
  title: z.string(),
  items: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("term"),
        tags: z.array(z.string()).optional(),
        term: z.string(),
        shortDefinition: z.string(),
        fullDefinition: z.string().optional(),
      }),
      z.object({
        type: z.literal("question"),
        tags: z.array(z.string()).optional(),
        prompt: z.string(),
        explanation: z.string().nullable(),
        options: z.array(z.object({ correct: z.boolean(), text: z.string() })),
      }),
    ]),
  ),
});

export const studySetArtifact = artifact("study-set", studySetArtifactData);

export const createStudySetTool = tool({
  name: "study-set",
  inputSchema: createStudySetToolInput,
  execute: async (data, executionOptions) => {
    const writer = getWriter(executionOptions);
    const artifact = studySetArtifact.stream(
      {
        ...data,
        items: data.items.map((i) => ({
          ...i,
          tags: i.tags === null ? undefined : i.tags,
        })),
      },
      writer,
    );
    artifact.complete();
    return "Flashcard created successfully. It is currently being displayed to the user.";
  },
});
