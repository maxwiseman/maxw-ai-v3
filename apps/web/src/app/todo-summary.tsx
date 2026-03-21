"use client";

import { IconListCheck } from "@tabler/icons-react";
import { useTodos } from "@/app/todo/use-todos";
import { DashboardCard } from "./dashboard-card";

export function TodoSummary() {
  const { data: tasks = [] } = useTodos();
  const pendingTasks = tasks.filter((t) => !t.checked).slice(0, 3);

  return (
    <DashboardCard
      icon={IconListCheck}
      title="Tasks"
      actions={[{ text: "Go to list", href: "/todo" }]}
      contentClassName="pt-2"
    >
      {pendingTasks.length > 0 ? (
        <div className="flex flex-col gap-2">
          {pendingTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2">
              <div className="size-4 rounded-full border border-neutral-300 dark:border-neutral-700" />
              <span className="line-clamp-1 text-sm">
                {task.title || "Untitled task"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">
          No pending tasks. Good job!
        </span>
      )}
    </DashboardCard>
  );
}
