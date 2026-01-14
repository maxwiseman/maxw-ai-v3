"use client";

export const dynamic = "force-static";

import { useParams } from "next/navigation";
import { CanvasHTML } from "@/components/canvas-html";
import { CanvasLogo } from "@/components/custom-icons";
import { DateDisplay } from "@/components/date-display";
import { TodoButton } from "@/components/new-todo-button";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { useAssignment } from "../../../use-classes";
import { SubmissionProvider } from "./submission-provider";

export default function AssignmentPage() {
  const params = useParams<{ classId: string; assignmentId: string }>();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data, isLoading, isError } = useAssignment(
    params.classId,
    params.assignmentId,
  );

  if (sessionPending) {
    return <AssignmentPageSkeleton />;
  }

  if (!session?.user) {
    return <NotAuthenticated />;
  }

  if (isLoading) {
    return <AssignmentPageSkeleton />;
  }

  if (isError || typeof data === "string") {
    return (
      <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
        {typeof data === "string" ? data : "Error loading assignment"}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
        Assignment not found
      </div>
    );
  }

  return (
    <div>
      <PageHeader className="flex-wrap">
        <PageHeaderContent>
          <PageHeaderTitle>{data?.name}</PageHeaderTitle>
          {data?.due_at && (
            <PageHeaderDescription className="text-lg">
              <DateDisplay
                date={data?.due_at}
                options={{ timeStyle: "short", dateStyle: "medium" }}
              />
            </PageHeaderDescription>
          )}
        </PageHeaderContent>
        <PageHeaderActions>
          <TodoButton
            name={data.name}
            dueDate={data.due_at}
            description={data.description ?? "No description"}
            assignmentId={data.id}
            classId={Number(params.classId)}
          />
          <Button asChild>
            <a target="_blank" href={data.html_url}>
              <CanvasLogo />
              View on Canvas
            </a>
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <CanvasHTML className="min-h-96 px-8 pb-8">
        {data?.description?.length === 0 ? "No description" : data.description}
      </CanvasHTML>
      {data.submission_types.length >= 1 && (
        <SubmissionProvider
          classId={params.classId}
          assignmentId={params.assignmentId}
          submissionTypes={data.submission_types}
        />
      )}
    </div>
  );
}

function AssignmentPageSkeleton() {
  return (
    <div>
      <PageHeader className="flex-wrap">
        <PageHeaderContent>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-6 w-32" />
        </PageHeaderContent>
        <PageHeaderActions>
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
        </PageHeaderActions>
      </PageHeader>
      <div className="min-h-96 space-y-4 px-8 pb-8">
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
    </div>
  );
}
