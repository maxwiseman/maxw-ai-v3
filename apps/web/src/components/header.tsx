"use client";
import { IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <div className="sticky top-0 flex h-16 border-b bg-background/80 backdrop-blur-md">
      <div className="flex size-16 shrink-0 items-center justify-center border-r border-b">
        <Button asChild className="size-full" size="icon" variant="ghost">
          <Link href="/">
            {/* <IconHome /> */}
            <Logo className="size-8" />
          </Link>
        </Button>
      </div>
      <div className="flex w-full flex-row items-center justify-between px-4">
        <div className="relative">
          <Input
            placeholder="Find anything..."
            className="!bg-transparent w-xs border-0 pl-9 shadow-none"
          />
          <IconSearch className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
