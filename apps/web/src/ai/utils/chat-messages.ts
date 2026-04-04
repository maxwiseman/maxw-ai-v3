import { and, asc, eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import { db } from "@/db";
import { chatMessage } from "@/db/schema/chat";

export async function saveChatMessage(
  userId: string,
  chatId: string,
  msg: UIMessage,
): Promise<void> {
  await db
    .insert(chatMessage)
    .values({
      id: msg.id,
      chatId,
      userId,
      role: msg.role,
      parts: msg.parts,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: chatMessage.id,
      set: {
        parts: msg.parts,
      },
    });
}

export async function getChatMessages(
  userId: string,
  chatId: string,
): Promise<UIMessage[]> {
  const rows = await db
    .select()
    .from(chatMessage)
    .where(
      and(eq(chatMessage.chatId, chatId), eq(chatMessage.userId, userId)),
    )
    .orderBy(asc(chatMessage.createdAt));

  return rows.map((row) => ({
    id: row.id,
    role: row.role as UIMessage["role"],
    parts: row.parts as UIMessage["parts"],
  }));
}
