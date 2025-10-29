"use cache: private";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import type { Course } from "@/lib/canvas-types";
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
        <div className="grid grid-cols-3 gap-4 px-8 pb-8">
          {data.map((course) => (
            <ClassCard key={course.id} {...course} />
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

function ClassCard(courseData: Course) {
  const teacher = courseData.teachers?.[0]?.display_name;
  return (
    <Link href={`/classes/${courseData.id}`}>
      <Button variant="outline" asChild>
        <Card className="flex h-auto cursor-pointer flex-col items-start gap-0 p-0">
          <CardHeader className="block w-full p-4 pb-0">
            <CardTitle className="line-clamp-1 overflow-ellipsis font-normal text-lg">
              {courseData.name}
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
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, userId) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses?enrollment_state=active&per_page=50&include[]=teachers`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as Course[];
  return data;
}
