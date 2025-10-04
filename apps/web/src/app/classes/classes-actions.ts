"use server";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import type { CanvasPage, Course } from "@/lib/canvas-types";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function getAllCanvasCourses() {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return "Unauthorized" as const;
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, authData.user.id) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses?enrollment_state=active&per_page=50`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    }
  ).then((res) => res.json())) as Course[];
  return data;
}

export async function getCanvasCourse({ courseId }: { courseId: string }) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return "Unauthorized" as const;
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, authData.user.id) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${courseId}`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    }
  ).then((res) => res.json())) as Course;
  return data;
}

export async function getFrontPage({ courseId }: { courseId: string }) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return "Unauthorized" as const;
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, authData.user.id) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${courseId}/front_page`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    }
  ).then((res) => res.json())) as CanvasPage;
  return data;
}
