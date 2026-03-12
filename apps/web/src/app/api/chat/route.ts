import { type AnthropicProviderOptions, anthropic } from "@ai-sdk/anthropic";
import { stopSandbox } from "@/ai/sandbox/sandbox-manager";
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

  // Load user's classes
  const classesResponse = await getAllCanvasCourses();
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
  };

  // Get tools configured for this context
  const tools = getGeneralAgentTools(context);

  // Build provider options
  const providerOptions = {
    anthropic: {
      // Extended thinking for complex reasoning
      thinking: {
        type: "enabled" as const,
        budgetTokens: 10000,
      },
    } satisfies AnthropicProviderOptions,
  };

  try {
    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages);

    // Build system prompt instructions:
    // - Static part (cached): stable tool docs, guidelines, user profile, classes
    // - Dynamic part (uncached): current datetime and location (changes per request)
    // Splitting these allows the static part to cache correctly across turns.
    const instructions: SystemModelMessage[] = [
      {
        role: "system",
        content: buildSystemPrompt(context),
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      {
        role: "system",
        content: buildDynamicContext(context),
      },
    ];

    // Cache the conversation history at a stable breakpoint.
    // We mark the second-to-last user message so the history up to that
    // point is cached on the next turn (when the conversation is one longer).
    const lastUserIdx = modelMessages.reduce(
      (last, msg, idx) => (msg.role === "user" ? idx : last),
      -1,
    );
    const cacheIdx = lastUserIdx > 0 ? lastUserIdx - 1 : -1;
    const messagesWithCache = modelMessages.map((msg, idx) => {
      if (idx === cacheIdx) {
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
      model: anthropic("claude-sonnet-4-6"),
      instructions,
      tools,
      providerOptions: providerOptions,
      onFinish: async ({ steps }) => {
        // Stop the sandbox to preserve filesystem while stopping billing
        await stopSandbox(chatId);

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
