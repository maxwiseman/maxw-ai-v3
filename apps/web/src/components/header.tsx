"use client";
import Link from "next/link";
import UserMenu from "./user-menu";
import { Input } from "./ui/input";
import { IconHome, IconSearch } from "@tabler/icons-react";
import { Button } from "./ui/button";
import { Logo } from "./logo";

export default function Header() {
  return (
    <div className="h-16 border-b flex">
      <div className="size-16 border-b flex shrink-0 items-center justify-center border-r">
        <Button asChild className="size-full" size="icon" variant="ghost">
          <Link href="/">
            {/* <IconHome /> */}
            <Logo className="size-8" />
          </Link>
        </Button>
      </div>
      <div className="flex flex-row w-full items-center justify-between px-4">
        <div className="relative">
          <Input
            placeholder="Find anything..."
            className="!bg-transparent border-0 w-xs pl-9 shadow-none"
          />
          <IconSearch className="absolute left-3 text-muted-foreground size-4 top-1/2 -translate-y-1/2" />
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
