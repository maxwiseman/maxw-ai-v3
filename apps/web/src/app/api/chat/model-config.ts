import {
  type ChatModelId,
  DEFAULT_CHAT_MODEL_ID,
  isChatModelId,
} from "@/lib/chat-models";

const API_MODEL_BY_ID: Record<
  ChatModelId,
  { provider: "anthropic" | "openai"; apiModelId: string }
> = {
  "anthropic/claude-sonnet-4-6": {
    provider: "anthropic",
    apiModelId: "claude-sonnet-4-6",
  },
  "openai/gpt-5.4": { provider: "openai", apiModelId: "gpt-5.4" },
};

export interface ResolvedChatModel {
  internalId: ChatModelId;
  provider: "anthropic" | "openai";
  apiModelId: string;
}

/**
 * Maps a client-supplied internal id to the real provider and API model id.
 * Unknown or missing values fall back to the default; unknown ids are logged.
 */
export function resolveChatModelRequest(
  raw: string | undefined,
): ResolvedChatModel {
  if (raw === undefined || raw === "") {
    const id = DEFAULT_CHAT_MODEL_ID;
    const { provider, apiModelId } = API_MODEL_BY_ID[id];
    return { internalId: id, provider, apiModelId };
  }
  if (!isChatModelId(raw)) {
    console.warn(
      `[chat] unknown model id "${raw}", using ${DEFAULT_CHAT_MODEL_ID}`,
    );
    const id = DEFAULT_CHAT_MODEL_ID;
    const { provider, apiModelId } = API_MODEL_BY_ID[id];
    return { internalId: id, provider, apiModelId };
  }
  const { provider, apiModelId } = API_MODEL_BY_ID[raw];
  return { internalId: raw, provider, apiModelId };
}
