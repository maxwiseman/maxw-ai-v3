"use client";

import { IconPencil } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "@/app/dashboard-actions";
import { DashboardCard } from "@/app/dashboard-card";
import { DashboardHeader } from "@/app/dashboard-header";
import { RecentClasses } from "@/app/recent-classes";
import { StatusMessage } from "@/app/status-message";
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
          <StatusMessage />
        </DashboardCard>
        <UpcomingAssignments assignments={dashboardData?.assignments ?? []} />
        <TodoSummary />
        <RecentClasses courses={dashboardData?.courses ?? []} />
      </div>
    </div>
  );
}
