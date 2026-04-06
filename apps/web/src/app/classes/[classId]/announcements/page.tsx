"use cache: private";

import { IconBell } from "@tabler/icons-react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Announcement } from "@maxw-ai/canvas";
import { CanvasHTML } from "@/components/canvas-html";
import { DateDisplay } from "@/components/date-display";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderTitle,
} from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export default async function AnnouncementsPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string }>;
}) {
  cacheLife("days");
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return <NotAuthenticated />;
  const params = await paramsPromise;

  const data = await fetchData({
    userId: authData.user.id,
    classId: params.classId,
  });

  if (typeof data === "string") notFound();

  const announcements = [...(data as Announcement[])].sort((a, b) => {
    const aTime = a.posted_at ? new Date(a.posted_at).getTime() : 0;
    const bTime = b.posted_at ? new Date(b.posted_at).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div>
      <PageHeader className="flex w-full justify-center">
        <PageHeaderContent className="max-w-3xl">
          <PageHeaderTitle>Announcements</PageHeaderTitle>
        </PageHeaderContent>
      </PageHeader>
      <div className="space-y-8 px-8 pb-8">
        {announcements.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No announcements found.
          </div>
        ) : (
          announcements.map((announcement) => (
            <AnnouncementCard
              announcement={announcement}
              key={announcement.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({
  announcement,
}: {
  announcement: Announcement;
}) {
  const authorName =
    announcement.author?.display_name ?? announcement.user_name ?? null;

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="flex items-center gap-4">
        <Avatar className="size-10 bg-accent">
          <AvatarImage src={announcement.author?.avatar_image_url ?? ""} />
          <AvatarFallback>
            <IconBell />
          </AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="font-normal text-md">
            {announcement.title}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
            {authorName ? <span>{toTitleCase(authorName)}</span> : null}
            {announcement.posted_at ? (
              <DateDisplay
                date={announcement.posted_at}
                options={{ dateStyle: "medium", timeStyle: "short" }}
              />
            ) : (
              <span>Not yet posted</span>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {announcement.message ? (
          <CanvasHTML>{announcement.message}</CanvasHTML>
        ) : (
          <div className="text-muted-foreground text-sm">
            No announcement content.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function fetchData({
  classId,
  userId,
}: {
  classId: string;
  userId: string;
}) {
  const result = await getCanvasClient(userId);
  if (result.error) return result.error as "Settings not configured";

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);
  const endDate = new Date();

  return result.canvas.courses
    .announcements(Number(classId))
    .list({
      active_only: true,
      per_page: 100,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    })
    .all() as Promise<Announcement[]>;
}
