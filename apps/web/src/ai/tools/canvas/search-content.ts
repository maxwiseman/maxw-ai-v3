import { tool } from "ai";
import { z } from "zod";
import { queryCanvasIndex } from "@/ai/utils/upstash-helpers";

export const searchContentTool = tool({
  description:
    "Search for assignments, announcements, and other course information. Returns JSON array of relevant results with the following structure: [{ content: { name: string,allowed_attempts: number, className: string, description?: string, due_at?: string, lock_at?: string }, id: string, metadata: { classId: number, type: string }, score: number (0-1) }]",
  inputSchema: z.object({
    query: z.string().describe("Student's question"),
    // classIds: z.array(z.string()).min(1).optional().describe("Optional: class IDs to filter by -- to search all classes, leave `classIds` undefined")
  }),
  execute: async ({ query }) => {
    return await queryCanvasIndex(query);
  },
  providerOptions: {
    anthropic: {
      allowedCallers: ["direct", "code_execution_20250825"],
      cacheControl: { type: "ephemeral" },
    },
  },
});
