"use cache: private";

import { eq } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CanvasHTML } from "@/components/canvas-html";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { toTitleCase } from "@/lib/utils";
import type { CanvasCourse, CanvasPage } from "@/types/canvas";

export const unstable_prefetch = {
  mode: "runtime",
  samples: [
    {
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

export default async function ClassPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string }>;
}) {
  cacheLife("max");
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return <NotAuthenticated />;
  const params = await paramsPromise;

  const data = await fetchData({ ...params, userId: authData.user.id });
  if (typeof data === "string") notFound();
  const { frontPageData, classData } = data;
  // const { data, isPending } = useQuery({
  //   queryFn: () => getCanvasCourse(params),
  //   queryKey: ["canvas-course", params.classId],
  // });
  // const { data: frontPageData } = useQuery({
  //   queryFn: () => getFrontPage(params),
  //   queryKey: ["canvas-course", params.classId, "frontpage"],
  //   enabled: typeof data === "object" && data.default_view === "wiki",
  // });

  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>{classData.name}</PageHeaderTitle>
          <PageHeaderDescription>
            {classData.teachers && (classData.teachers?.length ?? 0) > 0
              ? classData.teachers
                  .map((teacher) => toTitleCase(teacher.display_name))
                  .join(", ")
              : "No teachers"}
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      {typeof frontPageData === "object" && (
        <CanvasHTML className="px-8 pb-8">{frontPageData.body}</CanvasHTML>
      )}
    </div>
  );
}

async function fetchData({
  classId,
  userId,
}: {
  classId: string;
  userId: string;
}) {
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, userId) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const classData = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}?include[]=teachers`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as CanvasCourse;
  const frontPageData = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}/front_page`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as CanvasPage;
  return { classData, frontPageData };
}
