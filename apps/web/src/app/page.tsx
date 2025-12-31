"use client";

import { type Icon, IconPencil } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ComponentProps } from "react";
import { getDashboardData } from "@/app/actions/dashboard";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RecentClasses } from "@/components/dashboard/recent-classes";
import { TodoSummary } from "@/components/dashboard/todo-summary";
import { UpcomingAssignments } from "@/components/dashboard/upcoming-assignments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

function DashboardCard({
  children,
  icon: Icon,
  actions,
  title,
}: {
  children?: React.ReactNode;
  icon?: Icon;
  actions?: {
    text: string;
    variant?: "default" | "primary";
    href: ComponentProps<typeof Link>["href"];
  }[];
  title?: string;
}) {
  return (
    <Card className="flex flex-col gap-2 p-0">
      <CardHeader className="block p-4 pb-0">
        <CardTitle className="flex items-center gap-1.5 font-normal text-muted-foreground text-sm dark:font-medium">
          {Icon && <Icon stroke={1.5} className="size-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grow p-4 pt-0!">{children}</CardContent>
      {actions && actions.length > 0 && (
        <CardFooter className="justify-between p-4 pt-0 pb-3">
          <div>
            {actions
              .filter((act) => act.variant === "default" || !act.variant)
              .map((action) => (
                <Button
                  className="-my-1 -mx-2 h-auto p-1 px-2 font-normal text-neutral-400 hover:bg-transparent! hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400"
                  size="sm"
                  variant="ghost"
                  key={JSON.stringify(action)}
                  asChild
                >
                  <Link href={action.href}>{action.text}</Link>
                </Button>
              ))}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
