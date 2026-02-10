"use client";

import type { ChatStatus } from "ai";
import { GlobeIcon } from "lucide-react";
import { type RefObject, useEffect, useState } from "react";
import {
  type CommandMetadata,
  type CommandSelection,
  PromptCommands,
  PromptCommandsTextarea,
  useCommandActions,
} from "@/components/ai-elements/prompt-commands";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";

export interface ChatInputMessage extends PromptInputMessage {
  agentChoice?: string;
  toolChoice?: string;
}

interface ChatInputProps {
  text?: string;
  setText?: (text: string) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  useWebSearch: boolean;
  setUseWebSearch: (value: boolean) => void;
  onSubmit: (message: ChatInputMessage) => void;
  status?: ChatStatus;
  hasMessages: boolean;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: string;
    code?: string;
  } | null;
  className?: string;
}

function ChatInputInner({
  setText,
  textareaRef,
  useWebSearch,
  setUseWebSearch,
  onSubmit,
  status,
  hasMessages,
  rateLimit,
  selection,
}: Omit<ChatInputProps, "text"> & {
  selection: CommandSelection;
}) {
  const { clearPills } = useCommandActions();
  const controller = usePromptInputController();

  const handleSubmit = (message: PromptInputMessage) => {
    console.log("ChatInput handleSubmit:", message);
    console.log("Controller value:", controller.textInput.value);
    console.log("Status:", status);

    // Merge message with command selection
    onSubmit({
      ...message,
      agentChoice: selection.agentChoice,
      toolChoice: selection.toolChoice,
    });

    // Clear pills after submit
    clearPills();
  };

  return (
    <PromptInput
      globalDrop
      multiple
      onSubmit={handleSubmit}
      className="bg-card/80 backdrop-blur-xl"
    >
      <PromptInputBody>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
        <PromptCommandsTextarea
          onChange={(event) => {
            controller.textInput.setInput(event.target.value);
            if (setText) setText(event.target.value);
          }}
          ref={textareaRef}
          value={controller.textInput.value}
          placeholder={
            rateLimit?.code === "RATE_LIMIT_EXCEEDED"
              ? "Rate limit exceeded. Please try again tomorrow."
              : hasMessages
                ? undefined
                : "Ask me anything"
          }
          disabled={rateLimit?.code === "RATE_LIMIT_EXCEEDED"}
          autoFocus
        />
      </PromptInputBody>

      <PromptInputToolbar>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputSpeechButton
            onTranscriptionChange={(text) => {
              controller.textInput.setInput(text);
              if (setText) setText(text);
            }}
            textareaRef={textareaRef}
          />
          <PromptInputButton
            onClick={() => setUseWebSearch(!useWebSearch)}
            variant={useWebSearch ? "secondary" : "ghost"}
          >
            <GlobeIcon size={16} />
            <span>Search</span>
          </PromptInputButton>
        </PromptInputTools>
        <PromptInputSubmit
          disabled={
            (!controller.textInput.value.trim() && !status) ||
            status === "streaming" ||
            rateLimit?.code === "RATE_LIMIT_EXCEEDED"
          }
          status={status}
          onClick={() => {
            console.log("Submit button clicked");
            console.log("Text value:", controller.textInput.value);
            console.log("Status:", status);
            console.log(
              "Disabled:",
              (!controller.textInput.value.trim() && !status) ||
                status === "streaming" ||
                rateLimit?.code === "RATE_LIMIT_EXCEEDED",
            );
          }}
        />
      </PromptInputToolbar>
    </PromptInput>
  );
}

export function ChatInput({
  text,
  setText,
  textareaRef,
  useWebSearch,
  setUseWebSearch,
  onSubmit,
  status,
  hasMessages,
  rateLimit,
  className,
}: ChatInputProps) {
  const [metadata, setMetadata] = useState<CommandMetadata>({
    agents: [],
    tools: [],
  });
  const [selection, setSelection] = useState<CommandSelection>({});

  // Fetch metadata on mount
  useEffect(() => {
    fetch("/api/metadata")
      .then((res) => res.json())
      .then((data) => setMetadata(data))
      .catch((err) => console.error("Failed to fetch metadata:", err));
  }, []);

  return (
    <div className={className}>
      <PromptCommands metadata={metadata} onSelectionChange={setSelection}>
        <ChatInputInner
          setText={setText}
          textareaRef={textareaRef}
          useWebSearch={useWebSearch}
          setUseWebSearch={setUseWebSearch}
          onSubmit={onSubmit}
          status={status}
          hasMessages={hasMessages}
          rateLimit={rateLimit}
          selection={selection}
        />
      </PromptCommands>

      <div className="h-5">
        {rateLimit && rateLimit.remaining < 5 && (
          <div
            className={`border-border/50 border-t py-2 text-[11px] ${
              rateLimit.code === "RATE_LIMIT_EXCEEDED"
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            <div className="flex w-full">
              <span>
                {rateLimit.code === "RATE_LIMIT_EXCEEDED"
                  ? "Rate limit exceeded - try again tomorrow"
                  : `Messages remaining: ${rateLimit.remaining} / ${rateLimit.limit}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
