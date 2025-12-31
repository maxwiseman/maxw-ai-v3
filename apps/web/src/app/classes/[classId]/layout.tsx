"use client";

import { Suspense } from "react";
import { ClassSidebar } from "./class-sidebar";
import { ClassSidebarPlaceholder } from "./class-sidebar-placeholder";

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ classId: string }>;
}) {
  return (
    <div>
      <Suspense fallback={<ClassSidebarPlaceholder />}>
        <ClassSidebar params={params} />
      </Suspense>
      {children}
    </div>
  );
}
