"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { type Icon, type IconProps } from "@tabler/icons-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

export default function Home() {
  const { data: session } = authClient.useSession();

  return (
    <div className="mx-auto w-full px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-medium font-serif">
          Afternoon,{" "}
          <span className="text-muted-foreground">
            {session?.user.name.split(" ")[0]}
          </span>
        </h1>
        <p className="text-muted-foreground">
          One more week left until the break
        </p>
      </div>
      <div className="grid grid-cols-3">
        <DashboardCard
          // icon={IconPencil}
          title="Upcoming Assignments"
          actions={[{ text: "View todo list", onClick: () => {} }]}
        >
          <span className="dark:text-neutral-400 text-neutral-500 [&>strong]:font-medium [&>strong]:text-foreground">
            You have a <strong>Bio test</strong> on Thursday, and a{" "}
            <strong>ToK assignment</strong> due Sunday night
          </span>
        </DashboardCard>
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
  icon?: ForwardRefExoticComponent<IconProps & RefAttributes<Icon>>;
  actions?: {
    text: string;
    variant?: "default" | "primary";
    onClick: () => void;
  }[];
  title?: string;
}) {
  return (
    <Card className="p-0 flex flex-col gap-2">
      <CardHeader className="p-4 pb-0 block">
        <CardTitle className="flex items-center gap-1.5 text-sm text-muted-foreground font-normal dark:font-medium">
          {Icon && <Icon stroke={1.5} className="size-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="!pt-0 p-4">{children}</CardContent>
      {actions && actions.length > 0 && (
        <CardFooter className="p-4 pt-0 pb-3 justify-between">
          <div>
            {actions
              .filter((act) => act.variant === "default" || !act.variant)
              .map((action, i) => (
                <Button
                  className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400 font-normal h-auto p-1 px-2 -my-1 -mx-2 hover:!bg-transparent"
                  size="sm"
                  variant="ghost"
                  key={i}
                >
                  {action.text}
                </Button>
              ))}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
