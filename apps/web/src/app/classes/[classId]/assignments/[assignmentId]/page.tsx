"use cache: private";

import { eq } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
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
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import type { CanvasAssignment } from "@/types/canvas";
import { SubmissionProvider } from "./submission-provider";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ classId: string; assignmentId: string }>;
}) {
  const awaitedParams = await params;
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData)
    return {
      title: "Assignment Not Found",
    };
  const data = await fetchData({
    userId: authData.user.id,
    classId: awaitedParams.classId,
    assignmentId: awaitedParams.assignmentId,
  });
  if (typeof data === "string") {
    return {
      title: "Assignment Not Found",
    };
  }
  return {
    title: data?.name,
    description: data?.description
      ? data.description.replace(/<[^>]+>/g, "").slice(0, 160)
      : "No description",
  };
}

export default async function AssignmentPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string; assignmentId: string }>;
}) {
  cacheLife("weeks");
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return <NotAuthenticated />;
  const params = await paramsPromise;
  const data = await fetchData({ userId: authData.user.id, ...params });
  if (typeof data === "string") notFound();

  return (
    <div>
      <PageHeader className="flex-wrap">
        <PageHeaderContent>
          <PageHeaderTitle>{data?.name}</PageHeaderTitle>
          {data?.due_at && (
            <PageHeaderDescription className="text-lg">
              {/*{new Date(data?.due_at).toLocaleString("en-us", {
                timeStyle: "short",
                dateStyle: "medium",
              })}*/}
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
