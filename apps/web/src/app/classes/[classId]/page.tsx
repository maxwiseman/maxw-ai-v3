"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { use } from "react";
import { CanvasHTML } from "@/components/canvas-html";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { toTitleCase } from "@/lib/utils";
import { getCanvasCourse, getFrontPage } from "../classes-actions";
import { ClassSidebar } from "./class-sidebar";

export default function ClassPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string }>;
}) {
  const params = use(paramsPromise);
  const { data, isPending } = useQuery({
    queryFn: () => getCanvasCourse(params),
    queryKey: ["canvas-course", params.classId],
  });
  const { data: frontPageData } = useQuery({
    queryFn: () => getFrontPage(params),
    queryKey: ["canvas-course", params.classId, "frontpage"],
    enabled: typeof data === "object" && data.default_view === "wiki",
  });

  if ((typeof data !== "object" && !isPending) || typeof data === "string")
    return notFound();
  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>{data?.name}</PageHeaderTitle>
          <PageHeaderDescription>
            {(data?.teachers.length ?? 0) > 0
              ? data?.teachers
                  .map((teacher) => toTitleCase(teacher.display_name))
                  .join(", ")
              : "No teachers"}
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      {typeof frontPageData === "object" && (
        <CanvasHTML className="px-8">{frontPageData.body}</CanvasHTML>
      )}
    </div>
  );
}
