/**
 * Client-safe chat model identifiers. The API maps these to provider + API model
 * names; the client must not send raw provider model strings.
 */
export const CHAT_MODEL_OPTIONS = [
  { id: "anthropic/claude-sonnet-4-6", label: "Claude" },
  { id: "openai/gpt-5.4", label: "GPT-5.4" },
] as const;

export type ChatModelId = (typeof CHAT_MODEL_OPTIONS)[number]["id"];

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "anthropic/claude-sonnet-4-6";

export function isChatModelId(value: string): value is ChatModelId {
  return CHAT_MODEL_OPTIONS.some((m) => m.id === value);
}
