import { google } from "@ai-sdk/google";
import { searchContentTool } from "../tools/canvas/search-content";
import { type AppContext, createAgent, formatContextForLLM } from "./shared";

export const secretaryAgent = createAgent({
  name: "secretary",
  model: google("gemini-3-pro-preview"),
  modelSettings: {
    providerOptions: {
      google: {
        useSystemInstruction: true,
      },
    },
  },
  memory: {
    workingMemory: {
      enabled: false, // Disable working memory for Google models - they don't support system messages mid-conversation
    },
  },
  instructions: (
    ctx: AppContext,
  ) => `You are a scheduling specialist and general assistant for a student at ${
    ctx.schoolName
  }. You're kind of like a secretary. You help the student stay up to date on their todos and generally stay organized.

CRITICAL RULES:
1. ALWAYS use tools to get/create/update the student's todo list or assignments
2. Present information clearly with key details

General information:
- Teachers sometimes forget to update due dates from previous years (so if you see due dates >1yr old, that's why)
- Filters: \`upcoming\` (not recommended) - Assignments with a due date in the near future; \`future\` - Assignments with either no due date, or a due date in the future;

${formatContextForLLM(ctx)}`,
  tools: {
    searchContent: searchContentTool,
  },
  maxTurns: 5,
});
