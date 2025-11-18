"use server";

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import * as z from "zod";

export async function generateTodo(context: string) {
  const result = await generateObject({
    model: openai("gpt-5-nano"),
    providerOptions: {
      openai: {
        reasoningEffort: "low",
        strictSchemas: true,
      },
    },
    system: prompt,
    prompt: context,
    schema: z.object({
      title: z.string(),
      notes: z.string().nullable(),
      subTasks: z.array(z.string()),
      date: z.string().nullable(),
      dueDate: z.string().nullable(),
    }),
  });
  const data = result.object;
  return {
    ...data,
    notes: data.notes ?? undefined,
    date: data.date ? new Date(data.date) : undefined,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
  };
}

const prompt = `Generate a todo item for the user given the following context.
  Provide a very short title (a few words) in title case that matches the title from your context, and dates (if applicable). The dates usually come from the assignment metadata, but it could also come from the title or description.
  Most of the time you shouldn't include notes. The todo will be linked to the assignment from which your context is generated, so there's no need to repeat things that are listed in the assignment description.
  With that being said, you *should* use notes to include helpful links (if applicable) to allow the user to navigate more quickly
  Subtasks are used to track how much of an assignment has been completed (ex. if 4/8 subtasks are done, the assignment is 50% done), so they should be representative of that.
  DO NOT include subtasks for things that aren't the main point (ex. copying a document(s), submitting assignment). We're looking for more big picture stuff (ex. analyze the data, make a graph, write a reflection).
  Subtasks should also have very short titles
  Some assignments simply do not need subtasks as they do not involve multiple steps or will not take long to complete.
  Respond in plaintext, markdown is NOT supported.
`;
