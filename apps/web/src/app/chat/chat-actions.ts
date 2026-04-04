"use server";

import { headers } from "next/headers";
import { deleteChat } from "@/ai/utils/chat-metadata";
import { auth } from "@/lib/auth";

export async function deleteChatAction(chatId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  await deleteChat(session.user.id, chatId);
}
