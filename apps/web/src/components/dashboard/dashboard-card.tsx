"use client";

import type { Icon } from "@tabler/icons-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardCard({
  children,
  icon: Icon,
  actions,
  title,
  contentClassName,
}: {
  children?: React.ReactNode;
  icon?: Icon;
  actions?: {
    text: string;
    variant?: "default" | "primary";
    href: ComponentProps<typeof Link>["href"];
  }[];
  title?: string;
  contentClassName?: string;
}) {
  return (
    <Card className="flex flex-col gap-2 p-0">
      <CardHeader className="block p-4 pb-0">
        <CardTitle className="flex items-center gap-1.5 font-normal text-muted-foreground text-sm dark:font-medium">
          {Icon && <Icon stroke={1.5} className="size-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("grow p-4 pt-0!", contentClassName)}>
        {children}
      </CardContent>
      {actions && actions.length > 0 && (
        <CardFooter className="justify-between p-4 pt-0 pb-3">
          <div>
            {actions
              .filter((act) => act.variant === "default" || !act.variant)
              .map((action, index) => (
                <Button
                  className="-my-1 -mx-2 h-auto p-1 px-2 font-normal text-neutral-400 hover:bg-transparent! hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400"
                  size="sm"
                  variant="ghost"
                  key={`${action.text}-${index}`}
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
