import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// Things 3 style "when" enum
export const todoWhenEnum = pgEnum("todo_when", [
  "today",
  "evening",
  "anytime",
  "someday",
]);

// Canvas content type enum
export const canvasContentTypeEnum = pgEnum("canvas_content_type", [
  "assignment",
  "page",
  "quiz",
  "discussion",
  "module_item",
]);

// Subtask type for JSONB storage
export type TodoSubTask = {
  id: string;
  title: string;
  checked: boolean;
};

// Main todo table
export const todo = pgTable("todo", {
  id: text("id").primaryKey().$defaultFn(crypto.randomUUID),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Core fields
  title: text("title").notNull(),
  description: text("description"),
  checked: boolean("checked").default(false).notNull(),

  // Things 3 style scheduling
  when: todoWhenEnum("when").default("anytime"),
  scheduledDate: timestamp("scheduled_date"), // when to work on it
  dueDate: timestamp("due_date"), // deadline

  // Subtasks as JSONB
  subTasks: jsonb("sub_tasks").$type<TodoSubTask[]>(),

  // Canvas LMS linking
  canvasContentType: canvasContentTypeEnum("canvas_content_type"),
  canvasContentId: integer("canvas_content_id"),
  canvasClassId: integer("canvas_class_id"),

  // Organization (Things 3 style)
  area: text("area"),
  project: text("project"),

  // Metadata
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Relations
export const todoRelations = relations(todo, ({ one }) => ({
  user: one(user, {
    fields: [todo.userId],
    references: [user.id],
  }),
}));

// Type exports for use in application
export type Todo = typeof todo.$inferSelect;
export type NewTodo = typeof todo.$inferInsert;
