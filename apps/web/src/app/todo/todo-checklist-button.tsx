"use client";

import { IconList } from "@tabler/icons-react";
import { useRef, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { useTodos, useUpdateTodo } from "./use-todos";

export function TodoChecklistButton({ taskId }: { taskId: string }) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const { data: todos = [] } = useTodos();
  const updateTodo = useUpdateTodo();
  const todo = todos.find((val) => val.id === taskId);

  const handleChange = (value: string) => {
    setInputValue(value);
    if (todo) {
      updateTodo(taskId, {
        subTasks: [
          {
            id: todo.subTasks?.[0]?.id ?? crypto.randomUUID(),
            title: value,
            checked: false,
          },
        ],
      });
    }
  };

  if (!todo) return null;

  return (
    <InputGroup
      className={cn(
        "m-0! size-8 overflow-hidden border-0 bg-transparent! pl-0 shadow-none outline-0 outline-border outline-solid ring-0! transition-[background-color,width,outline,margin] has-hover:bg-accent dark:has-hover:bg-accent/50",
        expanded && "mx-2! w-auto outline dark:bg-input/30!",
      )}
    >
      <InputGroupAddon className="m-0! p-0">
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
        className="w-24 pl-0! font-normal text-sm"
        placeholder="Checklist"
      />
    </InputGroup>
  );
}

