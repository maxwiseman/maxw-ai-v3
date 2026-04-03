import { type AnthropicProviderOptions, anthropic } from "@ai-sdk/anthropic";
import { type OpenAIResponsesProviderOptions, openai } from "@ai-sdk/openai";
import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type SystemModelMessage,
  smoothStream,
  ToolLoopAgent,
  type ToolLoopAgentSettings,
  type UIMessage,
} from "ai";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import {
  type AgentContext,
  buildDynamicContext,
  buildSystemPrompt,
  getToolsForProvider,
} from "@/ai/agents/general";
import {
  getWorkspaceFilesForStream,
  indexWorkspaceFiles,
  type WorkspaceFileEntry,
} from "@/ai/sandbox/list-workspace-files";
import {
  getSandboxIfRunning,
  getSyncApiUrl,
} from "@/ai/sandbox/sandbox-manager";
import { getSkillsTree } from "@/ai/sandbox/skills-tree";
import { createSyncToken } from "@/ai/sandbox/sync-token";
import { getAllCanvasCourses } from "@/app/classes/classes-actions";
import { auth } from "@/lib/auth";
import { getUserSettings } from "@/lib/user-settings";
import { resolveChatModelRequest } from "./model-config";

export async function POST(request: NextRequest) {
  const location = geolocation(request);

  // Get request data
  const body: {
    messages: UIMessage[];
    id: string;
    trigger: string;
    model?: string;
  } = await request.json();
  const { messages, id: chatId, model: requestedModelId } = body;

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

  // Load user's classes and skills tree in parallel
  const [classesResponse, skillsTree] = await Promise.all([
    getAllCanvasCourses(),
    getSkillsTree(userId),
  ]);
  const classes = typeof classesResponse === "string" ? [] : classesResponse;
  const settings = getUserSettings(authData.user);
  const role = settings?.role ?? "student";
  const schoolName = settings?.schoolName ?? "your school";

  // Build agent context
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { internalId, provider, apiModelId } =
    resolveChatModelRequest(requestedModelId);

  const context: AgentContext = {
    userId,
    fullName,
    schoolName,
    role,
    classes,
    chatId,
    provider,
    currentDateTime: now.toLocaleString(undefined, { timeZone: timezone }),
    timezone,
    country: location.country,
    city: location.city,
    region: location.countryRegion,
    skillsTree,
  };

  // Get tools configured for this context and provider
  const tools = getToolsForProvider(context);

  // Select model instance from server-side mapping (client only sends internal ids)
  const modelInstance =
    provider === "openai"
      ? openai.responses(apiModelId)
      : anthropic(apiModelId);

  const anthropicProviderOptions: AnthropicProviderOptions = {
    thinking: { type: "enabled" as const, budgetTokens: 10000 },
    cacheControl: { type: "ephemeral", ttl: "1h" },
  };
  const openaiProviderOptions: OpenAIResponsesProviderOptions = {
    reasoningEffort: "medium",
  };
  const providerOptions: ToolLoopAgentSettings["providerOptions"] = {
    anthropic: anthropicProviderOptions,
    openai: openaiProviderOptions,
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

    // Promise bridge: onFinish resolves this after sync + indexing so the
    // outer createUIMessageStream can append the workspace-files data part
    // before closing the stream.
    let resolveFiles!: (files: WorkspaceFileEntry[]) => void;
    const filesPromise = new Promise<WorkspaceFileEntry[]>((resolve) => {
      resolveFiles = resolve;
    });

    const agent = new ToolLoopAgent({
      model: modelInstance,
      instructions,
      tools,
      providerOptions: providerOptions,
      onFinish: async (event) => {
        const usage = event.totalUsage;
        const inputTokens = usage.inputTokens ?? 0;
        if (provider === "anthropic") {
          const cachedTokens = usage.inputTokenDetails.cacheReadTokens ?? 0;
          const cacheWrites = usage.inputTokenDetails.cacheWriteTokens ?? 0;
          const cachedPercent = inputTokens
            ? Math.round((cachedTokens / inputTokens) * 100)
            : 0;
          console.info(
            `Claude cache for chat ${chatId}: ${cachedTokens}/${inputTokens} input tokens cached (${cachedPercent}%) and ${cacheWrites} tokens written to the cache.`,
          );
        } else {
          console.info(
            `OpenAI (${internalId} → ${apiModelId}) usage for chat ${chatId}: ${inputTokens} input tokens, ${usage.outputTokens ?? 0} output tokens.`,
          );
        }

        // Force a sync from the sandbox (if it was used this turn) so R2
        // has the latest files before we index them into the DB.
        let files: WorkspaceFileEntry[] = [];
        try {
          const sandbox = await getSandboxIfRunning(userId, chatId);
          if (sandbox) {
            // Pass sync env explicitly — some sandbox runtimes do not inherit
            // envVars from `daytona.create` for executeCommand sessions.
            const syncUrl = getSyncApiUrl();
            const syncToken = createSyncToken(userId, chatId);
            await sandbox.process.executeCommand(
              "python3 /home/daytona/sync-workspace.py --once",
              "/home/daytona",
              { SYNC_API_URL: syncUrl, SYNC_TOKEN: syncToken },
              120,
            );
          }
          // Index any new workspace files from R2 into the DB, then read
          // back the full list to stream to the client.
          await indexWorkspaceFiles(userId, chatId);
          files = await getWorkspaceFilesForStream(userId, chatId);
        } catch (err) {
          console.error("[onFinish] workspace sync/index failed:", err);
        } finally {
          resolveFiles(files);
        }
      },
    });

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = await agent.stream({
          messages: modelMessages,
          experimental_transform: smoothStream({ chunking: "word" }),
        });

        // Pipe agent output into the outer stream and wait for it to finish.
        // Awaiting merge is required — streams are lazy, so without a consumer
        // the agent loop never runs and onFinish never fires.
        await writer.merge(result.toUIMessageStream());

        // onFinish has now run; filesPromise is already resolved.
        const files = await filesPromise;
        if (files.length > 0) {
          writer.write({
            type: "data-workspace-files",
            id: crypto.randomUUID(),
            data: files,
          });
        }
      },
      onError: (err) => {
        // Unblock the promise so the stream can close cleanly
        resolveFiles([]);
        console.error("[createUIMessageStream] error:", err);
        return "An error occurred while processing your request";
      },
    });

    return createUIMessageStreamResponse({ stream });
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
