"use client";

import Link from "next/link";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { toTitleCase } from "@/lib/utils";
import type { CanvasCourse } from "@/types/canvas";
import { useCanvasCourses } from "./use-classes";

export default function ClassesPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data, isLoading, isError } = useCanvasCourses();

  if (sessionPending) {
    return <ClassesLoadingSkeleton />;
  }

  if (!session?.user) {
    return <NotAuthenticated />;
  }

  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Your Classes</PageHeaderTitle>
          <PageHeaderDescription>
            Get your work done, or have it done for you
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      {isLoading ? (
        <ClassesGridSkeleton />
      ) : isError || typeof data === "string" ? (
        <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
          {typeof data === "string" ? data : "Error loading classes"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-8 pb-8 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((course) => (
            <ClassCard key={course.id} {...course} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassCard(courseData: CanvasCourse) {
  const teacher = courseData.teachers?.[0]?.display_name;
  return (
    <Link href={`/classes/${courseData.id}`}>
      <Button variant="outline" asChild>
        <Card className="flex h-auto cursor-pointer flex-col items-start gap-0 p-0">
          <CardHeader className="block w-full p-4 pb-0">
            <CardTitle className="line-clamp-1 overflow-ellipsis font-normal text-lg">
              {courseData.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full p-4 pt-0!">
            <div className="text-muted-foreground">
              {teacher ? toTitleCase(teacher) : "No teachers"}
            </div>
          </CardContent>
        </Card>
      </Button>
    </Link>
  );
}

function ClassesLoadingSkeleton() {
  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Your Classes</PageHeaderTitle>
          <PageHeaderDescription>
            Get your work done, or have it done for you
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <ClassesGridSkeleton />
    </div>
  );
}

function ClassesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 px-8 pb-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`skeleton-${i}`}
          className="flex h-auto flex-col items-start gap-0 rounded-md border bg-background p-0"
        >
          <div className="block w-full p-4 pb-0">
            <Skeleton className="h-6 w-3/4" />
          </div>
          <div className="w-full p-4 pt-2">
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
