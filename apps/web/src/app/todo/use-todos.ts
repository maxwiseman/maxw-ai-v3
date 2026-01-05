"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { NewTodo, Todo, TodoSubTask } from "@/db/schema/todo";
import {
  createTodo,
  deleteTodo,
  getAllTodosExceptLogbook,
  getLogbookTodos,
  updateTodo,
} from "./todo-actions";

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  // React Query persistence (localStorage) restores Dates as strings.
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  return null;
}

function hydrateTodoDates(t: Todo): Todo {
  const createdAt = toDateOrNull(t.createdAt);
  const updatedAt = toDateOrNull(t.updatedAt);

  return {
    ...t,
    scheduledDate: toDateOrNull(t.scheduledDate),
    dueDate: toDateOrNull(t.dueDate),
    completedAt: toDateOrNull(t.completedAt),
    createdAt: createdAt ?? new Date(),
    updatedAt: updatedAt ?? new Date(),
  };
}

function hydrateTodosDates(todos: Todo[]): Todo[] {
  return todos.map(hydrateTodoDates);
}

function mergeUpdate(
  prev: Partial<Omit<NewTodo, "id" | "userId" | "createdAt" | "updatedAt">>,
  next: Partial<Omit<NewTodo, "id" | "userId" | "createdAt" | "updatedAt">>,
) {
  return { ...prev, ...next };
}

function getDebounceMsForUpdate(
  input: Partial<Omit<NewTodo, "id" | "userId" | "createdAt" | "updatedAt">>,
) {
  // Typing is the highest-frequency operation. Give it a slightly longer debounce
  // to reduce the likelihood of overlapping syncs under network latency.
  if (input.title !== undefined || input.description !== undefined) return 750;
  return 300;
}

// Track todos that haven't been saved to DB yet
const pendingTodos = new Set<string>();

// Debounce timers per todo ID
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Coalesce updates per todo ID so rapid successive changes become a single payload.
const debouncedUpdates = new Map<
  string,
  Partial<Omit<NewTodo, "id" | "userId" | "createdAt" | "updatedAt">>
>();

// Track what state we're syncing for each todo to prevent race conditions
// Maps todo ID to a snapshot of the state when sync was initiated
const syncSnapshots = new Map<
  string,
  {
    title: string;
    description: string | null;
    checked: boolean;
    dateType: "calendar" | "calendarEvening" | "anytime" | "someday" | null;
    scheduledDate: Date | null;
    dueDate: Date | null;
    subTasks: TodoSubTask[] | null;
    updatedAt: Date;
  }
>();

// Query keys
const TODOS_QUERY_KEY = ["todos"] as const;
const LOGBOOK_QUERY_KEY = ["todos", "logbook"] as const;

/**
 * Hook to fetch all active todos (excluding completed)
 */
export function useTodos() {
  return useQuery({
    queryKey: TODOS_QUERY_KEY,
    queryFn: getAllTodosExceptLogbook,
    select: (todos) => hydrateTodosDates(todos),
    staleTime: 0,
  });
}

/**
 * Hook to fetch completed todos (logbook)
 */
export function useLogbook(limit?: number) {
  return useQuery({
    queryKey: [...LOGBOOK_QUERY_KEY, limit] as const,
    queryFn: ({ queryKey }) => {
      const [, , queryLimit] = queryKey;
      return getLogbookTodos(queryLimit);
    },
    select: (todos) => hydrateTodosDates(todos),
  });
}

/**
 * Hook to create a new todo.
 *
 * Default behavior: cache-only (optimistic), marked as "pending" until later edits sync it.
 * Optional behavior: immediately insert into DB (still updates cache first).
 *
 * Returns a function that creates a todo and returns its ID.
 */
