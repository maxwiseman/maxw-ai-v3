import { json, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Stores persisted chat messages in UIMessage format.
 */
export const chatMessage = pgTable("chat_message", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" | "assistant"
  parts: json("parts").notNull(), // UIMessage["parts"] as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Stores friendly chat identifiers and links them to a user + chatId.
 */
export const chatMetadata = pgTable("chat_metadata", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  chatId: text("chat_id").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
