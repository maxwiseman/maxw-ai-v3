"use client";

import type { Icon, IconProps } from "@tabler/icons-react";
import Link from "next/link";
import type {
  ComponentProps,
  ForwardRefExoticComponent,
  RefAttributes,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const { data: session } = authClient.useSession();

  return (
    <div className="mx-auto w-full px-8 py-8">
      <div className="mb-8">
        <h1 className="font-medium font-serif text-4xl">
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
          actions={[{ text: "View todo list", href: "/todo" }]}
        >
          <span className="text-neutral-500 dark:text-neutral-400 [&>strong]:font-medium [&>strong]:text-foreground">
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
      <CardContent className="p-4 pt-0!">{children}</CardContent>
      {actions && actions.length > 0 && (
        <CardFooter className="justify-between p-4 pt-0 pb-3">
          <div>
            {actions
              .filter((act) => act.variant === "default" || !act.variant)
              .map((action, i) => (
                <Button
                  className="-my-1 -mx-2 h-auto p-1 px-2 font-normal text-neutral-400 hover:bg-transparent! hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400"
                  size="sm"
                  variant="ghost"
                  key={i}
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