export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useCallback(
    async (
      input?: Partial<
        Omit<NewTodo, "id" | "userId" | "createdAt" | "updatedAt">
      > & {
        /**
         * If `dateType` isn't explicitly provided, this will be used as the default.
         * Useful for creating a todo from a specific tab (e.g. Today/Upcoming/Someday).
         */
        defaultDateType?: NonNullable<NewTodo["dateType"]>;

        /**
         * If true, create the todo in the DB immediately.
         * Defaults to false (cache-only).
         */
        insertIntoDb?: boolean;
      },
    ) => {
      const id = crypto.randomUUID();
      const now = new Date();

      const resolvedDateType =
        input?.dateType ?? input?.defaultDateType ?? "anytime";

      // Mark as pending by default (will be cleared if/when DB insert succeeds)
      pendingTodos.add(id);

      // Optimistically add to cache
      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old = []) => {
        // Using placeholder since userId will be set by server response
        const todoForCache: Todo = {
          id,
          userId: "pending", // Placeholder, will be replaced by server
          title: input?.title ?? "",
          description: input?.description ?? null,
          checked: input?.checked ?? false,
          dateType: resolvedDateType,
          scheduledDate: input?.scheduledDate ?? null,
          dueDate: input?.dueDate ?? null,
          subTasks: input?.subTasks ?? null,
          canvasContentType: input?.canvasContentType ?? null,
          canvasContentId: input?.canvasContentId ?? null,
          canvasClassId: input?.canvasClassId ?? null,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        return [...old, todoForCache];
      });

      if (input?.insertIntoDb) {
        const createPayload: Omit<
          NewTodo,
          "userId" | "createdAt" | "updatedAt"
        > = {
          id,
          title: input?.title ?? "",
          description: input?.description ?? null,
          checked: input?.checked ?? false,
          dateType: resolvedDateType,
          scheduledDate: input?.scheduledDate ?? null,
          dueDate: input?.dueDate ?? null,
          subTasks: input?.subTasks ?? null,
          canvasContentType: input?.canvasContentType ?? null,
          canvasContentId: input?.canvasContentId ?? null,
          canvasClassId: input?.canvasClassId ?? null,
          completedAt: null,
        };

        const created = await createTodo(createPayload);

        if (created) {
          pendingTodos.delete(id);

          // Replace cache item with server result (preserving client-generated ID)
          queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old = []) =>
            old.map((t) => (t.id === id ? created : t)),
          );
        } else {
          // If creation failed, remove the optimistic item so we don't get stuck in "pending"
          pendingTodos.delete(id);
          queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old = []) =>
            old.filter((t) => t.id !== id),
          );
        }
      }

      return id;
    },
    [queryClient],
  );
}

/**
 * Hook to update a todo with debounced DB sync
 * Returns a function that immediately updates the cache and debounces DB sync
 */
