"use cache: private";

import { IconPlus, IconUser } from "@tabler/icons-react";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CanvasHTML } from "@/components/canvas-html";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import type { CanvasDiscussion, CanvasDiscussionEntry, CanvasDiscussionView } from "@/lib/canvas-types";
import { NotAuthenticated } from "@/components/not-authenticated";
import { cn, toTitleCase } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
          <PageHeaderTitle className={cn(data.title.length >= 50 && "text-3xl")}>{data.title}</PageHeaderTitle>
          {data.assignment.due_at && (
            <PageHeaderDescription className="text-lg">
              {new Date(data.assignment.due_at).toLocaleString("en-us", {
                timeStyle: "short",
                dateStyle: "medium",
                timeZone: "America/New_York"
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
          <DiscussionEntry key={entry.id} participants={data.participants} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function DiscussionEntry({participants, entry}: {participants: CanvasDiscussionView["participants"], entry: CanvasDiscussionEntry}) {
  const user = participants.find(p => p.id === entry.user_id)
  return (
    <Card className="mx-auto max-w-3xl" key={entry.id}>
      <CardHeader className="flex items-center gap-4">
        <Avatar className="size-10 bg-accent">
          <AvatarImage src={user?.avatar_image_url ?? ""} />
          <AvatarFallback><IconUser /></AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg">{toTitleCase(user?.display_name ?? "")}</CardTitle>
          <CardDescription className="text-base">{new Date(entry.created_at).toLocaleString("en-us", {timeStyle: "short", dateStyle: "medium", timeZone: "America/New_York"})}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <CanvasHTML>{entry.message}</CanvasHTML>
      </CardContent>
    </Card>
  )
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
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, userId) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}/discussion_topics/${discussionId}`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as CanvasDiscussion;
  const view = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}/discussion_topics/${discussionId}/view`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as CanvasDiscussionView;
  return {...data, ...view};
}
