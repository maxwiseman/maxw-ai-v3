"use cache: private";

import { IconPlus, IconUser } from "@tabler/icons-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { DiscussionEntry, DiscussionTopic, DiscussionView } from "@maxw-ai/canvas";
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
import { auth } from "@/lib/auth";
import { getCanvasClient } from "@/lib/canvas-client";
import { toTitleCase } from "@/lib/utils";

export const unstable_prefetch = {
  mode: "runtime",
  samples: [
    {
      params: {
        classId: "1234567",
        discussionId: "1234567",
      },
      cookies: [
        {
          name: "better-auth.session_token",
          value:
            "y8YE2cBNaOADiF2ttYvpgt8ElyAOGBXl.DAolkZhTDI8C4%2Bw0UbJQj7MrjxyXSOYkNzuWWLtOpck%3D",
        },
      ],
    },
  ],
};

export default async function DiscussionPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string; discussionId: string }>;
}) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return <NotAuthenticated />;
  const params = await paramsPromise;
  const data = await fetchData({ userId: authData.user.id, ...params });
  if (typeof data === "string") notFound();

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
          <Button>
            {/* <IconPlus className="text-muted-foreground" /> */}
            Submit
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <CanvasHTML className="px-8 pb-8">{data.message}</CanvasHTML>
      <div className="space-y-16 px-8 pb-8">
        {data.view.reverse().map((entry) => (
          <DiscussionEntryCard
            key={entry.id}
            participants={data.participants}
            entry={entry}
          />
        ))}
      </div>
    </div>
  );
}

function DiscussionEntryCard({
  participants,
  entry,
}: {
  participants: DiscussionView["participants"];
  entry: DiscussionEntry;
}) {
  const participant = participants.find((p) => p.id === entry.user_id);
  return (
    <Card className="mx-auto max-w-3xl" key={entry.id}>
      <CardHeader className="flex items-center gap-4">
        <Avatar className="size-10 bg-accent">
          <AvatarImage src={participant?.avatar_image_url ?? ""} />
          <AvatarFallback>
            <IconUser />
          </AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="font-normal text-md">
            {toTitleCase(participant?.display_name ?? "")}
          </CardTitle>
          <CardDescription className="">
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

async function fetchData({
  classId,
  discussionId,
  userId,
}: {
  classId: string;
  discussionId: string;
  userId: string;
}) {
  const result = await getCanvasClient(userId);
  if (result.error) return result.error;

  const discussions = result.canvas.courses.discussions(Number(classId));
  // TODO: This sometimes just returns "require_initial_post" instead of JSON, which causes an error
  const [data, view] = await Promise.all([
    discussions.retrieve(Number(discussionId)) as Promise<DiscussionTopic>,
    discussions.retrieveView(Number(discussionId)) as Promise<DiscussionView>,
  ]);
  return { ...data, ...view };
}
