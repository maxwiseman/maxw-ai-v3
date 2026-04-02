import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chatMetadata } from "@/db/schema/chat";

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
