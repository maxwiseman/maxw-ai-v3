/**
 * Search Tools Tool
 * BM25-style keyword search over available tool names and descriptions.
 * Helps the agent discover which tools are available for a given task.
 */

import { tool } from "ai";
import { z } from "zod";

interface ToolEntry {
  description: string;
}

function bm25Score(
  query: string,
  text: string,
  k1 = 1.5,
  b = 0.75,
  avgLen = 100,
): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const docTerms = text.toLowerCase().split(/\s+/);
  const docLen = docTerms.length;
  let score = 0;

  for (const term of queryTerms) {
    const tf = docTerms.filter((t) => t.includes(term)).length;
    if (tf === 0) continue;
    const idf = Math.log(1 + 1 / (tf + 0.5));
    const termScore =
      idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgLen))));
    score += termScore;
  }

  return score;
}

export function createSearchToolsTool(tools: Record<string, ToolEntry>) {
  const toolList = Object.entries(tools).map(([name, entry]) => ({
    name,
    description: entry.description,
  }));

  return tool({
    description:
      "Search available tools by keyword to discover which tool to use for a given task. Returns the top matching tools with their names and descriptions.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Keywords describing what you want to do (e.g., 'run python code', 'search canvas assignments', 'create todo')",
        ),
      limit: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to return (default: 5)"),
    }),
    execute: async ({ query, limit }) => {
      const scored = toolList
        .map((t) => ({
          name: t.name,
          description: t.description,
          score: bm25Score(query, `${t.name} ${t.description}`),
        }))
        .filter((t) => t.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit ?? 5);

      if (scored.length === 0) {
        return `No tools found matching "${query}".`;
      }

      return scored
        .map((t) => `**${t.name}**: ${t.description}`)
        .join("\n\n");
    },
  });
}
