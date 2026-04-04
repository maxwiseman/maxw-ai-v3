"use client";

import { IconEdit, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { SidebarExtension } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActiveChat } from "./active-chat-provider";
import { deleteChatAction } from "./chat-actions";

export interface Chat {
  chatId: string;
  title: string | null;
  updatedAt: Date;
}

interface ChatSidebarContextValue {
  chats: Chat[];
  addOptimisticChat: (chatId: string) => void;
  setOptimisticTitle: (chatId: string, title: string) => void;
  touchChat: (chatId: string) => void;
}

const ChatSidebarContext = createContext<ChatSidebarContextValue>({
  chats: [],
  addOptimisticChat: () => {},
  setOptimisticTitle: () => {},
  touchChat: () => {},
});

export function ChatSidebarProvider({
  initialChats,
  children,
}: {
  initialChats: Chat[];
  children: React.ReactNode;
}) {
  const [chats, setChats] = useState<Chat[]>(() =>
    initialChats.map((chat) => ({
      ...chat,
      updatedAt: new Date(chat.updatedAt),
    })),
  );

  const value = useMemo<ChatSidebarContextValue>(
    () => ({
      chats,
      addOptimisticChat: (chatId) => {
        setChats((prev) => {
          if (prev.some((chat) => chat.chatId === chatId)) {
            return prev;
          }

          const now = new Date();
          return [{ chatId, title: null, updatedAt: now }, ...prev];
        });
      },
      setOptimisticTitle: (chatId, title) => {
        setChats((prev) => {
          const existing = prev.find((chat) => chat.chatId === chatId);

          if (!existing) {
            const now = new Date();
            return [{ chatId, title, updatedAt: now }, ...prev];
          }

          if (existing.title === title) {
            return prev;
          }

          return prev.map((chat) =>
            chat.chatId === chatId ? { ...chat, title } : chat,
          );
        });
      },
      touchChat: (chatId) => {
        setChats((prev) => {
          const now = new Date();
          const existing = prev.find((chat) => chat.chatId === chatId);

          if (!existing) {
            return [{ chatId, title: null, updatedAt: now }, ...prev];
          }

          const updated = { ...existing, updatedAt: now };
          return [updated, ...prev.filter((chat) => chat.chatId !== chatId)];
        });
      },
    }),
    [chats],
  );

  return (
    <ChatSidebarContext.Provider value={value}>
      {children}
    </ChatSidebarContext.Provider>
  );
}

export function useChatSidebarState() {
  return useContext(ChatSidebarContext);
}

export function ChatSidebarClient() {
  const { chats } = useChatSidebarState();
  const router = useRouter();
  const { startNewChat } = useActiveChat();

  const sortedChats = useMemo(
    () =>
      [...chats].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [chats],
  );

  const content = (
    <div className="flex w-3xs flex-col gap-1 overflow-y-auto p-2">
      <Button
        variant="outline"
        size="lg"
        className="mb-2 w-full justify-center gap-2 py-4"
        onClick={() => {
          startNewChat();
          router.push("/chat");
        }}
      >
        <IconEdit className="size-4 text-muted-foreground" />
        New Chat
      </Button>
      {sortedChats.map((chat, i) => (
        <ChatSidebarItem prefetch={i < 5} key={chat.chatId} chat={chat} />
      ))}
      {sortedChats.length === 0 && (
        <p className="px-2 py-1 text-muted-foreground text-xs">No chats yet</p>
      )}
    </div>
  );

  return <SidebarExtension>{content}</SidebarExtension>;
}

function ChatSidebarItem({ chat, prefetch = false }: { chat: Chat, prefetch?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isActive = pathname === `/chat/${chat.chatId}`;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await deleteChatAction(chat.chatId);
      router.push("/chat");
      router.refresh();
    });
  };

  return (
    <div
      className={cn(
        "group flex h-9 w-full items-center rounded-md text-sm transition-colors",
        isActive
          ? "bg-secondary text-secondary-foreground"
          : "hover:bg-accent hover:text-accent-foreground",
        isPending && "opacity-50",
      )}
    >
      <Link
        href={`/chat/${chat.chatId}`}
        prefetch={prefetch}
        className="flex h-full min-w-0 flex-1 items-center overflow-hidden px-3 group-hover:pr-2 transition-[padding-right] duration-150"
      >
        <span className="truncate">{chat.title ?? "New Chat"}</span>
      </Link>
      <div className="w-0 shrink-0 overflow-hidden transition-[width] duration-150 group-hover:w-6 group-hover:mr-2">
        <button
          className="flex size-6 shrink-0 items-center justify-center rounded-sm hover:bg-accent-foreground/10"
          onClick={handleDelete}
          title="Delete chat"
        >
          <IconTrash className="size-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
