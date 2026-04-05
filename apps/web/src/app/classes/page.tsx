"use cache: private";

import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";
import type { Course } from "@maxw-ai/canvas";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default async function ClassesPage() {
  cacheLife("max");
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData?.user) return <NotAuthenticated />;

  const data = await getAllCanvasCourses({ userId: authData.user.id });

  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Your Classes</PageHeaderTitle>
          <PageHeaderDescription>
            Get your work done, or have it done for you
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      {typeof data === "object" ? (
        <div className="grid grid-cols-1 gap-4 px-8 pb-8 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((course) => (
            <ClassCard key={course.id} id={course.id} name={course.name} teachers={course.teachers} />
          ))}
        </div>
      ) : (
        <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
          Error
        </div>
      )}
    </div>
  );
}

function ClassCard({ id, name, teachers }: Pick<Course, "id" | "name" | "teachers">) {
  const teacher = teachers?.[0]?.display_name;
  return (
    <Link href={`/classes/${id}`}>
      <Button variant="outline" asChild>
        <Card className="flex h-auto cursor-pointer flex-col items-start gap-0 p-0">
          <CardHeader className="block w-full p-4 pb-0">
            <CardTitle className="line-clamp-1 overflow-ellipsis font-normal text-lg">
              {name}
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full p-4 pt-0!">
            <div className="text-muted-foreground">
              {teacher ? toTitleCase(teacher) : "No teachers"}
            </div>
          </CardContent>
        </Card>
      </Button>
    </Link>
  );
}

async function getAllCanvasCourses({ userId }: { userId: string }) {
  const result = await getCanvasClient(userId);
  if (result.error) return result.error;
  return result.canvas.courses
    .list({ enrollment_state: "active", per_page: 50, include: ["teachers"] })
    .all() as Promise<Course[]>;
}
