import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Memory storage for Anthropic's native memory tool
 * Stores virtual files in a /memories directory structure
 * Path format: /memories/filename.txt or /memories/subdir/file.txt
 */
export const memory = pgTable("memory", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  path: text("path").notNull(), // e.g., /memories/notes.txt
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * Daily AI-generated status message for the home page dashboard
 * Generated once per day per user by looking at Canvas assignments
 */
export const dailyStatusMessage = pgTable(
  "status_message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("daily_status_message_user_date_idx").on(table.userId, table.date)],
);

/**
 * Sandbox session tracking for code execution persistence
 * Stores Daytona sandbox IDs per chat for reuse across requests
 */
export const containerSession = pgTable("container_session", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  chatId: text("chat_id").notNull().unique(),
  sandboxId: text("sandbox_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
