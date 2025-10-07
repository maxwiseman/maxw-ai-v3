"use client";

import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { SidebarExtension } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  IconCalendar,
  IconFlag,
  IconList,
  IconStar,
  type Icon,
  type IconProps,
} from "@tabler/icons-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { useTodoList, type TodoListTask } from "./todo-store";

export default function TodoPage() {
  const [expanded, setExpanded] = useState<string | undefined>();
  const data = useTodoList((state) => state.tasks);

  return (
    <div className="max-w-2xl mx-auto w-full">
      <SidebarExtension>
        <div className="p-4 flex flex-col gap-2 w-3xs">
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
      <PageHeader className="px-0">
        <PageHeaderContent>
          <PageHeaderTitle>Today</PageHeaderTitle>
          <PageHeaderDescription>{data.length} tasks</PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-1">
        {data.map((todo) => (
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
    </div>
  );
}

function TodoListItem({
  expanded = false,
  onExpandChange = () => null,
  id,
}: {
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
    [todo.id]
  );

  return (
    <Button
      asChild
      className={cn(
        "w-full max-w-full flex-col justify-start items-start cursor-pointer p-0 -mx-3 h-auto border border-transparent gap-0 transition-[background-color,box-shadow,border,margin,gap]",
        expanded &&
          "bg-neutral-50 dark:bg-neutral-900 border-border shadow-lg/3 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-[unset] my-2 first:mt-0 last:mb-0"
      )}
      variant="ghost"
    >
      <div>
        <div
          onClick={() => {
            onExpandChange(!expanded);
          }}
          className={cn(
            "flex items-center cursor-pointer w-full gap-3 p-3 transition-[padding]",
            expanded && "pb-2"
          )}
        >
          <label
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="p-3 -m-3 -mr-1 pr-1 flex justify-center cursor-pointer"
          >
            <Checkbox
              checked={todo.checked}
              onCheckedChange={(checked) => {
                updateTask({
                  checked: typeof checked === "boolean" ? checked : false,
                });
              }}
              className="shadow-none border-neutral-300 dark:border-neutral-700 mx-[2px]"
            />
          </label>
          <textarea
            onClick={(e) => {
              if (expanded) e.stopPropagation();
            }}
            value={todo.title}
            onChange={(e) => {
              updateTask({ title: e.target.value });
            }}
            className={cn(
              "focus-visible:outline-none pointer-events-none field-sizing-content break-all resize-none pr-8",
              expanded && "pointer-events-auto"
            )}
          />
        </div>
        <div
          className={cn(
            "h-0 overflow-hidden transition-[height,padding] pl-11 w-full flex flex-col gap-3 pr-4",
            expanded && "h-auto pb-3"
          )}
        >
          <textarea
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="font-normal min-h-[2lh] field-sizing-content break-all text-muted-foreground w-full resize-none focus-visible:outline-none"
            placeholder="Notes"
            value={todo.description}
            onChange={(e) => {
              updateTask({ description: e.target.value });
            }}
          />
          <TodoSubTaskList taskId={todo.id} />
          <div className="flex -ml-2">
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
          </div>
        </div>
      </div>
    </Button>
  );
}

function TodoSubTaskList({ taskId }: { taskId: string }) {
  const refs = useRef<Record<TodoListTask["id"], HTMLInputElement | null>>({});
  const [focused, setFocused] = useState("");
  const tasks = useTodoList((state) => state.tasks);
  const updateSubTask = useTodoList((state) => state.updateSubTask);
  const updateTask = useTodoList((state) => state.updateTask);
  const task = tasks.find((val) => val.id === taskId);
  const subTasks = task?.subTasks;

  useEffect(() => {
    refs.current[focused]?.focus();
  }, [focused]);

  if (subTasks)
    return (
      <div className="flex flex-col divide-y [&>*]:first:pt-0">
        {subTasks &&
          subTasks.map((subTask, i) => (
            <div key={subTask.id} className="flex items-center gap-2 py-2">
              <Checkbox
                checked={subTask.checked}
                onCheckedChange={(newVal) => {
                  updateSubTask(taskId, subTask.id, {
                    checked: typeof newVal === "boolean" ? newVal : false,
                  });
                }}
                className="shadow-none border-neutral-300 dark:border-neutral-700 mx-[2px]"
              />
              <input
                className="!outline-none"
                value={subTask.title}
                onChange={(e) => {
                  updateSubTask(taskId, subTask.id, { title: e.target.value });
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
                    updateTask(taskId, {
                      subTasks: task.subTasks
                        ? [
                            ...task.subTasks,
                            { id: newId, title: "", checked: false },
                          ]
                        : [{ id: newId, title: "", checked: false }],
                    });
                    setFocused(newId);
                  } else if (
                    (e.key === "Delete" || e.key === "Backspace") &&
                    (e.target as HTMLInputElement).value === ""
                  ) {
                    updateTask(taskId, {
                      subTasks: task.subTasks?.filter(
                        (val) => val.id !== subTask.id
                      ),
                    });
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
  const data = useTodoList((state) => state.tasks);
  const updateTask = useTodoList((state) => state.updateTask);
  const todo = data.find((val) => val.id === taskId)!;

  return (
    <InputGroup
      className={cn(
        "size-8 pl-0 !m-0 border-0 !ring-0 outline-0 outline-solid shadow-none outline-border !bg-transparent has-hover:bg-accent dark:has-hover:bg-accent/50 overflow-hidden transition-[background-color,width,outline,margin]",
        expanded && "outline dark:!bg-input/30 w-auto !mx-2"
      )}
    >
      <InputGroupAddon className="p-0 !m-0">
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
        onChange={(e) => {
          setInputValue(e.target.value);
          updateTask(taskId, {
            subTasks: [
              {
                id: todo.subTasks?.[0]?.id ?? crypto.randomUUID(),
                title: e.target.value,
                checked: false,
              },
            ],
          });
        }}
        value={inputValue}
        className="!pl-0 text-sm w-24 font-normal"
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
  icon?: ForwardRefExoticComponent<IconProps & RefAttributes<Icon>>;
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
            "h-8 !p-2 gap-2 max-w-8 w-8 text-muted-foreground justify-start transition-[width,max-width] overflow-clip",
            date !== undefined && "w-auto max-w-max"
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
