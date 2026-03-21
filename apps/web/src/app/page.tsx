"use client";

import { IconPencil } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "@/app/dashboard-actions";
import { DashboardCard } from "@/app/dashboard-card";
import { DashboardHeader } from "@/app/dashboard-header";
import { RecentClasses } from "@/app/recent-classes";
import { TodoSummary } from "@/app/todo-summary";
import { UpcomingAssignments } from "@/app/upcoming-assignments";

export default function Home() {
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: getDashboardData,
  });

  return (
    <div className="mx-auto w-full px-8 py-8">
      <DashboardHeader />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          icon={IconPencil}
          title="Upcoming Assignments"
          actions={[{ text: "View todo list", href: "/todo" }]}
        >
          <span className="text-neutral-500 dark:text-neutral-400 [&>strong]:font-medium [&>strong]:text-foreground">
            You have a <strong>Bio test</strong> on Thursday, and a{" "}
            <strong>ToK assignment</strong> due Sunday night
          </span>
        </DashboardCard>
        <UpcomingAssignments assignments={dashboardData?.assignments ?? []} />
        <TodoSummary />
        <RecentClasses courses={dashboardData?.courses ?? []} />
      </div>
    </div>
  );
}
