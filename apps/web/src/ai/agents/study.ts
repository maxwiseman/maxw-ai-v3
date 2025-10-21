/**
 * Analytics Specialist Agent
 *
 * Analytics & forecasting specialist with business intelligence tools
 */

import { openai } from "@ai-sdk/openai";
import { createAgent, formatContextForLLM } from "./shared";
import { createStudySetTool } from "../tools/study/flashcards";

export const studyAgent = createAgent({
  name: "study",
  model: openai("gpt-5-mini"),
  modelSettings: {
    providerOptions: {
      openai: { reasoningEffort: "minimal", strictJsonSchema: true },
    },
  },
  instructions: (ctx) => `You are a tutor for students at ${ctx.schoolName}.

PRESENTATION STYLE:
- Explain things in simple terms, don't overcomplicate
- Use clear language, but don't be patronizing
- Highlight key details
- Be concise, users lose interest with long responses

STUDY SET TOOL:
- Always use LaTeX within study sets for formulas or variables. Surround any LaTeX with double dollar signs ($$x$$)
- Don't repeat the set in your response to the user. It will already be displayed to them above your message

${formatContextForLLM(ctx)}`,
  tools: {
    createStudySet: createStudySetTool,
  },
  matchOn: ["explain", "flashcards"],
  maxTurns: 5,
});
