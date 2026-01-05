"use server";

import { and, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { type NewTodo, type Todo, todo } from "@/db/schema/todo";
import { auth } from "@/lib/auth";

// Helper to get authenticated user ID
async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

// CRUD Operations
export async function createTodo(
  input: Omit<NewTodo, "id" | "userId" | "createdAt" | "updatedAt">,
): Promise<Todo | null> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  const [created] = await db
    .insert(todo)
    .values({
      ...input,
      userId,
    })
    .returning();

  return created ?? null;
}

export async function updateTodo(
  id: string,
  input: Partial<Omit<NewTodo, "id" | "userId">>,
): Promise<Todo | null> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  // Handle completion timestamp
  const updateData = { ...input };
  if (input.checked === true && !input.completedAt) {
    updateData.completedAt = new Date();
  } else if (input.checked === false) {
    updateData.completedAt = null;
  }

  const [updated] = await db
    .update(todo)
    .set(updateData)
    .where(and(eq(todo.id, id), eq(todo.userId, userId)))
    .returning();

  return updated ?? null;
}

export async function deleteTodo(id: string): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  await db.delete(todo).where(and(eq(todo.id, id), eq(todo.userId, userId)));

  return true;
}

// Query Operations for Different Views
export async function getTodayTodos(): Promise<Todo[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return db
    .select()
    .from(todo)
    .where(
      and(
        eq(todo.userId, userId),
        eq(todo.checked, false),
        or(
          // Calendar/calendarEvening with scheduledDate today
          and(
            or(eq(todo.dateType, "calendar"), eq(todo.dateType, "calendarEvening")),
            gte(todo.scheduledDate, today),
            lt(todo.scheduledDate, tomorrow),
          ),
          // Overdue items (due before tomorrow)
          lt(todo.dueDate, tomorrow),
        ),
      ),
    )
    .orderBy(todo.dueDate, todo.scheduledDate);
}

export async function getUpcomingTodos(): Promise<Todo[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return db
    .select()
    .from(todo)
    .where(
      and(
        eq(todo.userId, userId),
        eq(todo.checked, false),
        gte(todo.scheduledDate, today),
      ),
    )
    .orderBy(todo.scheduledDate, todo.dueDate);
}

export async function getAnytimeTodos(): Promise<Todo[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  return db
    .select()
    .from(todo)
    .where(
      and(
        eq(todo.userId, userId),
        eq(todo.checked, false),
        eq(todo.dateType, "anytime"),
      ),
    )
    .orderBy(desc(todo.createdAt));
}

export async function getSomedayTodos(): Promise<Todo[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  return db
    .select()
    .from(todo)
    .where(
      and(
        eq(todo.userId, userId),
        eq(todo.checked, false),
        eq(todo.dateType, "someday"),
      ),
    )
    .orderBy(desc(todo.createdAt));
}

export async function getLogbookTodos(limit = 50): Promise<Todo[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  return db
    .select()
    .from(todo)
    .where(and(eq(todo.userId, userId), eq(todo.checked, true)))
    .orderBy(desc(todo.completedAt))
    .limit(limit);
}

export async function getAllTodos(): Promise<Todo[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  return db
    .select()
    .from(todo)
    .where(eq(todo.userId, userId))
    .orderBy(desc(todo.createdAt));
}

export async function getAllTodosExceptLogbook(): Promise<Todo[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  return db
    .select()
    .from(todo)
    .where(and(eq(todo.userId, userId), eq(todo.checked, false)))
    .orderBy(todo.dueDate, todo.scheduledDate, desc(todo.createdAt));
}

// Canvas-linked todo queries
export async function getTodosForAssignment(
  canvasClassId: number,
  canvasContentId: number,
): Promise<Todo[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  return db
    .select()
    .from(todo)
    .where(
      and(
        eq(todo.userId, userId),
        eq(todo.canvasClassId, canvasClassId),
        eq(todo.canvasContentId, canvasContentId),
      ),
    );
}
