"use client";

import NumberFlow from "@number-flow/react";
import {
  type Icon,
  IconArchive,
  IconCalendar,
  IconChecklist,
  IconChevronDown,
  IconPlus,
  IconStack2,
  IconStar,
} from "@tabler/icons-react";
import { isAfter, isBefore, isDate, isSameDay, startOfDay } from "date-fns";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { SidebarExtension } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import type { Todo } from "@/db/schema/todo";
import { cn } from "@/lib/utils";
import { TodoListItem } from "./todo-list-item";
import { useCreateTodo, useTodos } from "./use-todos";

const tabs = {
  today: {
    icon: IconStar,
    label: "Today",
  },
  upcoming: {
    icon: IconCalendar,
    label: "Upcoming",
  },
  anytime: {
    icon: IconStack2,
    label: "Anytime",
  },
  someday: {
    icon: IconArchive,
    label: "Someday",
  },
  logbook: {
    icon: IconChecklist,
    label: "Logbook",
    description: "Tasks you've completed",
  },
} as const satisfies Record<
  string,
  { icon: Icon; label: string; description?: string }
>;

export default function TodoPage() {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringEnum<keyof typeof tabs>(
      Object.keys(tabs) as (keyof typeof tabs)[],
    ).withDefault(Object.keys(tabs)[0] as keyof typeof tabs),
  );
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [expanded, setExpanded] = useState<string | undefined>();

  const defaultDateTypeForTab:
    | "calendar"
    | "calendarEvening"
    | "anytime"
    | "someday"
    | undefined =
    tab === "today"
      ? "calendar"
      : tab === "upcoming"
        ? "calendar"
        : tab === "someday"
          ? "someday"
          : tab === "anytime"
            ? "anytime"
            : undefined;

  const defaultScheduledDateForTab = (() => {
    if (tab === "today") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }

    if (tab === "upcoming") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 1);
      return d;
    }

    return undefined;
  })();

  const { data: todos = [], isPending } = useTodos();
  const createTodo = useCreateTodo();
  const selectedTab = tabs[tab];

  const filteredTodos = filterTodos(todos, tab);
  const todoCount = filteredTodos.filter((item) => !item.checked).length;

  const updateTabForTodo = (
    todo: Pick<
      Todo,
      | "id"
      | "checked"
      | "completedAt"
      | "dateType"
      | "scheduledDate"
      | "dueDate"
    >,
  ) => {
    setTab(classifyTodo(todo as Todo));
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-8">
      <SidebarExtension>
        <div className="flex w-3xs flex-col gap-2 p-4">
          {(
            Object.entries(tabs) as Array<
              [keyof typeof tabs, (typeof tabs)[keyof typeof tabs]]
            >
          ).map(([key, tabData]) => (
            <Button
              key={key}
              onClick={() => {
                setExpanded(undefined);
                setTab(key);
              }}
              className="justify-start shadow-none"
              variant={tab === key ? "secondary" : "ghost"}
            >
              <tabData.icon className="text-muted-foreground" />
              {tabData.label}
            </Button>
          ))}
        </div>
      </SidebarExtension>

      <PageHeader className="px-0 pb-8">
        <PageHeaderContent>
          <PageHeaderTitle>{selectedTab.label}</PageHeaderTitle>
          <PageHeaderDescription>
            {/* @ts-expect-error */}
            {selectedTab.description ?? (
              <NumberFlow
                value={todoCount}
                suffix={todoCount > 1 ? " tasks" : " task"}
              />
            )}
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-1">
        {isPending ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <>
            {filteredTodos
              .filter((item) => !item.checked)
              .map((todo) => (
                <TodoListItem
                  key={todo.id}
                  expanded={expanded === todo.id}
                  onExpandChange={(state) => {
                    if (state) setExpanded(todo.id);
                    else setExpanded(undefined);
                  }}
                  updateTab={updateTabForTodo}
                  id={todo.id}
                />
              ))}
            <Button
              className="-mx-3 justify-start p-0 text-muted-foreground hover:text-muted-foreground"
              variant="ghost"
              onClick={() => {
                const id = createTodo({
                  defaultDateType: defaultDateTypeForTab,
                  scheduledDate: defaultScheduledDateForTab,
                });
                setExpanded(id);
              }}
            >
              <IconPlus className="mx-0.5 size-5" />
              New task
            </Button>
          </>
        )}
      </div>
      {filteredTodos.some((item) => item.checked) && (
        <>
          <Button
            onClick={() => {
              setCompletedExpanded((prev) => !prev);
            }}
            variant="ghost"
            className="-mx-3 mt-16 mb-2 text-muted-foreground hover:bg-transparent!"
          >
            <IconChevronDown
              className={cn(
                "size-5 transition-[rotate]",
                completedExpanded && "rotate-180",
              )}
            />
            {completedExpanded ? "Hide completed" : "Show completed"}
          </Button>
          <div
            className={cn(
              "flex h-0 flex-col gap-1 overflow-y-clip overflow-x-visible transition-[height]",
              completedExpanded && "h-auto",
            )}
          >
            {filteredTodos
              .filter((todo) => todo.checked)
              .map((todo) => (
                <TodoListItem
                  key={todo.id}
                  expanded={expanded === todo.id}
                  onExpandChange={(state) => {
                    if (state) setExpanded(todo.id);
                    else setExpanded(undefined);
                  }}
                  updateTab={updateTabForTodo}
                  id={todo.id}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function isToday(date: Date | null): boolean {
  if (!isDate(date)) return false;
  return isSameDay(date, new Date());
}

function isFuture(date: Date | null): boolean {
  if (!isDate(date)) return false;

  // "Upcoming" should mean strictly after today (not today, not past).
  // This matches classifyTodo usage (today-or-past handled separately).
  return isAfter(date, startOfDay(new Date()));
}

function isPast(date: Date | null): boolean {
  if (!isDate(date)) return false;

  // "Past" means before the start of today (i.e. overdue).
  return isBefore(date, startOfDay(new Date()));
}

function filterTodos(todos: Todo[], tab: keyof typeof tabs) {
  return todos.filter((todo) => classifyTodo(todo) === tab);
}

function classifyTodo(todo: Todo): keyof typeof tabs {
  // Checked todos go to logbook first (highest priority)
  if (todo.checked) {
    if (isToday(todo.completedAt)) return "today";
    return "logbook";
  }

  // Anytime todos
  if (todo.dateType === "anytime") {
    return "anytime";
  }

  // Someday todos
  if (todo.dateType === "someday") {
    return "someday";
  }

  // Calendar/calendarEvening todos
  if (todo.dateType === "calendar" || todo.dateType === "calendarEvening") {
    // Today or overdue (past scheduled date, or scheduled today)
    if (isToday(todo.scheduledDate) || isPast(todo.scheduledDate)) {
      return "today";
    }

    // Upcoming (future scheduled date)
    if (isFuture(todo.scheduledDate)) {
      return "upcoming";
    }
  }

  // Check for due today or overdue due dates
  if (isToday(todo.dueDate) || isPast(todo.dueDate)) {
    return "today";
  }

  // If no match, default to anytime
  return "anytime";
}
