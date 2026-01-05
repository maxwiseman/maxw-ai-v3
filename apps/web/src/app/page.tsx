"use client";

import { IconPencil } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "@/app/actions/dashboard";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RecentClasses } from "@/components/dashboard/recent-classes";
import { TodoSummary } from "@/components/dashboard/todo-summary";
import { UpcomingAssignments } from "@/components/dashboard/upcoming-assignments";

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
