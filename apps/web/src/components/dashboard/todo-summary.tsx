"use client";

import { IconListCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useTodoList } from "@/app/todo/todo-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function TodoSummary() {
  const tasks = useTodoList((state) => state.tasks);
  const pendingTasks = tasks.filter((t) => !t.checked).slice(0, 3);

  return (
    <Card className="flex h-full flex-col gap-2 p-0">
      <CardHeader className="block p-4 pb-0">
        <CardTitle className="flex items-center gap-2 font-normal text-muted-foreground text-sm dark:font-medium">
          <IconListCheck stroke={1.5} className="size-5" />
          Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-2">
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
      </CardContent>
      <CardFooter className="justify-between p-4 pt-0 pb-3">
        <Button
          className="-my-1 -mx-2 h-auto p-1 px-2 font-normal text-neutral-400 hover:bg-transparent! hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400"
          size="sm"
          variant="ghost"
          asChild
        >
          <Link href="/todo">Go to list</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
