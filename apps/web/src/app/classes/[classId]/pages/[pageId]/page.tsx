"use client";

export const dynamic = "force-static";

import { IconPlus } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { CanvasHTML } from "@/components/canvas-html";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { usePage } from "../../../use-classes";

export default function PagePage() {
  const params = useParams<{ classId: string; pageId: string }>();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data, isLoading, isError } = usePage(params.classId, params.pageId);

  if (sessionPending) {
    return <PageSkeleton />;
  }

  if (!session?.user) {
    return <NotAuthenticated />;
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError || typeof data === "string") {
    return (
      <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
        {typeof data === "string" ? data : "Error loading page"}
      </div>
    );
  }

  if (!data || "message" in data) {
    return (
      <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
        {data && "message" in data ? data.message : "Page not found"}
      </div>
    );
  }

  return (
    <div>
      <PageHeader className="flex-wrap">
        <PageHeaderContent>
          <PageHeaderTitle>{data?.title}</PageHeaderTitle>
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

function PageSkeleton() {
  return (
    <div>
      <PageHeader className="flex-wrap">
        <PageHeaderContent>
          <Skeleton className="h-10 w-64" />
        </PageHeaderContent>
        <PageHeaderActions>
          <Skeleton className="h-9 w-24" />
        </PageHeaderActions>
      </PageHeader>
      <div className="space-y-4 px-8 pb-8">
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
    </div>
  );
}
