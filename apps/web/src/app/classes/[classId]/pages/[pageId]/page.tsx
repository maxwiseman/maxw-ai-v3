"use client";

import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { use } from "react";
import { getPage } from "@/app/classes/classes-actions";
import { CanvasHTML } from "@/components/canvas-html";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function AssignmentPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string; pageId: string }>;
}) {
  const params = use(paramsPromise);
  const { data } = useQuery({
    queryFn: () => getPage(params),
    queryKey: ["canvas-course", params.classId, "pages", params.pageId],
  });
  if (typeof data === "string") notFound();
  console.log(data);

  return (
    <div>
      <PageHeader className="flex-wrap">
        <PageHeaderContent>
          <PageHeaderTitle className="max-w-lg">{data?.title}</PageHeaderTitle>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="outline">
            <IconPlus className="text-muted-foreground" />
            Add todo
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <CanvasHTML className="px-8 pb-8">{data?.body}</CanvasHTML>
    </div>
  );
}
