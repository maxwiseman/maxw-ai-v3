/** biome-ignore-all lint/a11y/noLabelWithoutControl: It's OK */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: It's OK */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: It's OK */
"use client";

import { IconCalendar, IconFlag } from "@tabler/icons-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Todo } from "@/db/schema/todo";
import { cn } from "@/lib/utils";
import { AnimatedCheckbox } from "./animated-checkbox";
import { TodoCalendarButton, TodoDatePicker } from "./todo-calendar-button";
import { TodoChecklistButton } from "./todo-checklist-button";
import { TodoSubTaskList } from "./todo-subtask-list";
import { useTodos, useUpdateTodo } from "./use-todos";

export function TodoListItem({
  expanded = false,
  onExpandChange = () => null,
  updateTab,
  id,
  ...props
}: React.ComponentProps<"div"> & {
  expanded?: boolean;
  onExpandChange?: (state: boolean) => void;
  updateTab?: (
    next: Pick<
      Todo,
      | "id"
      | "checked"
      | "completedAt"
      | "dateType"
      | "scheduledDate"
      | "dueDate"
    >,
  ) => void;
  id: string;
}) {
  const { data: todos = [] } = useTodos();
  const todo = todos.find((val) => val.id === id);
  const updateTodo = useUpdateTodo();

  // Local state for immediate UI updates (hooks handle DB sync)
  type LocalTask = Pick<Todo, "title" | "description" | "subTasks">;
  const [localChecked, setLocalChecked] = useState(todo?.checked ?? false);
  const [localTask, setLocalTask] = useState<LocalTask>({
    title: todo?.title ?? "",
    description: todo?.description ?? null,
    subTasks: todo?.subTasks ?? null,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!todo) return;

    // Avoid update loops when `todo` is a new object each render (e.g. cache hydration).
    // Only sync local state when the underlying fields actually change.
    setLocalChecked((prev) => (prev === todo.checked ? prev : todo.checked));
    setLocalTask((prev) => {
      const next: LocalTask = {
        title: todo.title ?? "",
        description: todo.description ?? null,
        subTasks: todo.subTasks ?? null,
      };

      if (
        prev.title === next.title &&
        prev.description === next.description &&
        JSON.stringify(prev.subTasks) === JSON.stringify(next.subTasks)
      ) {
        return prev;
      }

      return next;
    });
  }, [todo?.checked, todo?.title, todo?.description, todo?.subTasks]);

  useEffect(() => {
    if (expanded && todo?.checked) {
      onExpandChange(false);
    }
  }, [todo, expanded, onExpandChange]);

  if (!todo) return null;

  return (
    <Button
      asChild
      className={cn(
        "-mx-3 h-auto w-full max-w-full cursor-pointer flex-col items-start justify-start gap-0 border border-transparent p-0 transition-[background-color,box-shadow,border,margin,gap]",
        expanded &&
          "my-2 cursor-[unset] border-border bg-card shadow-lg/3 first:mt-0 last:mb-0 hover:bg-card dark:bg-card dark:hover:bg-card",
      )}
      variant="ghost"
    >
      <div {...props}>
        <div
          onClick={() => {
            onExpandChange(!expanded);
          }}
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 p-3 transition-[padding]",
            expanded && "pb-2",
          )}
        >
          <label
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="-m-3 -mr-1 flex cursor-pointer justify-center p-3 pr-1"
          >
            <AnimatedCheckbox
              checked={localChecked}
              onCheckedChange={(checked) => {
                const newChecked =
                  typeof checked === "boolean" ? checked : false;
                setLocalChecked(newChecked);
                if (timerRef.current) clearTimeout(timerRef.current);
                if (newChecked) {
                  // delay update for check
                  timerRef.current = setTimeout(() => {
                    updateTodo(id, { checked: true });
                  }, 1000);
                } else {
                  // immediate update for uncheck
                  updateTodo(id, { checked: false });
                }
              }}
              className="mx-0.5 border-neutral-300 shadow-none dark:border-neutral-700"
            />
          </label>
          <textarea
            onClick={(e) => {
              if (expanded) e.stopPropagation();
            }}
            value={localTask.title ?? ""}
            onChange={(e) => {
              setLocalTask((prev) => ({ ...prev, title: e.target.value }));
              updateTodo(id, { title: e.target.value });
            }}
            className={cn(
              "field-sizing-content pointer-events-none min-w-24 resize-none break-all pr-8 focus-visible:outline-none",
              expanded && "pointer-events-auto",
            )}
            placeholder="Title"
          />
        </div>
        <div
          className={cn(
            "flex h-0 w-full flex-col gap-3 overflow-hidden pr-4 pl-11 transition-[height,padding]",
            expanded && "h-auto pb-3",
          )}
        >
          <textarea
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="field-sizing-content min-h-[2lh] w-full resize-none break-all font-normal text-muted-foreground focus-visible:outline-none"
            placeholder="Notes"
            value={localTask.description ?? ""}
            onChange={(e) => {
              const value = e.target.value || null;
              setLocalTask((prev) => ({
                ...prev,
                description: value,
              }));
              updateTodo(id, { description: value });
            }}
          />
          {localTask.subTasks && (
            <TodoSubTaskList
              subTasks={localTask.subTasks}
              onUpdate={(newSubTasks) => {
                setLocalTask((prev) => ({ ...prev, subTasks: newSubTasks }));
                updateTodo(id, { subTasks: newSubTasks });
              }}
            />
          )}
          <div className="-ml-2 flex">
            <TodoDatePicker
              dateType={todo.dateType}
              scheduledDate={todo.scheduledDate}
              onValueChange={(dateType, scheduledDate) => {
                updateTodo(id, { dateType, scheduledDate });
                updateTab?.({
                  id,
                  checked: todo.checked,
                  completedAt: todo.completedAt,
                  dateType,
                  scheduledDate,
                  dueDate: todo.dueDate,
                });
              }}
              icon={IconCalendar}
            />
            <TodoCalendarButton
              value={todo.dueDate ?? undefined}
              onValueChange={(newDate) => {
                const dueDate = newDate ?? null;
                updateTodo(id, { dueDate });
                updateTab?.({
                  id,
                  checked: todo.checked,
                  completedAt: todo.completedAt,
                  dateType: todo.dateType,
                  scheduledDate: todo.scheduledDate,
                  dueDate,
                });
              }}
              icon={IconFlag}
            />
            {(!todo.subTasks || todo.subTasks?.length === 0) && (
              <TodoChecklistButton taskId={id} />
            )}
            {process.env.NODE_ENV === "development" && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(id);
                }}
                className="h-8 w-auto px-2 text-muted-foreground"
              >
                {id.slice(0, 5)}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Button>
  );
}
