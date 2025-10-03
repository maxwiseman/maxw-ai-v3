"use client";
import Link from "next/link";
import UserMenu from "./user-menu";
import { Input } from "./ui/input";
import { IconSearch } from "@tabler/icons-react";

export default function Header() {
  return (
    <div className="flex flex-row items-center justify-between px-4 h-16 border-b">
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
  );
}
