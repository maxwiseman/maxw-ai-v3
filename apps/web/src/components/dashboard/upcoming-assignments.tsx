"use client";

import { IconSchool } from "@tabler/icons-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import type { CanvasTodoItem } from "@/app/actions/dashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { humanReadableDate } from "@/lib/utils";

export function UpcomingAssignments({
  assignments,
}: {
  assignments: CanvasTodoItem[];
}) {
  return (
    <Card className="flex h-full flex-col gap-2 p-0">
      <CardHeader className="block p-4 pb-0">
        <CardTitle className="flex items-center gap-2 font-normal text-muted-foreground text-sm dark:font-medium">
          <IconSchool stroke={1.5} className="size-5" />
          Upcoming Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-2">
        {assignments.length > 0 ? (
          <div className="flex flex-col gap-3">
            {assignments.slice(0, 3).map((item) => (
              <div key={item.assignment.id} className="flex flex-col gap-1">
                <Link
                  href={item.html_url as ComponentProps<typeof Link>["href"]}
                  target="_blank"
                  className="line-clamp-1 font-medium text-sm hover:underline"
                >
                  {item.assignment.name}
                </Link>
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span>{item.assignment.points_possible} pts</span>
                  {item.assignment.due_at && (
                    <span>
                      {humanReadableDate(new Date(item.assignment.due_at))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">
            No upcoming assignments! Enjoy your break.
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
          <Link href="/classes">View all classes</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
