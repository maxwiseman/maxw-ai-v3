import { anthropic } from "@ai-sdk/anthropic";
import type { AgentContext } from "@/ai/agents/general";

export function createWebSearchTool(context: AgentContext) {
  return anthropic.tools.webSearch_20250305({
    userLocation: {
      type: "approximate",
      city: context.city,
      country: context.country,
      region: context.region,
      timezone: context.timezone,
    },
  });
}
