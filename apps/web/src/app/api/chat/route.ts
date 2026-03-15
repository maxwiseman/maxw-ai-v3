import { type AnthropicProviderOptions, anthropic } from "@ai-sdk/anthropic";
import type { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  type ModelMessage,
  type SystemModelMessage,
  smoothStream,
  ToolLoopAgent,
  type UIMessage,
} from "ai";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import {
  type AgentContext,
  buildDynamicContext,
  buildSystemPrompt,
  getGeneralAgentTools,
} from "@/ai/agents/general";
import { listWorkspaceFiles } from "@/ai/sandbox/list-workspace-files";
import { getSkillsTree } from "@/ai/sandbox/skills-tree";
import { getAllCanvasCourses } from "@/app/classes/classes-actions";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const location = geolocation(request);

  // Get request data
  const body: { messages: UIMessage[]; id: string; trigger: string } =
    await request.json();
  const { messages, id: chatId } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "No messages provided or invalid format" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!chatId) {
    return new Response(JSON.stringify({ error: "No chat ID provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get authenticated user
  const authData = await auth.api.getSession({ headers: await headers() });

  if (!authData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = authData.user.id;
  const fullName = authData.user.name;
  const schoolName = "Harvard University"; // TODO: Get from user settings

  // Load user's classes and skills tree in parallel
  const [classesResponse, skillsTree] = await Promise.all([
    getAllCanvasCourses(),
    getSkillsTree(userId),
  ]);
  const classes = typeof classesResponse === "string" ? [] : classesResponse;

  // Build agent context
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const context: AgentContext = {
    userId,
    fullName,
    schoolName,
    classes,
    chatId,
    currentDateTime: now.toLocaleString(undefined, { timeZone: timezone }),
    timezone,
    country: location.country,
    city: location.city,
    region: location.countryRegion,
    skillsTree,
  };

  // Get tools configured for this context
  const tools = getGeneralAgentTools(context);

  // Build provider options
  const providerOptions = {
    anthropic: {
      thinking: {
        type: "enabled" as const,
        budgetTokens: 10000,
      },
      cacheControl: {
        type: "ephemeral",
        ttl: "1h",
      },
    },
  } satisfies {
    anthropic?: AnthropicProviderOptions;
    openai?: OpenAIResponsesProviderOptions;
  };

  try {
    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages);

    // Build system prompt instructions.
    const instructions: SystemModelMessage[] = [
      {
        role: "system",
        content: buildSystemPrompt(context),
      },
      {
        role: "system",
        content: buildDynamicContext(context),
      },
    ];

    const agent = new ToolLoopAgent({
      model: anthropic("claude-sonnet-4-6"),
      instructions,
      tools,
      providerOptions: providerOptions,
      onFinish: async (event) => {
        // Index any new workspace files from R2 into the DB.
        // Since the workspace is R2-backed, files are already persisted —
        // this just keeps the DB index in sync without touching the sandbox.
        try {
          await listWorkspaceFiles(userId, chatId);
        } catch (syncError) {
          console.error("Failed to index workspace files", syncError);
        }

        const usage = event.totalUsage;
        const inputTokens = usage.inputTokens ?? 0;
        const cachedTokens = usage.inputTokenDetails.cacheReadTokens ?? 0;
        const cacheWrites = usage.inputTokenDetails.cacheWriteTokens ?? 0;
        const cachedPercent = inputTokens
          ? Math.round((cachedTokens / inputTokens) * 100)
          : 0;

        console.info(
          `Claude cache for chat ${chatId}: ${cachedTokens}/${inputTokens} input tokens cached (${cachedPercent}%) and ${cacheWrites} tokens written to the cache.`,
        );
      },
    });

    const result = await agent.stream({
      messages: modelMessages,
      experimental_transform: smoothStream({ chunking: "word" }),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your request",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
