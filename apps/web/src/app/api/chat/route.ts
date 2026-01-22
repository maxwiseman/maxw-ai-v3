import {
  type AnthropicProviderOptions,
  anthropic,
  forwardAnthropicContainerIdFromLastStep,
} from "@ai-sdk/anthropic";
import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  type ModelMessage,
  smoothStream,
  ToolLoopAgent,
  type UIMessage,
} from "ai";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import {
  type AgentContext,
  buildSystemPrompt,
  getGeneralAgentTools,
} from "@/ai/agents/general";
import { getAllCanvasCourses } from "@/app/classes/classes-actions";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  console.log("=== API /api/chat POST received ===");
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

  console.log(messages);

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

  // Load user's classes
  const classesResponse = await getAllCanvasCourses();
  const classes = typeof classesResponse === "string" ? [] : classesResponse;

  // Build agent context
  const now = new Date();
  const timezone =
    location.countryRegion || Intl.DateTimeFormat().resolvedOptions().timeZone;

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
  };

  // Get tools configured for this context
  const tools = getGeneralAgentTools(context);

  // Extract container ID from last assistant message in conversation history
  const lastAssistantMessage = messages
    .slice()
    .reverse()
    .find((msg) => msg.role === "assistant");
  const existingContainerId = (lastAssistantMessage as any)
    ?.experimental_providerMetadata?.anthropic?.containerId;

  // Build provider options with container persistence
  const providerOptions = {
    anthropic: {
      // Extended thinking for complex reasoning
      thinking: {
        type: "enabled" as const,
        budgetTokens: 10000,
      },
      // Container with Agent Skills (reuse from last message if exists)
      container: {
        id: existingContainerId,
        skills: [
          { type: "anthropic" as const, skillId: "pptx" },
          { type: "anthropic" as const, skillId: "docx" },
          { type: "anthropic" as const, skillId: "xlsx" },
          { type: "anthropic" as const, skillId: "pdf" },
          {
            type: "custom" as const,
            skillId: "skill_01VmZ8Be2T5orYF7i1YiBUTv",
          },
          {
            type: "custom" as const,
            skillId: "skill_01KxC6EtBShVCeb2jVEs7gXW",
          },
        ],
      },
    } satisfies AnthropicProviderOptions,
  };

  try {
    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages);

    // Add cache control breakpoints to optimize token usage
    // 1. Cache system prompt (biggest win - always the same)
    const systemPromptWithCache: ModelMessage = {
      role: "system",
      content: buildSystemPrompt(context),
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    };

    // 2. Add cache breakpoint to conversation history (after a few messages)
    // This caches the conversation history up to a certain point
    const messagesWithCache = modelMessages.map((msg, idx) => {
      // Cache at a breakpoint ~4 messages before the end
      // This allows recent messages to remain uncached (they change each turn)
      if (idx === Math.max(0, modelMessages.length - 4)) {
        return {
          ...msg,
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        };
      }
      return msg;
    });

    const agent = new ToolLoopAgent({
      model: anthropic("claude-sonnet-4-5"),
      instructions: systemPromptWithCache,
      tools,
      providerOptions: providerOptions,
      prepareStep: forwardAnthropicContainerIdFromLastStep,
      onFinish: ({ steps }) => {
        // Log cache performance metrics from the last step
        const lastStep = steps[steps.length - 1];
        const metadata = lastStep?.providerMetadata?.anthropic;
        if (metadata) {
          console.log("=== Cache Performance Metrics ===");
          console.log(
            "Cache creation tokens:",
            metadata.cacheCreationInputTokens ?? 0,
          );
          console.log("Cache read tokens:", metadata.cacheReadInputTokens ?? 0);
          console.log("Total input tokens:", lastStep.usage?.inputTokens ?? 0);

          const cacheReadTokens = Number(metadata.cacheReadInputTokens ?? 0);
          const totalInputTokens = Number(lastStep.usage?.inputTokens ?? 0);
          console.log(
            "Cache hit rate:",
            totalInputTokens > 0
              ? `${Math.round((cacheReadTokens / totalInputTokens) * 100)}%`
              : "N/A",
          );
          console.log("Steps completed:", steps.length);
        }
      },
    });

    const result = await agent.stream({
      messages: messagesWithCache,
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
