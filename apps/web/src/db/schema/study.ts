import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const studySet = pgTable("study_set", {
  id: text().primaryKey().$defaultFn(crypto.randomUUID),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text().notNull(),
  createdAt: timestamp(),
});
export const studySetRelations = relations(studySet, ({ many }) => ({
  items: many(studySetItem),
}));

export const studySetItem = pgTable("study_set_items", {
  id: text().primaryKey().$defaultFn(crypto.randomUUID),
  studySetId: text()
    .notNull()
    .references(() => studySet.id, { onDelete: "cascade" }),
  type: text().notNull().$type<"term" | "question">(),
});
