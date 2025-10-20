"use client";

import { useArtifacts } from "@ai-sdk-tools/artifacts/client";
import { AIDevtools } from "@ai-sdk-tools/devtools";
import { useChat } from "@ai-sdk-tools/store";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { ChatInput, type ChatInputMessage } from "@/components/chat/chat-input";
import { EmptyState } from "@/components/chat/empty-state";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { toTitleCase } from "@/lib/utils";
import { Shimmer } from "@/components/ai-elements/shimmer";

export default function ChatPage() {
  const { artifacts } = useArtifacts();
  const { messages, sendMessage, status, stop } = useChat({
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

    // if (message.files?.length) {
    //   toast.success("Files attached", {
    //     description: `${message.files.length} file(s) attached to message`,
    //   });
    // }

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
            setUseWebSearch={() => {}}
            useWebSearch={false}
          />
        </EmptyState>
      ) : (
        <Conversation>
          <div className="pointer-events-none absolute inset-0 flex h-full w-full flex-col justify-end">
            <div className="w-full bg-gradient-to-t from-[1.25rem] from-background to-transparent">
              <ChatInput
                className="pointer-events-auto mx-auto w-full max-w-3xl"
                text={inputText}
                hasMessages={false}
                onSubmit={handleSubmit}
                setText={setInputText}
                setUseWebSearch={() => {}}
                useWebSearch={false}
              />
            </div>
          </div>
          <ConversationContent className="mx-auto max-w-3xl pb-64">
            {messages.map((msg) => (
              <Message key={msg.id} from={msg.role}>
                <MessageContent
                  variant={msg.role !== "user" ? "flat" : "contained"}
                >
                  <Response>
                    {msg.parts
                      .map((part) => (part.type === "text" ? part.text : ""))
                      .join("")}
                  </Response>
                  {msg.parts[msg.parts.length - 1]?.type === "reasoning" ||
                  msg.parts[msg.parts.length - 1]?.type.startsWith("tool-") ||
                  msg.parts[msg.parts.length - 1]?.type.startsWith("data-") ||
                  (msg.parts.length === 0 && status === "streaming") ? (
                    <Shimmer>Thinking...</Shimmer>
                  ) : null}
                </MessageContent>
              </Message>
            ))}
            <div className="prose dark:prose-invert prose-neutral">
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
            </div>
          </ConversationContent>
        </Conversation>
      )}
    </div>
  );
}
