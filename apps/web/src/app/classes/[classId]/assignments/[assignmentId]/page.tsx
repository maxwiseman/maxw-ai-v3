"use cache: private";

import { IconPlus } from "@tabler/icons-react";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CanvasHTML } from "@/components/canvas-html";
import { NotAuthenticated } from "@/components/not-authenticated";
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
import type { CanvasAssignment } from "@/lib/canvas-types";

export const unstable_prefetch = {
  mode: "runtime",
  samples: [
    {
      params: {
        classId: "1234567",
        assignmentId: "1234567",
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

export default async function AssignmentPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string; assignmentId: string }>;
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
          <PageHeaderTitle className="max-w-lg">{data?.name}</PageHeaderTitle>
          {data?.due_at && (
            <PageHeaderDescription className="text-lg">
              {new Date(data?.due_at).toLocaleString("en-us", {
                timeStyle: "short",
                dateStyle: "medium",
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
      <CanvasHTML className="px-8 pb-8">{data?.description}</CanvasHTML>
    </div>
  );
}

async function fetchData({
  classId,
  assignmentId,
  userId,
  filter,
}: {
  classId: string;
  assignmentId?: string;
  userId: string;
  filter?:
    | "past"
    | "overdue"
    | "undated"
    | "ungraded"
    | "unsubmitted"
    | "upcoming"
    | "future";
}) {
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, userId) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}/assignments/${assignmentId}${filter !== undefined ? `?bucket=${filter}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as CanvasAssignment;
  return data;
}
