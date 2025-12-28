"use client";

import NumberFlow from "@number-flow/react";
import {
  type Icon,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconFlag,
  IconList,
  IconPlus,
  IconStar,
} from "@tabler/icons-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { SidebarExtension } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, humanReadableDate } from "@/lib/utils";
import { AnimatedCheckbox } from "./animated-checkbox";
import { type TodoListTask, useTodoList } from "./todo-store";

export default function TodoPage() {
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [expanded, setExpanded] = useState<string | undefined>();
  const data = useTodoList((state) => state.tasks);
  const addTask = useTodoList((state) => state.addTask);

  return (
    <div className="mx-auto w-full max-w-2xl px-8">
      <SidebarExtension>
        <div className="flex w-3xs flex-col gap-2 p-4">
          <Button className="justify-start shadow-none" variant="secondary">
            <IconStar className="text-muted-foreground" />
            Today
          </Button>
          <Button className="justify-start shadow-none" variant="ghost">
            <IconCalendar className="text-muted-foreground" />
            Upcoming
          </Button>
        </div>
      </SidebarExtension>
      <PageHeader className="px-0 pb-8">
        <PageHeaderContent>
          <PageHeaderTitle>Today</PageHeaderTitle>
          <PageHeaderDescription>
            <NumberFlow
              value={data.filter((item) => !item.checked).length}
              suffix=" tasks"
            />
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-1">
        {data
          .filter((item) => !item.checked)
          .map((todo) => (
            <TodoListItem
              key={todo.id}
              expanded={expanded === todo.id}
              onExpandChange={(state) => {
                if (state) setExpanded(todo.id);
                else setExpanded(undefined);
              }}
              id={todo.id}
            />
          ))}
        <Button
          className="-mx-3 justify-start p-0 text-muted-foreground hover:text-muted-foreground"
          variant="ghost"
          onClick={() => {
            addTask();
          }}
        >
          <IconPlus className="mx-0.5 size-5" />
          New task
        </Button>
      </div>
      {data.some((item) => item.checked) && (
        <>
          <Button
            onClick={() => {
              setCompletedExpanded((prev) => !prev);
            }}
            variant="ghost"
            className="hover:!bg-transparent -mx-3 mt-16 mb-2 text-muted-foreground"
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
            {data
              .filter((todo) => todo.checked)
              .map((todo) => (
                <TodoListItem
                  key={todo.id}
                  expanded={expanded === todo.id}
                  onExpandChange={(state) => {
                    if (state) setExpanded(todo.id);
                    else setExpanded(undefined);
                  }}
                  id={todo.id}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function TodoListItem({
  expanded = false,
  onExpandChange = () => null,
  id,
  ...props
}: React.ComponentProps<"div"> & {
  expanded?: boolean;
  onExpandChange?: (state: boolean) => void;
  id: string;
}) {
  const data = useTodoList((state) => state.tasks);
  const todo = data.find((val) => val.id === id)!;
  const setTask = useTodoList((state) => state.updateTask);
  const updateTask = useCallback(
    (newData: Partial<TodoListTask>) => {
      setTask(todo.id, newData);
    },
    [todo.id],
  );

  type LocalTask = Omit<TodoListTask, "checked" | "id">;
  const [localChecked, setLocalChecked] = useState(todo.checked);
  const [localTask, setLocalTask] = useState<LocalTask>(todo);
  const timerRef = useRef<NodeJS.Timeout>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    setLocalChecked(todo.checked);
    setLocalTask({
      title: todo.title,
      description: todo.description,
      subTasks: todo.subTasks,
    });
  }, [todo.checked, todo.title, todo.description, todo.subTasks]);

  useEffect(() => {
    if (expanded) {
      onExpandChange(false);
    }
  }, [todo.checked]);

  const debouncedUpdateTask = useCallback(
    (newData: Partial<TodoListTask>) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        updateTask(newData);
      }, 300);
    },
    [updateTask],
  );

  return (
    <Button
      asChild
      className={cn(
        "-mx-3 h-auto w-full max-w-full cursor-pointer flex-col items-start justify-start gap-0 border border-transparent p-0 transition-[background-color,box-shadow,border,margin,gap]",
        expanded &&
          "my-2 cursor-[unset] border-border bg-neutral-50 shadow-lg/3 first:mt-0 last:mb-0 hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-900",
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
                    updateTask({ checked: true });
                  }, 1000);
                } else {
                  // immediate update for uncheck
                  updateTask({ checked: false });
                }
              }}
              className="mx-[2px] border-neutral-300 shadow-none dark:border-neutral-700"
            />
          </label>
          <textarea
            onClick={(e) => {
              if (expanded) e.stopPropagation();
            }}
            value={localTask.title}
            onChange={(e) => {
              setLocalTask((prev) => ({ ...prev, title: e.target.value }));
              debouncedUpdateTask({ title: e.target.value });
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
            value={localTask.description}
            onChange={(e) => {
              setLocalTask((prev) => ({
                ...prev,
                description: e.target.value,
              }));
              debouncedUpdateTask({ description: e.target.value });
            }}
          />
          <TodoSubTaskList
            taskId={todo.id}
            subTasks={localTask.subTasks}
            onUpdate={(newSubTasks) => {
              setLocalTask((prev) => ({ ...prev, subTasks: newSubTasks }));
              debouncedUpdateTask({ subTasks: newSubTasks });
            }}
          />
          <div className="-ml-2 flex">
            <TodoCalendarButton
              value={todo.date}
              onValueChange={(newDate) => {
                updateTask({ date: newDate });
              }}
              icon={IconCalendar}
            />
            <TodoCalendarButton
              value={todo.dueDate}
              onValueChange={(newDate) => {
                updateTask({ dueDate: newDate });
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

function TodoSubTaskList({
  taskId,
  subTasks,
  onUpdate,
}: {
  taskId: string;
  subTasks?: TodoListTask["subTasks"];
  onUpdate: (newSubTasks: TodoListTask["subTasks"]) => void;
}) {
  const refs = useRef<Record<TodoListTask["id"], HTMLInputElement | null>>({});
  const [focused, setFocused] = useState("");

  useEffect(() => {
    refs.current[focused]?.focus();
  }, [focused]);

  useEffect(() => {
    if (subTasks && subTasks?.length > 0)
      refs.current[subTasks.findLast(() => true)!.id]?.focus();
  }, [subTasks?.length]);

  if (subTasks)
    return (
      <div className="flex flex-col divide-y [&>*]:first:pt-0">
        {subTasks &&
          subTasks.map((subTask, i) => (
            <div key={subTask.id} className="flex items-center gap-2 py-2">
              <AnimatedCheckbox
                checked={subTask.checked}
                onCheckedChange={(newVal) => {
                  const newChecked =
                    typeof newVal === "boolean" ? newVal : false;
                  onUpdate(
                    subTasks.map((s) =>
                      s.id === subTask.id ? { ...s, checked: newChecked } : s,
                    ),
                  );
                }}
                className="mx-[2px] size-4 border-neutral-300 shadow-none dark:border-neutral-700 [&>*]:size-3.5"
              />
              <input
                className="!outline-none"
                value={subTask.title}
                onChange={(e) => {
                  onUpdate(
                    subTasks.map((s) =>
                      s.id === subTask.id ? { ...s, title: e.target.value } : s,
                    ),
                  );
                }}
                ref={(el) => {
                  refs.current[subTask.id] = el;
                }}
                placeholder="Subtask"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    subTasks[subTasks.length - 1].title.length > 0
                  ) {
                    const newId = crypto.randomUUID();
                    onUpdate(
                      subTasks
                        ? [
                            ...subTasks,
                            { id: newId, title: "", checked: false },
                          ]
                        : [{ id: newId, title: "", checked: false }],
                    );
                    setFocused(newId);
                  } else if (
                    (e.key === "Delete" || e.key === "Backspace") &&
                    (e.target as HTMLInputElement).value === ""
                  ) {
                    onUpdate(subTasks.filter((val) => val.id !== subTask.id));
                    setFocused(subTasks[i - 1]?.id);
                    e.preventDefault();
                  }
                }}
              />
            </div>
          ))}
      </div>
    );
}

function TodoChecklistButton({ taskId }: { taskId: string }) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout>(null);
  const data = useTodoList((state) => state.tasks);
  const updateTask = useTodoList((state) => state.updateTask);
  const todo = data.find((val) => val.id === taskId)!;

  const handleChange = (value: string) => {
    setInputValue(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      updateTask(taskId, {
        subTasks: [
          {
            id: todo.subTasks?.[0]?.id ?? crypto.randomUUID(),
            title: value,
            checked: false,
          },
        ],
      });
    }, 300);
  };

  return (
    <InputGroup
      className={cn(
        "!m-0 !ring-0 !bg-transparent size-8 overflow-hidden border-0 pl-0 shadow-none outline-0 outline-border outline-solid transition-[background-color,width,outline,margin] has-hover:bg-accent dark:has-hover:bg-accent/50",
        expanded && "dark:!bg-input/30 !mx-2 w-auto outline",
      )}
    >
      <InputGroupAddon className="!m-0 p-0">
        <InputGroupButton
          onClick={() => {
            setExpanded((prev) => {
              return !prev;
            });
            if (!expanded)
              setTimeout(() => {
                inputRef.current?.focus();
              }, 50);
          }}
          variant="ghost"
          className="size-8 text-muted-foreground hover:bg-none dark:hover:bg-none"
        >
          <IconList />
        </InputGroupButton>
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        onChange={(e) => handleChange(e.target.value)}
        value={inputValue}
        className="!pl-0 w-24 font-normal text-sm"
        placeholder="Checklist"
      />
    </InputGroup>
    // <Button
    //   className="size-8 text-muted-foreground"
    //   size="icon"
    //   variant="ghost"
    // >
    //   <IconList />
    // </Button>
  );
}

function TodoCalendarButton({
  icon: Icon,
  value: date,
  onValueChange: setDate,
}: {
  icon?: Icon;
  value: Date | undefined;
  onValueChange: (newVal: Date | undefined) => void;
}) {
  const [displayDate, setDisplayDate] = useState("");

  useEffect(() => {
    if (date) setDisplayDate(humanReadableDate(date));
  }, [date]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "!p-2 h-8 w-8 max-w-8 justify-start gap-2 overflow-clip text-muted-foreground transition-[width,max-width]",
            date !== undefined && "w-auto max-w-max",
          )}
          size="sm"
          variant="ghost"
        >
          {Icon && <Icon />}
          {displayDate}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar selected={date} onSelect={setDate} mode="single" />
      </PopoverContent>
    </Popover>
  );
}
