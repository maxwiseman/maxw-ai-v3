"use client";

import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { useActiveChat } from "./active-chat-provider";
import ChatPageClient from "./chat-page-client";
import { useChatSidebarState } from "./chat-sidebar";

interface ChatMessagesResponse {
  messages: UIMessage[];
}

export function ChatShell() {
  const { activeChatId, routeChatId, isNewChatRoute } = useActiveChat();
  const { setOptimisticTitle, touchChat } = useChatSidebarState();
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [isLoadingRouteMessages, setIsLoadingRouteMessages] = useState(false);
  const lastDraftChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isNewChatRoute) {
      lastDraftChatIdRef.current = activeChatId;
    }
  }, [activeChatId, isNewChatRoute]);

  useEffect(() => {
    if (!routeChatId) {
      return;
    }

    const titleFromMessages = initialMessages
      .flatMap((message) => message.parts)
      .find(
        (part): part is { type: "data-chat-title"; data: { title?: string } } =>
          part.type === "data-chat-title",
      )?.data?.title;

    if (titleFromMessages) {
      setOptimisticTitle(routeChatId, titleFromMessages);
    }
  }, [initialMessages, routeChatId, setOptimisticTitle]);

  useEffect(() => {
    if (!routeChatId) {
      setIsLoadingRouteMessages(false);
      setInitialMessages([]);
      return;
    }

    if (routeChatId === lastDraftChatIdRef.current) {
      lastDraftChatIdRef.current = null;
      setIsLoadingRouteMessages(false);
      return;
    }

    let cancelled = false;
    setIsLoadingRouteMessages(true);

    fetch(`/api/chat/${routeChatId}/messages`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load chat messages");
        }

        return (await res.json()) as ChatMessagesResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setInitialMessages(data.messages);
        setIsLoadingRouteMessages(false);
      })
      .catch((err) => {
        console.error("Failed to load chat messages:", err);
        if (!cancelled) {
          setInitialMessages([]);
          setIsLoadingRouteMessages(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [routeChatId]);

  useEffect(() => {
    if (!isNewChatRoute) {
      return;
    }

    setInitialMessages([]);
  }, [isNewChatRoute]);

  if (!activeChatId) {
    return null;
  }

  if (routeChatId && isLoadingRouteMessages) {
    return null;
  }

  return (
    <ChatPageClient
      key={activeChatId}
      chatId={activeChatId}
      initialMessages={initialMessages}
      isDraftChat={isNewChatRoute}
      onChatTitle={(title) => {
        if (!activeChatId) return;
        setOptimisticTitle(activeChatId, title);
      }}
      onUserMessageSent={() => {
        if (!activeChatId) return;
        touchChat(activeChatId);
      }}
    />
  );
}
