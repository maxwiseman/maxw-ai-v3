/**
 * Shared Agent Configuration
 *
 * Dynamic context and utilities used across all agents
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openai } from "@ai-sdk/openai";
import { InMemoryProvider } from "@ai-sdk-tools/memory/in-memory";
import { Agent, type AgentConfig } from "ai-sdk-tools";
import type { Course } from "@/lib/canvas-types";
import { classesToLLMKey } from "../utils/canvas-llm-helpers";

// Load memory template from markdown file
const memoryTemplate = readFileSync(
  join(process.cwd(), "src/ai/agents/memory-template.md"),
  "utf-8",
);

// Load suggestions instructions from markdown file
const suggestionsInstructions = readFileSync(
  join(process.cwd(), "src/ai/agents/suggestions-instructions.md"),
  "utf-8",
);

/**
 * Application context passed to agents
 * Built dynamically per-request with current date/time
 */
export interface AppContext {
  userId: string;
  fullName: string;
  schoolName: string;
  classes: Course[];
  locale: string;
  currentDateTime: string;
  country?: string;
  city?: string;
  region?: string;
  timezone: string;
  chatId: string;
  // Allow additional properties to satisfy Record<string, unknown> constraint
  [key: string]: unknown;
}

/**
 * Build application context dynamically
 * Ensures current date/time on every request
 */
export function buildAppContext(params: {
  userId: string;
  fullName: string;
  schoolName: string;
  classes: Course[];
  country?: string;
  city?: string;
  region?: string;
  chatId: string;
  locale?: string;
  timezone?: string;
}): AppContext {
  const now = new Date();
  return {
    userId: params.userId,
    fullName: params.fullName,
    schoolName: params.schoolName,
    classes: params.classes,
    country: params.country,
    city: params.city,
    region: params.region,
    chatId: params.chatId,
    locale: params.locale || "en-US",
    currentDateTime: now.toISOString(),
    timezone:
      params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * Format context for LLM system prompts
 * Auto-injected by agent instructions functions
 *
 * Note: User-specific info (name, preferences, etc) should be stored in working memory,
 * not hardcoded here. This keeps system context separate from learned user context.
 */
export function formatContextForLLM(context: AppContext): string {
  return `
CURRENT CONTEXT:
- Date: ${context.currentDateTime}
- Timezone: ${context.timezone}
- School: ${context.schoolName}
- Locale: ${context.locale}

Important:
- Use the current date/time above for any time-sensitive operations
- User-specific information (name, preferences, etc.) is maintained in your working memory
- If the user tells you specifically that the above information is incorrect, add an entry in your memory to reflect that
- Always prioritize information in your working memory over this info when there's a confict. Assume this is accurate
- If this information is correct, there's no need to save it to your working memory
- Don't ask the user if they'd like to save information if it's already in your working memory
- Only refer to users' classes ONLY by their friendly name. The class ID and course name are only there for tool calls and additional context. They're not to be used in conversation

User's current classes (course name, friendly name, ID):
${classesToLLMKey(
  context.classes.map((course) => ({
    name: course.original_name ?? course.name,
    id: course.id,
    shortName: course.name,
  })),
)}
`;
}

/**
 * Memory provider instance - used across all agents
 * Can be accessed for direct queries (e.g., listing chats)
 */
export const memoryProvider = new InMemoryProvider();

/**
 * Create a typed agent with AppContext pre-applied
 * This enables automatic type inference for the context parameter
 *
 * All agents automatically get shared memory configuration
 */
export const createAgent = (config: AgentConfig<AppContext>) => {
  return new Agent({
    ...config,
    modelSettings: {
      parallel_tool_calls: true,
      ...config.modelSettings,
    },
    memory: {
      provider: memoryProvider,
      history: {
        enabled: true,
        limit: 10,
      },
      workingMemory: {
        enabled: true,
        template: memoryTemplate,
        scope: "user",
      },
      chats: {
        enabled: true,
        generateTitle: {
          model: openai("gpt-4.1-nano"),
          instructions: `Generate a concise title that captures the user's intent.

 <rules>
 - Extract the core topic/intent, not the question itself
 - Use noun phrases (e.g., "Tesla Affordability" not "Can I Afford Tesla")
 - Maximum 30 characters
 - Title case (capitalize all major words)
 - No periods unless it's an abbreviation
 - Use proper abbreviations (Q1, Q2, etc.)
 </rules>

 <the-ask>
 Generate a title for the conversation.
 </the-ask>

 <output-format>
 Return only the title.
 </output-format>`,
        },
        generateSuggestions: {
          enabled: true,
          model: openai("gpt-4.1-nano"),
          limit: 5,
          instructions: suggestionsInstructions,
        },
      },
    },
  });
};
