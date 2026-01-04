"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import type {
  CanvasAssignment,
  CanvasCourse,
  CanvasModule,
  CanvasPage,
} from "@/types/canvas";

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
  ).then((res) => res.json())) as CanvasCourse[];
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
  ).then((res) => res.json())) as CanvasCourse;
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
    }${filter !== undefined ? `?per_page=100&bucket=${filter}` : "?per_page=100"}`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as CanvasAssignment | CanvasAssignment[];
  return data;
}

export async function getPage(args: {
  classId: string;
  pageId: string;
  filter?: never;
}): Promise<
  CanvasPage | { message: "That page has been disabled for this course" }
>;
export async function getPage(args: {
  classId: string;
  pageId?: undefined;
  filter?: "published" | "unpublished" | "all";
}): Promise<
  (CanvasPage | { message: "That page has been disabled for this course" })[]
>;
export async function getPage({
  classId,
  pageId,
  filter,
}: {
  classId: string;
  pageId?: string;
  filter?: "published" | "unpublished" | "all";
}) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return "Unauthorized" as const;
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, authData.user.id) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured";
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}/pages${
      pageId ? `/${pageId}` : ""
    }${filter !== undefined ? `?per_page=100&published=${filter === "published" ? "true" : filter === "unpublished" ? "false" : "all"}` : "?per_page=100"}`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as
    | (CanvasPage | { message: "That page has been disabled for this course" })
    | (
        | CanvasPage
        | { message: "That page has been disabled for this course" }
      )[];
  // Array.isArray(data) ? data.flatMap(i => "message" in i ? "Pages disabled" : i) : "message" in data ? "Pages disabled" : data;
  return data;
}
