"use cache: private";

import { IconPlus } from "@tabler/icons-react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Page } from "@maxw-ai/canvas";
import { CanvasHTML } from "@/components/canvas-html";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getCanvasClient } from "@/lib/canvas-client";

export const unstable_prefetch = {
  mode: "runtime",
  samples: [
    {
      params: {
        classId: "1234567",
        pageId: "1234567",
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
  params: Promise<{ classId: string; pageId: string }>;
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

async function fetchData({
  classId,
  pageId,
  userId,
}: {
  classId: string;
  pageId: string;
  userId: string;
}) {
  const result = await getCanvasClient(userId);
  if (result.error) return result.error;
  return result.canvas.courses.pages(Number(classId)).retrieve(pageId) as Promise<Page>;
}
