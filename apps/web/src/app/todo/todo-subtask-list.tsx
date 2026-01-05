"use client";

import { useEffect, useRef, useState } from "react";
import type { Todo } from "@/db/schema/todo";
import { AnimatedCheckbox } from "./animated-checkbox";

export function TodoSubTaskList({
  subTasks,
  onUpdate,
}: {
  subTasks: Todo["subTasks"];
  onUpdate: (newSubTasks: Todo["subTasks"]) => void;
}) {
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const [focused, setFocused] = useState("");

  useEffect(() => {
    refs.current[focused]?.focus();
  }, [focused]);

  useEffect(() => {
    if (subTasks && subTasks?.length > 0)
      refs.current[subTasks[subTasks.length - 1]!.id]?.focus();
  }, [subTasks?.length]);

  if (subTasks)
    return (
      <div className="flex flex-col divide-y *:first:pt-0">
        {subTasks?.map((subTask, i) => (
          <div key={subTask.id} className="flex items-center gap-2 py-2">
            <AnimatedCheckbox
              checked={subTask.checked}
              onCheckedChange={(newVal) => {
                const newChecked = typeof newVal === "boolean" ? newVal : false;
                onUpdate(
                  subTasks.map((s) =>
                    s.id === subTask.id ? { ...s, checked: newChecked } : s,
                  ),
                );
              }}
              className="mx-0.5 size-4 border-neutral-300 shadow-none *:size-3.5 dark:border-neutral-700"
            />
            <input
              className="w-full outline-none!"
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
                      ? [...subTasks, { id: newId, title: "", checked: false }]
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
