"use client";
import Link from "next/link";
import { Logo } from "./logo";
import MobileNav from "./mobile-nav";
import { SearchCommand } from "./search-command";
import { Button } from "./ui/button";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <div className="sticky top-0 z-20 flex h-16 border-b bg-background/80 backdrop-blur-md">
      <div className="flex size-16 shrink-0 items-center justify-center border-r border-b">
        <Button asChild className="size-full" size="icon" variant="ghost">
          <Link href="/">
            {/* <IconHome /> */}
            <Logo className="size-8" />
          </Link>
        </Button>
      </div>
      <div className="flex w-full flex-row items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <MobileNav />
          </div>
          <SearchCommand />
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
