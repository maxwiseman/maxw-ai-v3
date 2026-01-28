/** biome-ignore-all lint/suspicious/noArrayIndexKey: We don't really have any better options here, but the index shouldn't change */
"use client";

import { useChat } from "@ai-sdk/react";
import { IconCopy, IconPencil } from "@tabler/icons-react";
import {
  type ChatStatus,
  DefaultChatTransport,
  type UIDataTypes,
  type UIMessage,
  type UITools,
} from "ai";
import { useState } from "react";
import { toolStatus } from "@/ai/tools/tool-status";
import { Action, Actions } from "@/components/ai-elements/actions";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import { AnimatedStatus } from "@/components/chat/animated-status";
import { ChatInput, type ChatInputMessage } from "@/components/chat/chat-input";
import { ChatTitle } from "@/components/chat/chat-title";
import { EmptyState } from "@/components/chat/empty-state";
import { PromptSuggestions } from "@/components/chat/prompt-suggestions";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ChatPage() {
  const { messages, sendMessage, status, error, stop } = useChat({
    id: "main-chat",
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        id: "main-chat",
      },
    }),
    onError: (err) => {
      console.error("useChat error:", err);
    },
    onFinish: (message) => {
      console.log("useChat finished:", message);
    },
    // onResponse: (response) => {
    //   console.log("useChat response:", response);
    // },
  });
  console.log("messages:", messages);

  const [webSearch, setWebSearch] = useState(false);

  const handleSubmit = (message: ChatInputMessage) => {
    console.log("handleSubmit called with:", message);
    console.log("Current status:", status);

    // If currently streaming, stop instead of submitting
    if (status === "streaming") {
      stop();
      return;
    }

    if (!(message.text || message.files)) {
      console.log("No text or attachments, returning");
      return;
    }

    sendMessage({
      role: "user",
      parts: [
        ...(message.files ?? []),
        ...(message.text
          ? [{ type: "text" as const, text: message.text }]
          : []),
      ],
    });
  };

  return (
    <PromptInputProvider>
      <div className="relative flex size-full justify-center">
        {messages.length === 0 ? (
          <EmptyState>
            <ChatInput
              text=""
              hasMessages={false}
              onSubmit={handleSubmit}
              setText={() => {}}
              setUseWebSearch={setWebSearch}
              useWebSearch={webSearch}
              status={status as ChatStatus}
            />
          </EmptyState>
        ) : (
          <Conversation>
            <div className="absolute inset-x-0 top-0 z-10 flex h-10 items-center justify-center bg-background/90 backdrop-blur-sm">
              <ChatTitle />
            </div>
            <div className="pointer-events-none absolute inset-0 z-10 flex h-full w-full flex-col justify-end">
              <div className="w-full bg-linear-to-t from-[1.25rem] from-background to-transparent">
                <div className="mx-auto w-full max-w-2xl">
                  <PromptSuggestions delay={1} />
                  <ChatInput
                    className="pointer-events-auto mx-auto w-full"
                    text=""
                    hasMessages={true}
                    onSubmit={handleSubmit}
                    setText={() => {}}
                    setUseWebSearch={setWebSearch}
                    useWebSearch={webSearch}
                    status={status as ChatStatus}
                  />
                </div>
              </div>
            </div>
            <ConversationContent className="mx-auto max-w-3xl pt-10 pb-64">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} msg={msg} status={status} />
              ))}
              {status === "error" && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {error?.name ?? "An unknown error occurred"}
                    </CardTitle>
                    <CardDescription>
                      {error?.message}
                      <br />
                      {error?.cause as string | undefined}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </ConversationContent>
          </Conversation>
        )}
      </div>
    </PromptInputProvider>
  );
}

function ChatMessage({
  msg,
  status,
}: {
  msg: UIMessage<unknown, UIDataTypes, UITools>;
  status: ChatStatus;
}) {
  return (
    <Message className="group items-center" from={msg.role}>
      {msg.role === "user" && (
        <Actions className="opacity-0 transition-opacity group-hover:opacity-100">
          <Action
            onClick={() => {
              navigator.clipboard.writeText(
                msg.parts
                  .filter((p) => p.type === "text")
                  .map((p) => p.text)
                  .join(""),
              );
            }}
            label="Copy"
          >
            <IconCopy className="size-4" />
          </Action>
          <Action label="Edit">
            <IconPencil className="size-4" />
          </Action>
        </Actions>
      )}
      <MessageContent
        className="space-y-2 overflow-visible"
        variant={msg.role !== "user" ? "flat" : "contained"}
      >
        {msg.parts.map((part, i) => {
          if (
            part.type === "text" &&
            part.text.replaceAll(/\s+/g, "").length >= 1
          ) {
            return part.text && part.text.length > 0 ? (
              <Response key={i}>{part.text}</Response>
            ) : null;
          }
          return null;
        })}
        <StatusMessage parts={msg.parts} status={status} />
      </MessageContent>
    </Message>
  );
}

function StatusMessage({
  parts,
  status,
}: {
  parts: UIMessage<unknown, UIDataTypes, UITools>["parts"];
  status: ChatStatus;
}) {
  const ignoredParts = ["data-chat-title"];
  const filteredParts = parts.filter((p) => !ignoredParts.includes(p.type));
  const lastPart = filteredParts[filteredParts.length - 1];
  const latestToolStatus = lastPart?.type.startsWith("tool-")
    ? toolStatus[lastPart.type.replace("tool-", "")]
    : undefined;
  if (status !== "streaming" && status !== "submitted") return null;

  if (
    !lastPart ||
    lastPart.type.startsWith("data-") ||
    lastPart.type === "reasoning"
  )
    return <AnimatedStatus text="Thinking..." />;

  if (lastPart.type.startsWith("tool-") && latestToolStatus)
    return (
      <AnimatedStatus
        {...latestToolStatus}
        text={`${latestToolStatus.text}...`}
      />
    );
}