export function useUpdateTodo() {
  const queryClient = useQueryClient();

  const syncToDb = useCallback(
    async (
      id: string,
      input: Partial<
        Omit<NewTodo, "id" | "userId" | "createdAt" | "updatedAt">
      >,
    ) => {
      const isPending = pendingTodos.has(id);

      // Get current todo from cache to merge with
      const currentTodos =
        queryClient.getQueryData<Todo[]>(TODOS_QUERY_KEY) ?? [];
      const currentTodo = currentTodos.find((t) => t.id === id);

      if (!currentTodo) return;

      // Capture snapshot of current state before syncing
      const snapshot = {
        title: currentTodo.title ?? "",
        description: currentTodo.description,
        checked: currentTodo.checked,
        dateType: currentTodo.dateType,
        scheduledDate: currentTodo.scheduledDate,
        dueDate: currentTodo.dueDate,
        subTasks: currentTodo.subTasks,
        updatedAt: currentTodo.updatedAt,
      };
      syncSnapshots.set(id, snapshot);

      if (isPending) {
        // First update for a pending todo - create it in DB.
        // Important:
        // - pass the client-generated `id` so it stays stable (prevents UI collapse/un-expand on sync)
        // - send the *current full todo state* (not just the incremental patch), otherwise defaults like
        //   dateType/scheduledDate can be lost and the item can "jump" tabs after the first edit.
        const createPayload: Omit<
          NewTodo,
          "userId" | "createdAt" | "updatedAt"
        > = {
          id,
          title: currentTodo.title,
          description: currentTodo.description,
          checked: currentTodo.checked,
          dateType: currentTodo.dateType,
          scheduledDate: currentTodo.scheduledDate,
          dueDate: currentTodo.dueDate,
          subTasks: currentTodo.subTasks,
          canvasContentType: currentTodo.canvasContentType,
          canvasContentId: currentTodo.canvasContentId,
          canvasClassId: currentTodo.canvasClassId,
          completedAt: currentTodo.completedAt,
        };

        const created = await createTodo(createPayload);
        if (created) {
          // Remove from pending set
          pendingTodos.delete(id);
          // Only update cache if it hasn't changed since we sent the request
          queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old = []) => {
            const current = old.find((t) => t.id === id);
            const savedSnapshot = syncSnapshots.get(id);
            syncSnapshots.delete(id);

            // If cache has been updated since we sent the request, skip this update
            if (
              current &&
              savedSnapshot &&
              (current.title !== savedSnapshot.title ||
                current.description !== savedSnapshot.description ||
                current.checked !== savedSnapshot.checked ||
                current.dateType !== savedSnapshot.dateType ||
                (current.scheduledDate?.getTime() ?? null) !==
                  (savedSnapshot.scheduledDate?.getTime() ?? null) ||
                (current.dueDate?.getTime() ?? null) !==
                  (savedSnapshot.dueDate?.getTime() ?? null) ||
                JSON.stringify(current.subTasks) !==
                  JSON.stringify(savedSnapshot.subTasks))
            ) {
              return old; // Cache is newer, don't overwrite
            }

            return old.map((t) => (t.id === id ? created : t));
          });
        } else {
          // Creation failed (e.g., authentication failure) - clean up pending todo
          pendingTodos.delete(id);
          syncSnapshots.delete(id);
          queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old = []) =>
            old.filter((t) => t.id !== id),
          );
        }
      } else {
        // Update existing todo
        const updated = await updateTodo(id, input);
        if (updated) {
          // Only update cache if it hasn't changed since we sent the request
          queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old = []) => {
            const current = old.find((t) => t.id === id);
            const savedSnapshot = syncSnapshots.get(id);
            syncSnapshots.delete(id);

            // If cache has been updated since we sent the request, skip this update
            if (
              current &&
              savedSnapshot &&
              (current.title !== savedSnapshot.title ||
                current.description !== savedSnapshot.description ||
                current.checked !== savedSnapshot.checked ||
                current.dateType !== savedSnapshot.dateType ||
                (current.scheduledDate?.getTime() ?? null) !==
                  (savedSnapshot.scheduledDate?.getTime() ?? null) ||
                (current.dueDate?.getTime() ?? null) !==
                  (savedSnapshot.dueDate?.getTime() ?? null) ||
                JSON.stringify(current.subTasks) !==
                  JSON.stringify(savedSnapshot.subTasks))
            ) {
              return old; // Cache is newer, don't overwrite
            }

            return old.map((t) => (t.id === id ? updated : t));
          });
        }
      }
    },
    [queryClient],
  );

  return useCallback(
    (
      id: string,
      input: Partial<
        Omit<NewTodo, "id" | "userId" | "createdAt" | "updatedAt">
      >,
    ) => {
      // Immediately update cache optimistically
      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old = []) => {
        const currentTodo = old.find((t) => t.id === id);
        if (!currentTodo) return old;

        const updatedTodo: Todo = {
          ...currentTodo,
          ...input,
          updatedAt: new Date(),
          completedAt:
            input.checked === true
              ? new Date()
              : input.checked === false
                ? null
                : currentTodo.completedAt,
        };

        return old.map((t) => (t.id === id ? updatedTodo : t));
      });

      // Debounce DB sync (coalesced per-todo)
      const existingTimer = debounceTimers.get(id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const existingUpdate = debouncedUpdates.get(id) ?? {};
      debouncedUpdates.set(id, mergeUpdate(existingUpdate, input));

      const debounceMs = getDebounceMsForUpdate(input);

      const timer = setTimeout(() => {
        const merged = debouncedUpdates.get(id) ?? input;
        debouncedUpdates.delete(id);
        syncToDb(id, merged);
        debounceTimers.delete(id);
      }, debounceMs);

      debounceTimers.set(id, timer);
    },
    [queryClient, syncToDb],
  );
}

/**
 * Hook to delete a todo
 * Returns a mutation function with optimistic cache removal
 */
export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // If pending, just remove from cache
      if (pendingTodos.has(id)) {
        pendingTodos.delete(id);
        return;
      }
      // Otherwise delete from DB
      await deleteTodo(id);
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: LOGBOOK_QUERY_KEY });

      // Snapshot previous value
      const previousTodos = queryClient.getQueryData<Todo[]>(TODOS_QUERY_KEY);
      const previousLogbook =
        queryClient.getQueryData<Todo[]>(LOGBOOK_QUERY_KEY);

      // Optimistically remove from cache
      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old = []) =>
        old.filter((t) => t.id !== id),
      );
      queryClient.setQueryData<Todo[]>(LOGBOOK_QUERY_KEY, (old = []) =>
        old.filter((t) => t.id !== id),
      );

      // Clear any pending debounce timers
      const timer = debounceTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        debounceTimers.delete(id);
      }

      return { previousTodos, previousLogbook };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousTodos) {
        queryClient.setQueryData(TODOS_QUERY_KEY, context.previousTodos);
      }
      if (context?.previousLogbook) {
        queryClient.setQueryData(LOGBOOK_QUERY_KEY, context.previousLogbook);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: LOGBOOK_QUERY_KEY });
    },
  });
}

export type { TodoSubTask } from "@/db/schema/todo";
