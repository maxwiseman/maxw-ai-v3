"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { getCanvasCourse, getFrontPage } from "../classes-actions";
import { notFound } from "next/navigation";
import { toTitleCase } from "@/lib/utils";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { ClassSidebar } from "./class-sidebar";

export default function ClassPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string }>;
}) {
  const params = use(paramsPromise);
  const { data, isPending } = useQuery({
    queryFn: () => getCanvasCourse({ courseId: params.classId }),
    queryKey: ["canvas-course", params.classId],
  });
  const { data: frontPageData } = useQuery({
    queryFn: () => getFrontPage({ courseId: params.classId }),
    queryKey: ["canvas-course", params.classId, "frontpage"],
    enabled: typeof data === "object" && data.default_view === "wiki",
  });

  if ((typeof data !== "object" && !isPending) || typeof data === "string")
    return notFound();
  return (
    <div>
      <ClassSidebar classId={params.classId} />
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
        <div
          className="mx-auto max-w-prose [&_img]:inline-block"
          dangerouslySetInnerHTML={{ __html: frontPageData.body }}
        />
      )}
    </div>
  );
}
