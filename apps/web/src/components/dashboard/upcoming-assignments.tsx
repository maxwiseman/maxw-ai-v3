"use client";

import { IconSchool } from "@tabler/icons-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import type { CanvasTodoItem } from "@/app/actions/dashboard";
import { DashboardCard } from "./dashboard-card";
import { humanReadableDate } from "@/lib/utils";

export function UpcomingAssignments({
  assignments,
}: {
  assignments: CanvasTodoItem[];
}) {
  return (
    <DashboardCard
      icon={IconSchool}
      title="Upcoming Assignments"
      actions={[{ text: "View all classes", href: "/classes" }]}
      contentClassName="pt-2"
    >
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
    </DashboardCard>
  );
}
