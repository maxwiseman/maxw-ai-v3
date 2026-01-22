/**
 * Todo Management Tools
 * Create, update, delete, and query user's todo items
 * Only callable via programmatic tool calling (code execution)
 */

import { tool } from "ai";
import { z } from "zod";
import {
  createTodo,
  deleteTodo,
  getAllTodosExceptLogbook,
  getAnytimeTodos,
  getLogbookTodos,
  getSomedayTodos,
  getTodayTodos,
  getUpcomingTodos,
  updateTodo,
} from "@/app/todo/todo-actions";
import type { NewTodo } from "@/db/schema/todo";

/**
 * Get todos based on filter
 * Returns different views of the user's todo list
 */
export const getTodosTool = tool({
  description:
    "Get user's todos filtered by view: 'today' (scheduled for today or overdue), 'upcoming' (scheduled in the future), 'anytime' (no date), 'someday' (later/maybe), 'active' (all uncompleted), or 'logbook' (completed items). Returns JSON string containing array of todo objects.",
  inputSchema: z.object({
    view: z
      .enum(["today", "upcoming", "anytime", "someday", "active", "logbook"])
      .describe(
        "Which view to fetch: today (due today or overdue), upcoming (future scheduled), anytime (no specific date), someday (maybe later), active (all uncompleted), logbook (completed)",
      ),
    limit: z
      .number()
      .optional()
      .describe("For logbook view only: limit number of results (default 50)"),
  }),
  execute: async ({ view, limit }) => {
    let todos: Awaited<ReturnType<typeof getTodayTodos>>;

    switch (view) {
      case "today":
        todos = await getTodayTodos();
        break;
      case "upcoming":
        todos = await getUpcomingTodos();
        break;
      case "anytime":
        todos = await getAnytimeTodos();
        break;
      case "someday":
        todos = await getSomedayTodos();
        break;
      case "active":
        todos = await getAllTodosExceptLogbook();
        break;
      case "logbook":
        todos = await getLogbookTodos(limit);
        break;
    }

    // Return as JSON string for consistency with other tools
    return JSON.stringify(todos);
  },
  providerOptions: {
    anthropic: {
      allowedCallers: ["code_execution_20250825"],
    },
  },
});

/**
 * Create a new todo
 */
export const createTodoTool = tool({
  description:
    "Create a new todo item for the user. Can optionally link to Canvas assignments, set due dates, scheduled dates, and add subtasks. Returns JSON string containing the created todo.",
  inputSchema: z.object({
    title: z.string().describe("The todo title/description"),
    description: z
      .string()
      .optional()
      .describe("Optional detailed description"),
    dateType: z
      .enum(["calendar", "calendarEvening", "anytime", "someday"])
      .optional()
      .describe(
        "When to work on it: calendar (specific date/time), calendarEvening (evening of date), anytime (no specific time), someday (later/maybe). Default: anytime",
      ),
    scheduledDate: z
      .string()
      .optional()
      .describe(
        "ISO date string for when to work on it (for calendar/calendarEvening types)",
      ),
    dueDate: z.string().optional().describe("ISO date string for deadline"),
    subTasks: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          checked: z.boolean(),
        }),
      )
      .optional()
      .describe("Array of subtask objects"),
    canvasContentType: z
      .enum(["assignment", "page", "quiz", "discussion"])
      .optional()
      .describe("Type of Canvas content this todo relates to"),
    canvasContentId: z
      .number()
      .optional()
      .describe("Canvas content ID (e.g., assignment ID)"),
    canvasClassId: z.number().optional().describe("Canvas class/course ID"),
  }),
  execute: async (input) => {
    // Convert ISO strings to Date objects
    const todoData: Omit<NewTodo, "userId" | "createdAt" | "updatedAt"> = {
      title: input.title,
      description: input.description,
      dateType: input.dateType || "anytime",
      scheduledDate: input.scheduledDate
        ? new Date(input.scheduledDate)
        : undefined,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      subTasks: input.subTasks,
      canvasContentType: input.canvasContentType,
      canvasContentId: input.canvasContentId,
      canvasClassId: input.canvasClassId,
    };

    const todo = await createTodo(todoData);

    if (!todo) {
      throw new Error("Failed to create todo: User not authenticated");
    }

    // Return as JSON string for consistency
    return JSON.stringify(todo);
  },
  providerOptions: {
    anthropic: {
      allowedCallers: ["code_execution_20250825"],
    },
  },
});

/**
 * Update an existing todo
 */
export const updateTodoTool = tool({
  description:
    "Update an existing todo item. Can update any field including title, dates, completion status, and subtasks. Returns JSON string containing the updated todo.",
  inputSchema: z.object({
    id: z.string().describe("The todo ID to update"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description"),
    checked: z.boolean().optional().describe("Mark as complete/incomplete"),
    dateType: z
      .enum(["calendar", "calendarEvening", "anytime", "someday"])
      .optional()
      .describe("Change the date type"),
    scheduledDate: z
      .string()
      .optional()
      .describe("ISO date string for new scheduled date"),
    dueDate: z.string().optional().describe("ISO date string for new due date"),
    subTasks: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          checked: z.boolean(),
        }),
      )
      .optional()
      .describe("Updated subtasks array"),
  }),
  execute: async ({ id, scheduledDate, dueDate, ...rest }) => {
    // Convert ISO strings to Date objects
    const updateData: Partial<Omit<NewTodo, "id" | "userId">> = {
      ...rest,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    };

    const todo = await updateTodo(id, updateData);

    if (!todo) {
      throw new Error("Failed to update todo: Not found or not authenticated");
    }

    // Return as JSON string for consistency
    return JSON.stringify(todo);
  },
  providerOptions: {
    anthropic: {
      allowedCallers: ["code_execution_20250825"],
    },
  },
});

/**
 * Delete a todo
 */
export const deleteTodoTool = tool({
  description:
    "Delete a todo item permanently. This cannot be undone. Returns JSON string with success status.",
  inputSchema: z.object({
    id: z.string().describe("The todo ID to delete"),
  }),
  execute: async ({ id }) => {
    const success = await deleteTodo(id);

    if (!success) {
      throw new Error("Failed to delete todo: Not found or not authenticated");
    }

    // Return as JSON string for consistency
    return JSON.stringify({ success: true, id });
  },
  providerOptions: {
    anthropic: {
      allowedCallers: ["code_execution_20250825"],
    },
  },
});
