"use server";

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import TurndownService from "turndown";
import * as z from "zod/v4";

export interface GenerateTodoInput {
  name: string;
  dueDate: string | null;
  description: string;
}

// Extract URLs and replace with placeholders, returns the modified text and a map of placeholders to URLs
function extractAndReplaceLinks(text: string): {
  processedText: string;
  linkMap: Map<string, string>;
} {
  const linkMap = new Map<string, string>();
  let linkIndex = 1;

  // Match URLs (http/https)
  const urlRegex = /https?:\/\/[^\s\])"'<>]+/g;

  const processedText = text.replace(urlRegex, (url) => {
    const placeholder = `[link_${linkIndex}]`;
    linkMap.set(placeholder, url);
    linkIndex++;
    return placeholder;
  });

  return { processedText, linkMap };
}

// Replace placeholders back with actual URLs
function restoreLinks(text: string, linkMap: Map<string, string>): string {
  let result = text;
  for (const [placeholder, url] of linkMap) {
    result = result.replaceAll(placeholder, url);
  }
  return result;
}

export async function generateTodo(input: GenerateTodoInput) {
  const turndownService = new TurndownService();
  const markdownDescription = turndownService.turndown(input.description);

  // Extract links and replace with placeholders
  const { processedText: processedDescription, linkMap } =
    extractAndReplaceLinks(markdownDescription);

  // Build context with placeholders
  const context = `# Assignment - ${input.name}
Due date: ${input.dueDate}
${processedDescription}`;

  // Build dynamic prompt with available link placeholders
  const availableLinks =
    linkMap.size > 0
      ? `\n\nAvailable link placeholders (use these instead of typing full URLs): ${[...linkMap.keys()].join(", ")}`
      : "";

  const result = await generateObject({
    model: openai("gpt-5.2"),
    providerOptions: {
      openai: {
        reasoningEffort: "none",
        strictSchemas: true,
      },
    },
    system: prompt + availableLinks,
    prompt: context,
    schema: z.object({
      title: z.string(),
      // notes: z.string().nullable(),
      subTasks: z.array(z.string()),
      date: z.string().nullable(),
      dueDate: z.string().nullable(),
    }),
  });

  const data = result.object;

  // Restore links in notes if present
  // const restoredNotes = data.notes ? restoreLinks(data.notes, linkMap) : null;

  return {
    ...data,
    // notes: restoredNotes ?? undefined,
    date: data.date ? new Date(data.date) : undefined,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
  };
}

const prompt = `Generate a todo item for the user given the following context.
  Provide a very short title (a few words) in title case that matches the title from your context, and dates (if applicable). The dates usually come from the assignment metadata, but it could also come from the title or description.
  Most of the time you shouldn't include notes. The todo will be linked to the assignment from which your context is generated, so there's no need to repeat things that are listed in the assignment description.
  With that being said, you *should* use notes to include helpful links (if applicable) to allow the user to navigate more quickly. Use the provided link placeholders (e.g. [link_1]) instead of typing full URLs - they will be automatically expanded.
  Subtasks are used to track how much of an assignment has been completed (ex. if 4/8 subtasks are done, the assignment is 50% done), so they should be representative of that.
  DO NOT include subtasks for things that aren't the main point (ex. copying a document(s), submitting assignment). We're looking for more big picture stuff (ex. analyze the data, make a graph, write a reflection).
  Subtasks should also have very short titles
  Some assignments simply do not need subtasks as they do not involve multiple steps or will not take long to complete.
  Respond in plaintext, markdown is NOT supported.
`;
