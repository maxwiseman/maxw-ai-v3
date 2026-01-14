"use client";

export const dynamic = "force-static";

import { useParams } from "next/navigation";
import { CanvasHTML } from "@/components/canvas-html";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { toTitleCase } from "@/lib/utils";
import { useClassWithFrontPage } from "../use-classes";

export default function ClassPage() {
  const params = useParams<{ classId: string }>();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { classData, frontPageData, isLoading, isError } =
    useClassWithFrontPage(params.classId);

  if (sessionPending) {
    return <ClassPageSkeleton />;
  }

  if (!session?.user) {
    return <NotAuthenticated />;
  }

  if (isLoading) {
    return <ClassPageSkeleton />;
  }

  if (
    isError ||
    typeof classData === "string" ||
    typeof frontPageData === "string"
  ) {
    return (
      <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
        {typeof classData === "string"
          ? classData
          : typeof frontPageData === "string"
            ? frontPageData
            : "Error loading class"}
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
        Class not found
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>{classData.name}</PageHeaderTitle>
          <PageHeaderDescription>
            {classData.teachers && (classData.teachers?.length ?? 0) > 0
              ? classData.teachers
                  .map((teacher) => toTitleCase(teacher.display_name))
                  .join(", ")
              : "No teachers"}
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      {typeof frontPageData === "object" && frontPageData?.body && (
        <CanvasHTML className="px-8">{frontPageData.body}</CanvasHTML>
      )}
    </div>
  );
}

function ClassPageSkeleton() {
  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-5 w-40" />
        </PageHeaderContent>
      </PageHeader>
      <div className="space-y-4 px-8 pb-8">
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
    </div>
  );
}
