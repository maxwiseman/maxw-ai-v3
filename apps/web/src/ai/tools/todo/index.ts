import { tool } from "ai";
import { and, desc, eq, gte, isNull, lt, or } from "drizzle-orm";
import * as z from "zod/v4";
import type { AppContext } from "@/ai/agents/shared";
import { db } from "@/db";
import { type NewTodo, type TodoSubTask, todo } from "@/db/schema/todo";

// Factory function to create todo tools with context
export function createTodoTools(ctx: AppContext) {
  const userId = ctx.userId;

  // Create Todo Tool
  const createTodoTool = tool({
    description:
      "Create a new todo item for the user. Can optionally link to a Canvas assignment, page, quiz, discussion, or module item.",
    inputSchema: z.object({
      title: z.string().describe("The todo title"),
      description: z
        .string()
        .optional()
        .describe("Optional notes/description for the todo"),
      dateType: z
        .enum(["calendar", "calendarEvening", "anytime", "someday"])
        .optional()
        .describe(
          "Date type for scheduling: calendar (specific date), calendarEvening (specific date, evening), anytime (default, no specific date), or someday (deferred)",
        ),
      scheduledDate: z
        .string()
        .optional()
        .describe("ISO date string for when to work on this task (required for calendar/calendarEvening dateType)"),
      dueDate: z
        .string()
        .optional()
        .describe("ISO date string for the deadline"),
      subTasks: z
        .array(z.string())
        .optional()
        .describe("List of subtask titles to create"),
      canvasClassId: z
        .number()
        .optional()
        .describe("Canvas course ID if linking to Canvas content"),
      canvasContentId: z
        .number()
        .optional()
        .describe("Canvas content ID (assignment ID, page ID, etc.)"),
      canvasContentType: z
        .enum(["assignment", "page", "quiz", "discussion", "module_item"])
        .optional()
        .describe("Type of Canvas content being linked"),
    }),
    execute: async (input) => {
      if (!userId) return { error: "User not authenticated" };

      const subTasks: TodoSubTask[] | undefined = input.subTasks?.map(
        (title) => ({
          id: crypto.randomUUID(),
          title,
          checked: false,
        }),
      );

      const [created] = await db
        .insert(todo)
        .values({
          userId,
          title: input.title,
          description: input.description,
          dateType: input.dateType ?? "anytime",
          scheduledDate: input.scheduledDate
            ? new Date(input.scheduledDate)
            : null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          subTasks,
          canvasClassId: input.canvasClassId,
          canvasContentId: input.canvasContentId,
          canvasContentType: input.canvasContentType,
        })
        .returning();

      return {
        success: true,
        todo: {
          id: created.id,
          title: created.title,
          dateType: created.dateType,
          dueDate: created.dueDate?.toISOString(),
          subTaskCount: subTasks?.length ?? 0,
        },
      };
    },
  });

  // Update Todo Tool
  const updateTodoTool = tool({
    description:
      "Update an existing todo item. Can modify title, description, completion status, scheduling, or dates.",
    inputSchema: z.object({
      id: z.string().describe("The todo ID to update"),
      title: z.string().optional().describe("New title for the todo"),
      description: z.string().optional().describe("New description/notes"),
      checked: z
        .boolean()
        .optional()
        .describe("Mark as complete (true) or incomplete (false)"),
      dateType: z
        .enum(["calendar", "calendarEvening", "anytime", "someday"])
        .optional()
        .describe("Change the date type for scheduling"),
      scheduledDate: z
        .string()
        .optional()
        .describe("New ISO date string for when to work on this task"),
      dueDate: z
        .string()
        .optional()
        .describe("New ISO date string for the deadline"),
    }),
    execute: async (input) => {
      if (!userId) return { error: "User not authenticated" };

      const updateData: Partial<NewTodo> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.checked !== undefined) {
        updateData.checked = input.checked;
        updateData.completedAt = input.checked ? new Date() : null;
      }
      if (input.dateType !== undefined) updateData.dateType = input.dateType;
      if (input.scheduledDate !== undefined)
        updateData.scheduledDate = new Date(input.scheduledDate);
      if (input.dueDate !== undefined)
        updateData.dueDate = new Date(input.dueDate);

      const [updated] = await db
        .update(todo)
        .set(updateData)
        .where(and(eq(todo.id, input.id), eq(todo.userId, userId)))
        .returning();

      if (!updated) return { error: "Todo not found or access denied" };

      return {
        success: true,
        todo: {
          id: updated.id,
          title: updated.title,
          checked: updated.checked,
          dateType: updated.dateType,
        },
      };
    },
  });

  // Delete Todo Tool
  const deleteTodoTool = tool({
    description: "Delete a todo item permanently",
    inputSchema: z.object({
      id: z.string().describe("The todo ID to delete"),
    }),
    execute: async (input) => {
      if (!userId) return { error: "User not authenticated" };

      const result = await db
        .delete(todo)
        .where(and(eq(todo.id, input.id), eq(todo.userId, userId)))
        .returning();

      if (result.length === 0)
        return { error: "Todo not found or access denied" };

      return { success: true, message: "Todo deleted successfully" };
    },
  });

  // List Todos Tool
  const listTodosTool = tool({
    description:
      "Get the user's todos with optional filtering by view. Use this to see what tasks the user has.",
    inputSchema: z.object({
      view: z
        .enum(["today", "upcoming", "anytime", "someday", "all", "overdue"])
        .optional()
        .describe("Filter by view. Default is 'all'"),
      includeCompleted: z
        .boolean()
        .optional()
        .describe("Include completed todos. Default false."),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of todos to return. Default 20."),
    }),
    execute: async (input) => {
      if (!userId) return { error: "User not authenticated" };

      const view = input.view ?? "all";
      const limit = input.limit ?? 20;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let results;

      switch (view) {
        case "today":
          results = await db
            .select()
            .from(todo)
            .where(
              and(
                eq(todo.userId, userId),
                input.includeCompleted ? undefined : eq(todo.checked, false),
                or(
                  // Calendar/calendarEvening with scheduledDate today
                  and(
                    or(eq(todo.dateType, "calendar"), eq(todo.dateType, "calendarEvening")),
                    gte(todo.scheduledDate, today),
                    lt(todo.scheduledDate, tomorrow),
                  ),
                  // Overdue items
                  lt(todo.dueDate, tomorrow),
                ),
              ),
            )
            .orderBy(todo.dueDate, todo.scheduledDate)
            .limit(limit);
          break;

        case "upcoming":
          results = await db
            .select()
            .from(todo)
            .where(
              and(
                eq(todo.userId, userId),
                input.includeCompleted ? undefined : eq(todo.checked, false),
                gte(todo.scheduledDate, today),
              ),
            )
            .orderBy(todo.scheduledDate, todo.dueDate)
            .limit(limit);
          break;

        case "anytime":
          results = await db
            .select()
            .from(todo)
            .where(
              and(
                eq(todo.userId, userId),
                input.includeCompleted ? undefined : eq(todo.checked, false),
                eq(todo.dateType, "anytime"),
              ),
            )
            .orderBy(desc(todo.createdAt))
            .limit(limit);
          break;

        case "someday":
          results = await db
            .select()
            .from(todo)
            .where(
              and(
                eq(todo.userId, userId),
                input.includeCompleted ? undefined : eq(todo.checked, false),
                eq(todo.dateType, "someday"),
              ),
            )
            .orderBy(desc(todo.createdAt))
            .limit(limit);
          break;

        case "overdue":
          results = await db
            .select()
            .from(todo)
            .where(
              and(
                eq(todo.userId, userId),
                eq(todo.checked, false),
                lt(todo.dueDate, today),
              ),
            )
            .orderBy(todo.dueDate)
            .limit(limit);
          break;

        case "all":
        default:
          results = await db
            .select()
            .from(todo)
            .where(
              and(
                eq(todo.userId, userId),
                input.includeCompleted ? undefined : eq(todo.checked, false),
              ),
            )
            .orderBy(desc(todo.createdAt))
            .limit(limit);
          break;
      }

      return {
        todos: results.map((t) => ({
          id: t.id,
          title: t.title,
          checked: t.checked,
          dateType: t.dateType,
          dueDate: t.dueDate?.toISOString(),
          scheduledDate: t.scheduledDate?.toISOString(),
          subTasksCount: t.subTasks?.length ?? 0,
          subTasksCompleted: t.subTasks?.filter((st) => st.checked).length ?? 0,
          hasCanvasLink: !!(t.canvasContentId && t.canvasClassId),
        })),
        total: results.length,
        view,
      };
    },
  });

  return {
    createTodo: createTodoTool,
    updateTodo: updateTodoTool,
    deleteTodo: deleteTodoTool,
    listTodos: listTodosTool,
  };
}
