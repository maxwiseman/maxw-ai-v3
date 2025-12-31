"use client";

import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";

export function DashboardHeader() {
  const { data: session } = authClient.useSession();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="mb-8">
      <h1 className="font-medium font-serif text-4xl">
        {greeting},{" "}
        <span className="text-muted-foreground">
          {session?.user.name.split(" ")[0]}
        </span>
      </h1>
      <p className="text-muted-foreground">Welcome back to your workspace</p>
    </div>
  );
}
