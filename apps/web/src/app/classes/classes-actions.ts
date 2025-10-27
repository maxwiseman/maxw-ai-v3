"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import type {
  CanvasAssignment,
  CanvasModule,
  CanvasPage,
  Course,
} from "@/lib/canvas-types";

export async function getAllCanvasCourses() {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return "Unauthorized" as const;
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, authData.user.id) })
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

export async function getCanvasCourse({ classId }: { classId: string }) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return "Unauthorized" as const;
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, authData.user.id) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}?include[]=teachers&enrollment_state=active`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as Course;
  return data;
}

export async function getFrontPage({ classId }: { classId: string }) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return "Unauthorized" as const;
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, authData.user.id) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}/front_page`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as CanvasPage;
  return data;
}

export async function getClassModules({ classId }: { classId: string }) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return "Unauthorized" as const;
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, authData.user.id) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured" as const;
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}/modules?include[]=items`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as CanvasModule[];
  return data;
}

export async function getAssignment(args: {
  classId: string;
  assignmentId: string;
  filter?: never;
}): Promise<CanvasAssignment>;
export async function getAssignment(args: {
  classId: string;
  assignmentId?: undefined;
  filter?:
    | "past"
    | "overdue"
    | "undated"
    | "ungraded"
    | "unsubmitted"
    | "upcoming"
    | "future";
}): Promise<CanvasAssignment[]>;
export async function getAssignment({
  classId,
  assignmentId,
  filter,
}: {
  classId: string;
  assignmentId?: string;
  filter?:
    | "past"
    | "overdue"
    | "undated"
    | "ungraded"
    | "unsubmitted"
    | "upcoming"
    | "future";
}) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return "Unauthorized" as const;
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, authData.user.id) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}/assignments${
      assignmentId ? `/${assignmentId}` : ""
    }${filter !== undefined ? `?bucket=${filter}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as CanvasAssignment | CanvasAssignment[];
  return data;
}

export async function getPage({
  classId,
  pageId,
}: {
  classId: string;
  pageId: string;
}) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return "Unauthorized" as const;
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, authData.user.id) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}/pages/${pageId}`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as CanvasPage;
  return data;
}
