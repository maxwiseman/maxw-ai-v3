"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ActiveChatContextValue {
  activeChatId: string | null;
  routeChatId: string | null;
  isNewChatRoute: boolean;
  startNewChat: () => void;
}

const ActiveChatContext = createContext<ActiveChatContextValue>({
  activeChatId: null,
  routeChatId: null,
  isNewChatRoute: false,
  startNewChat: () => {},
});

function getRouteChatId(pathname: string): string | null {
  const match = pathname.match(/^\/chat\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [draftChatId, setDraftChatId] = useState<string | null>(() =>
    pathname === "/chat" ? crypto.randomUUID() : null,
  );
  const previousPathnameRef = useRef<string | null>(pathname);

  const isNewChatRoute = pathname === "/chat";
  const routeChatId = useMemo(() => getRouteChatId(pathname), [pathname]);

  const startNewChat = useCallback(() => {
    setDraftChatId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (isNewChatRoute && previousPathnameRef.current !== "/chat") {
      setDraftChatId(crypto.randomUUID());
    }

    if (!isNewChatRoute) {
      setDraftChatId(null);
    }

    previousPathnameRef.current = pathname;
  }, [isNewChatRoute, pathname]);

  const value = useMemo<ActiveChatContextValue>(() => {
    return {
      activeChatId: routeChatId ?? draftChatId,
      routeChatId,
      isNewChatRoute,
      startNewChat,
    };
  }, [draftChatId, isNewChatRoute, routeChatId, startNewChat]);

  return (
    <ActiveChatContext.Provider value={value}>
      {children}
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat() {
  return useContext(ActiveChatContext);
}
