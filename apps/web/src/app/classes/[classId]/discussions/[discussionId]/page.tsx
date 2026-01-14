"use client";

export const dynamic = "force-static";

import { IconPlus, IconUser } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { CanvasHTML } from "@/components/canvas-html";
import { DateDisplay } from "@/components/date-display";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { toTitleCase } from "@/lib/utils";
import type {
  CanvasDiscussionEntry,
  CanvasDiscussionView,
} from "@/types/canvas";
import { useDiscussion } from "../../../use-classes";

export default function DiscussionPage() {
  const params = useParams<{ classId: string; discussionId: string }>();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data, isLoading, isError } = useDiscussion(
    params.classId,
    params.discussionId,
  );

  if (sessionPending) {
    return <DiscussionPageSkeleton />;
  }

  if (!session?.user) {
    return <NotAuthenticated />;
  }

  if (isLoading) {
    return <DiscussionPageSkeleton />;
  }

  if (isError || typeof data === "string") {
    return (
      <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
        {typeof data === "string" ? data : "Error loading discussion"}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
        Discussion not found
      </div>
    );
  }

  return (
    <div>
      <PageHeader className="flex-wrap">
        <PageHeaderContent>
          <PageHeaderTitle>{data.title}</PageHeaderTitle>
          {data.assignment?.due_at && (
            <PageHeaderDescription className="text-lg">
              {new Date(data.assignment.due_at).toLocaleString("en-us", {
                timeStyle: "short",
                dateStyle: "medium",
                timeZone: "America/New_York",
              })}
            </PageHeaderDescription>
          )}
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="outline">
            <IconPlus className="text-muted-foreground" />
            Add todo
          </Button>
          <Button>Submit</Button>
        </PageHeaderActions>
      </PageHeader>
      <CanvasHTML className="px-8 pb-8">{data.message}</CanvasHTML>
      <div className="space-y-16 px-8 pb-8">
        {data.view?.reverse().map((entry) => (
          <DiscussionEntry
            key={entry.id}
            participants={data.participants}
            entry={entry}
          />
        ))}
      </div>
    </div>
  );
}

function DiscussionEntry({
  participants,
  entry,
}: {
  participants: CanvasDiscussionView["participants"];
  entry: CanvasDiscussionEntry;
}) {
  const user = participants?.find((p) => p.id === entry.user_id);
  return (
    <Card className="mx-auto max-w-3xl" key={entry.id}>
      <CardHeader className="flex items-center gap-4">
        <Avatar className="size-10 bg-accent">
          <AvatarImage src={user?.avatar_image_url ?? ""} />
          <AvatarFallback>
            <IconUser />
          </AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg">
            {toTitleCase(user?.display_name ?? "")}
          </CardTitle>
          <CardDescription className="text-base">
            <DateDisplay
              date={entry.created_at}
              options={{ dateStyle: "medium", timeStyle: "short" }}
            />
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <CanvasHTML>{entry.message}</CanvasHTML>
      </CardContent>
    </Card>
  );
}

function DiscussionPageSkeleton() {
  return (
    <div>
      <PageHeader className="flex-wrap">
        <PageHeaderContent>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-6 w-32" />
        </PageHeaderContent>
        <PageHeaderActions>
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </PageHeaderActions>
      </PageHeader>
      <div className="space-y-4 px-8 pb-8">
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="space-y-16 px-8 pb-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={`skeleton-${i}`} className="mx-auto max-w-3xl">
            <CardHeader className="flex items-center gap-4">
              <Skeleton className="size-10 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-1 h-4 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
