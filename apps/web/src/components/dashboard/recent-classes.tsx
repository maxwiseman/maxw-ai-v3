"use client";

import { IconBooks } from "@tabler/icons-react";
import Link from "next/link";
import { DashboardCard } from "./dashboard-card";
import type { CanvasCourse } from "@/types/canvas";

export function RecentClasses({ courses }: { courses: CanvasCourse[] }) {
  return (
    <DashboardCard icon={IconBooks} title="Recent Classes" contentClassName="pt-2">
      {courses.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {courses.slice(0, 4).map((course) => (
            <Link
              key={course.id}
              href={`/classes/${course.id}`}
              className="group block"
            >
              <div className="rounded-md border bg-card p-3 transition-colors hover:bg-accent/50">
                <div className="line-clamp-1 font-medium text-sm group-hover:underline">
                  {course.name}
                </div>
                <div className="mt-1 line-clamp-1 text-muted-foreground text-xs">
                  {course.course_code}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">
          No classes found.
        </span>
      )}
    </DashboardCard>
  );
}
