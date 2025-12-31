import { tool } from "ai";
import z from "zod/v4";
import { queryCanvasIndex } from "@/ai/utils/upstash-helpers";

export const searchContentTool = tool({
  description:
    "Search for assignments, announcements, and other course information",
  inputSchema: z.object({
    query: z.string().describe("Student's question"),
    // classIds: z.array(z.string()).min(1).optional().describe("Optional: class IDs to filter by -- to search all classes, leave `classIds` undefined")
  }),
  execute: searchContent,
});

async function searchContent({
  query,
  classIds,
}: {
  query: string;
  classIds?: string[];
}) {
  const results = await queryCanvasIndex(query, classIds);
  return results;
}
