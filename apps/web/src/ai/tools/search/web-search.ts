import { anthropic } from "@ai-sdk/anthropic";
import type { AppContext } from "@/ai/agents/shared";

export function createWebSearchTool(context: AppContext) {
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
