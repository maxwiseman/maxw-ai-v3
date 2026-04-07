"use cache: private";

import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CanvasNotFoundError } from "@maxw-ai/canvas";
import type { Course, Page } from "@maxw-ai/canvas";
import { CanvasHTML } from "@/components/canvas-html";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { auth } from "@/lib/auth";
import { getCanvasClient } from "@/lib/canvas-client";
import { toTitleCase } from "@/lib/utils";

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
      {frontPageData != null && typeof frontPageData === "object" && (
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
  const result = await getCanvasClient(userId);
  if (result.error) return result.error;
  const { canvas } = result;
  const [classData, frontPageData] = await Promise.all([
    canvas.courses.retrieve(Number(classId), { include: ["teachers"] }) as Promise<Course>,
    (canvas.courses.pages(Number(classId)).retrieveFrontPage() as Promise<Page>).catch(
      (err) => (err instanceof CanvasNotFoundError ? null : Promise.reject(err)),
    ),
  ]);
  return { classData, frontPageData };
}
