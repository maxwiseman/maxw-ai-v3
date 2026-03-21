/** biome-ignore-all lint/suspicious/noArrayIndexKey: We don't really have any better options here, but the index shouldn't change */
"use client";

import { useChat } from "@ai-sdk/react";
import { IconCopy, IconFolder, IconPencil } from "@tabler/icons-react";
import {
  type ChatStatus,
  DefaultChatTransport,
  type UIDataTypes,
  type UIMessage,
  type UITools,
} from "ai";
import { useMemo, useState } from "react";
import type { UserInputQuestion } from "@/ai/tools/workspace/user-input";
import { toolStatus } from "@/ai/tools/tool-status";
import { Action, Actions } from "@/components/ai-elements/actions";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import { ShareFileCard, UpdatePlanCard } from "@/components/ai-elements/tool";
import { AnimatedStatus } from "@/app/chat/animated-status";
import { ChatInput, type ChatInputMessage } from "@/app/chat/chat-input";
import { ChatTitle } from "@/app/chat/chat-title";
import { EmptyState } from "@/app/chat/empty-state";
import { ChatFilesPanel, useChatFiles } from "@/app/chat/files-panel";
import { PromptSuggestions } from "@/app/chat/prompt-suggestions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CHAT_ID = "main-chat";

export default function ChatPage() {
  const { messages, sendMessage, status, error, stop } = useChat({
    id: CHAT_ID,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        id: CHAT_ID,
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
  const [filesOpen, setFilesOpen] = useState(false);
  const files = useChatFiles(messages);

  const pendingQuestion = useMemo(() => {
    if (status !== "ready") return null;
    // Find the last assistant message that has a request_user_input tool call
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== "assistant") continue;
      const toolPart = msg.parts.find(
        (p) =>
          p.type === "tool-request_user_input" &&
          p.state === "output-available",
      );
      if (!toolPart) continue;
      // Only surface it if no user message came after this assistant message
      const hasSubsequentUserMsg = messages
        .slice(i + 1)
        .some((m) => m.role === "user");
      if (hasSubsequentUserMsg) return null;
      const { questions } = (
        toolPart as { input: { questions: UserInputQuestion[] } }
      ).input;
      return { questions };
    }
    return null;
  }, [messages, status]);

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
      <div className="flex size-full overflow-hidden">
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
              pendingQuestion={pendingQuestion}
            />
          </EmptyState>
        ) : (
          <>
          <Conversation>
            <div className="absolute inset-x-0 top-0 z-10 flex h-10 items-center justify-center bg-background/90 backdrop-blur-sm">
              <ChatTitle />
              {/* Files panel toggle */}
              <div className="absolute right-2 flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative size-7"
                  onClick={() => setFilesOpen((o) => !o)}
                  title="Output files"
                >
                  <IconFolder className="size-4" />
                  {files.length > 0 && (
                    <span className="-top-0.5 -right-0.5 absolute flex size-3.5 items-center justify-center rounded-full bg-primary font-semibold text-[9px] text-primary-foreground leading-none">
                      {files.length > 9 ? "9+" : files.length}
                    </span>
                  )}
                </Button>
              </div>
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
                    pendingQuestion={pendingQuestion}
                  />
                </div>
              </div>
            </div>
            <ConversationContent
              className={cn(
                "mx-auto max-w-3xl pt-10 transition-[padding-bottom]",
                (pendingQuestion?.questions.length ?? 0) > 0
                  ? "pb-96"
                  : "pb-64",
              )}
            >
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
          {/* Push-sidebar files panel */}
          <ChatFilesPanel
            files={files}
            open={filesOpen}
            onClose={() => setFilesOpen(false)}
          />
          </>
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
          if (
            part.type === "tool-update_plan" &&
            (part.state === "input-available" ||
              part.state === "output-available" ||
              part.state === "output-error")
          ) {
            return <UpdatePlanCard key={i} part={part} />;
          }
          if (
            part.type === "tool-share_file" &&
            part.state === "output-available"
          ) {
            return <ShareFileCard key={i} part={part} />;
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
  const ignoredParts = ["data-chat-title", "data-workspace-files"];
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
