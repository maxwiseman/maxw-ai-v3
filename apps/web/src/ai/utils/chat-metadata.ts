import { eq } from "drizzle-orm";
import { randomInt } from "crypto";
import { db } from "@/db";
import { chatMetadata } from "@/db/schema/chat";

const ADJECTIVES = [
  "calm",
  "brave",
  "lunar",
  "rustic",
  "gentle",
  "curious",
  "bright",
  "wild",
  "steady",
  "crisp",
];

const NOUNS = [
  "falcon",
  "orchid",
  "harbor",
  "ember",
  "voyage",
  "stream",
  "canyon",
  "harbinger",
  "atlas",
  "compass",
];

function generateFriendlyId(): string {
  const adjective = ADJECTIVES[randomInt(0, ADJECTIVES.length)];
  const noun = NOUNS[randomInt(0, NOUNS.length)];
  const token = randomInt(100, 1000);
  return `${adjective}-${noun}-${token}`;
}

export interface ChatMetadata {
  chatId: string;
  userId: string;
  friendlyId: string;
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

  const friendlyId = generateFriendlyId();

  try {
    await db.insert(chatMetadata).values({
      id: crypto.randomUUID(),
      chatId,
      userId,
      friendlyId,
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
