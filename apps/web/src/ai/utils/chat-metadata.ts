import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { chatMessage, chatMetadata } from "@/db/schema/chat";

export interface ChatMetadata {
  chatId: string;
  userId: string;
}

export async function getOrCreateChatMetadata(
  userId: string,
  chatId: string,
): Promise<ChatMetadata> {
  const existing = await db
    .select()
    .from(chatMetadata)
    .where(eq(chatMetadata.chatId, chatId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  try {
    await db.insert(chatMetadata).values({
      id: crypto.randomUUID(),
      chatId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    // In case of race condition (another request inserted), re-read
  }

  const created = await db
    .select()
    .from(chatMetadata)
    .where(eq(chatMetadata.chatId, chatId))
    .limit(1);

  if (created.length === 0) {
    throw new Error("Unable to persist chat metadata.");
  }

  return created[0];
}

export async function listChats(
  userId: string,
): Promise<{ chatId: string; title: string | null; updatedAt: Date }[]> {
  const [metadataRows, lastMessageRows] = await Promise.all([
    db
      .select({
        chatId: chatMetadata.chatId,
        title: chatMetadata.title,
        metadataUpdatedAt: chatMetadata.updatedAt,
      })
      .from(chatMetadata)
      .where(eq(chatMetadata.userId, userId)),
    db
      .select({
        chatId: chatMessage.chatId,
        lastMessageAt: max(chatMessage.createdAt),
      })
      .from(chatMessage)
      .where(eq(chatMessage.userId, userId))
      .groupBy(chatMessage.chatId),
  ]);

  const lastMessageAtByChatId = new Map(
    lastMessageRows.map((row) => [row.chatId, row.lastMessageAt]),
  );

  return metadataRows
    .map((row) => ({
      chatId: row.chatId,
      title: row.title,
      updatedAt: lastMessageAtByChatId.get(row.chatId) ?? row.metadataUpdatedAt,
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function updateChatTitle(
  chatId: string,
  title: string,
): Promise<void> {
  await db
    .update(chatMetadata)
    .set({ title, updatedAt: new Date() })
    .where(eq(chatMetadata.chatId, chatId));
}

export async function deleteChat(
  userId: string,
  chatId: string,
): Promise<void> {
  // Delete messages first (no FK cascade from chatMetadata to chatMessage)
  await db
    .delete(chatMessage)
    .where(and(eq(chatMessage.chatId, chatId), eq(chatMessage.userId, userId)));
  // Delete the metadata row
  await db
    .delete(chatMetadata)
    .where(
      and(eq(chatMetadata.chatId, chatId), eq(chatMetadata.userId, userId)),
    );
}
