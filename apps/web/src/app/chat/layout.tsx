import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { listChats } from "@/ai/utils/chat-metadata";
import { auth } from "@/lib/auth";
import { ActiveChatProvider } from "./active-chat-provider";
import { ChatShell } from "./chat-shell";
import { ChatSidebarClient, ChatSidebarProvider } from "./chat-sidebar";

async function ChatSidebar({ userId }: { userId: string }) {
  const chats = await listChats(userId);
  return (
    <ChatSidebarProvider initialChats={chats}>
      <ChatSidebarClient />
      <ChatShell />
    </ChatSidebarProvider>
  );
}

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ActiveChatProvider>
      <div className="size-full min-h-0">
        <Suspense fallback={null}>
          <ChatSidebar userId={session.user.id} />
        </Suspense>
        {children}
      </div>
    </ActiveChatProvider>
  );
}
