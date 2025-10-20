/**
 * Analytics Specialist Agent
 *
 * Analytics & forecasting specialist with business intelligence tools
 */

import { openai } from "@ai-sdk/openai";
import { createAgent, formatContextForLLM } from "./shared";

export const studyAgent = createAgent({
  name: "study",
  model: openai("gpt-5-mini"),
  instructions: (ctx) => `You are a tutor for students at ${ctx.schoolName}.

PRESENTATION STYLE:
- Explain things in simple terms, don't overcomplicate
- Use clear language, but don't be patronizing
- Highlight key details
- Be concise, users lose interest with long responses

${formatContextForLLM(ctx)}`,
  tools: {
    // businessHealth: businessHealthScoreTool,
    // cashFlowForecast: cashFlowForecastTool,
    // stressTest: cashFlowStressTestTool,
  },
  matchOn: ["explain", "flashcards"],
  maxTurns: 5,
});
