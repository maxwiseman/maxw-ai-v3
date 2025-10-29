/** biome-ignore-all lint/suspicious/noArrayIndexKey: We don't really have any better options here, but the index shouldn't change */
"use client";

import { IconCopy, IconPencil } from "@tabler/icons-react";
import {
  DefaultChatTransport,
  type UIDataTypes,
  type UIMessage,
  type UITools,
} from "ai";
import { type ArtifactData, useChat, useChatStatus } from "ai-sdk-tools";
import { AIDevtools, useArtifacts } from "ai-sdk-tools/client";
import { useState } from "react";
import type z from "zod";
import type { createStudySetToolInput } from "@/ai/tools/study/flashcards";
import { FlashcardToolDisplay } from "@/ai/tools/study/flashcards-ui";
import { toolStatus } from "@/ai/tools/tool-status";
import { Action, Actions } from "@/components/ai-elements/actions";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
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
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages, id }) {
        const lastMessage = messages[messages.length - 1] as ChatInputMessage;

        return {
          body: {
            message: lastMessage,
            id,
            // Pass agent/tool choices if present in message metadata
            agentChoice: lastMessage.agentChoice,
            toolChoice: lastMessage.toolChoice,
          },
        };
      },
    }),
  });

  const [inputText, setInputText] = useState("");
  const [webSearch, setWebSearch] = useState(false);

  const handleSubmit = (message: ChatInputMessage) => {
    // If currently streaming or submitted, stop instead of submitting
    if (status === "streaming" || status === "submitted") {
      stop();
      return;
    }

    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage({
      text: message.text || "Sent with attachments",
      agentChoice: message.agentChoice,
      toolChoice: message.toolChoice,
    } as any);
    setInputText("");
  };

  console.log(messages);

  return (
    <div className="relative flex size-full justify-center">
      {process.env.NODE_ENV === "development" && <AIDevtools />}
      {messages.length === 0 ? (
        <EmptyState>
          <ChatInput
            text={inputText}
            hasMessages={false}
            onSubmit={handleSubmit}
            setText={setInputText}
            setUseWebSearch={setWebSearch}
            useWebSearch={webSearch}
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
                  text={inputText}
                  hasMessages={false}
                  onSubmit={handleSubmit}
                  setText={setInputText}
                  setUseWebSearch={setWebSearch}
                  useWebSearch={webSearch}
                />
              </div>
            </div>
          </div>
          <ConversationContent className="mx-auto max-w-3xl pt-10 pb-64">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} msg={msg} />
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
            {/*{process.env.NODE_ENV === "development" && <div className="prose dark:prose-invert prose-neutral">
              {artifacts.map((artifact) => (
                <table className="w-full max-w-3xl" key={artifact.id}>
                  <tbody>
                    {artifact.payload
                      ? Object.entries(artifact.payload).map(([key, value]) => (
                          <tr key={key}>
                            <th className="p-2 align-top">
                              {toTitleCase(
                                key
                                  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
                                  .replace(
                                    /([A-Z]+)([A-Z][a-z0-9]+)/g,
                                    "$1 $2",
                                  ),
                              )}
                            </th>
                            <td className="wrap-anywhere">
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : value}
                            </td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              ))}
             </div>}*/}
          </ConversationContent>
        </Conversation>
      )}
    </div>
  );
}

function ChatMessage({
  msg,
}: {
  msg: UIMessage<unknown, UIDataTypes, UITools>;
}) {
  const { artifacts } = useArtifacts();

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
          switch (true) {
            case part.type === "text":
              return part.text.length > 0 ? (
                <Response key={i}>{part.text}</Response>
              ) : null;
            case part.type.startsWith("data-artifact"): {
              const typedPart = part as ArtifactData<unknown>;
              const artifactData = artifacts.find(
                (artifact) => artifact.id === typedPart.id,
              );
              return (
                <FlashcardToolDisplay
                  key={i}
                  data={
                    artifactData?.payload as z.infer<
                      typeof createStudySetToolInput
                    >
                  }
                />
              );
            }
          }
          return null;
        })}
        <StatusMessage parts={msg.parts} />
      </MessageContent>
    </Message>
  );
}

function StatusMessage({
  parts,
}: {
  parts: UIMessage<unknown, UIDataTypes, UITools>["parts"];
}) {
  const status = useChatStatus();
  const lastPart = parts[parts.length - 1];
  const latestToolStatus = lastPart?.type.startsWith("tool-")
    ? toolStatus[lastPart.type.replace("tool-", "")]
    : undefined;
  if (status !== "streaming") return null;

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
