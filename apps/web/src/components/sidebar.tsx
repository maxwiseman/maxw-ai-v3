"use client";
import Link, { type LinkProps } from "next/link";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { Button } from "./ui/button";
import { IconBrain, IconCards, IconHome } from "@tabler/icons-react";
import type { RouteType } from "next/dist/lib/load-custom-routes";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
  ] as const;
  const pathname = usePathname();

  return (
    <div className="flex flex-col items-center h-full w-16 border-r">
      <div className="h-16 border-b flex shrink-0 items-center w-full justify-center">
        <Button className="size-full" size="icon" variant="ghost">
          <IconHome />
        </Button>
      </div>
      <div className="w-full h-full flex flex-col justify-between items-center py-4">
        <nav className="flex flex-col items-center gap-4 text-lg">
          <SidebarButton
            icon={<IconHome className="size-4.5" />}
            href="/"
            label="Home"
            isActive={pathname === "/"}
          />
          <SidebarButton
            icon={<IconBrain className="size-4.5" />}
            href="/study"
            label="Study"
            isActive={pathname.startsWith("/study")}
          />
        </nav>
      </div>
    </div>
  );
}

export function SidebarButton({
  icon,
  href,
  label,
  isActive = false,
}: {
  icon: React.ReactNode;
  href: LinkProps<RouteType>["href"];
  label: string;
  isActive?: boolean;
}) {
  return (
    <Tooltip delayDuration={1000}>
      <TooltipTrigger asChild>
        <Button
          className={cn(
            "border-0 text-muted-foreground",
            isActive && "border bg-accent/25 text-foreground"
          )}
          size="icon"
          variant="ghost"
          asChild
        >
          <Link href={href}>{icon}</Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
