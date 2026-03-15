import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const sandboxFile = pgTable("sandbox_file", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  chatId: text("chat_id").notNull(),
  filename: text("filename").notNull(),
  r2Key: text("r2_key").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SandboxFile = typeof sandboxFile.$inferSelect;
export type NewSandboxFile = typeof sandboxFile.$inferInsert;
