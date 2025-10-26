"use client";

import { Suspense, use } from "react";
import { ClassSidebar } from "./class-sidebar";

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ classId: string }>;
}) {
  return (
    <div>
      <Suspense><ClassSidebar params={params} /></Suspense>
      {children}
    </div>
  );
}
