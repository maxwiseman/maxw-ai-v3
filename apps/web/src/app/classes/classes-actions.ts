"use server";

import { headers } from "next/headers";
import type {
  Assignment,
  Course,
  File,
  Module,
  Page,
} from "@maxw-ai/canvas";
import { auth } from "@/lib/auth";
import { getCanvasClient } from "@/lib/canvas-client";

// ---------------------------------------------------------------------------
// Auth + settings helper used by every action in this file
// ---------------------------------------------------------------------------

async function getAuthedClient() {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return { error: "Unauthorized" as const };

  const result = await getCanvasClient(authData.user.id);
  if (result.error) return { error: result.error };

  return { canvas: result.canvas };
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export async function getAllCanvasCourses(): Promise<"Unauthorized" | "Settings not configured" | Course[]> {
  const res = await getAuthedClient();
  if ("error" in res) return res.error as "Unauthorized" | "Settings not configured";

  return res.canvas.courses.list({
    enrollment_state: "active",
    include: ["teachers"],
    per_page: 50,
  }).all() as Promise<Course[]>;
}

export async function getCanvasCourse({ classId }: { classId: string }) {
  const res = await getAuthedClient();
  if ("error" in res) return res.error;

  return res.canvas.courses.retrieve(Number(classId), {
    include: ["teachers"],
  });
}

// ---------------------------------------------------------------------------
// Front page
// ---------------------------------------------------------------------------

export async function getFrontPage({ classId }: { classId: string }) {
  const res = await getAuthedClient();
  if ("error" in res) return res.error;

  return res.canvas.courses.pages(Number(classId)).retrieveFrontPage();
}

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export async function getClassModules({ classId }: { classId: string }) {
  const res = await getAuthedClient();
  if ("error" in res) return res.error as "Unauthorized" | "Settings not configured";

  return res.canvas.courses
    .modules(Number(classId))
    .list({ include: ["items"] })
    .all() as Promise<Module[]>;
}

// ---------------------------------------------------------------------------
// Assignments (overloaded: single or list)
// ---------------------------------------------------------------------------

export async function getAssignment(args: {
  classId: string;
  assignmentId: string;
  filter?: undefined;
}): Promise<Assignment>;
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
}): Promise<Assignment[] | "Settings not configured" | "Unauthorized">;
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
  const res = await getAuthedClient();
  if ("error" in res) return res.error as "Unauthorized" | "Settings not configured";

  const assignments = res.canvas.courses.assignments(Number(classId));

  if (assignmentId) {
    return assignments.retrieve(Number(assignmentId));
  }

  return assignments.list({ bucket: filter, per_page: 100 }).all();
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export async function getCanvasFile({
  classId: _classId,
  fileId,
}: {
  classId: string;
  fileId: string;
}) {
  const res = await getAuthedClient();
  if ("error" in res) return res.error as "Unauthorized" | "Settings not configured";

  return res.canvas.files.retrieve(Number(fileId));
}

// ---------------------------------------------------------------------------
// Pages (overloaded: single or list)
// ---------------------------------------------------------------------------

export async function getPage(args: {
  classId: string;
  pageId: string;
  filter?: undefined;
}): Promise<
  Page | { message: "That page has been disabled for this course" }
>;
export async function getPage(args: {
  classId: string;
  pageId?: undefined;
  filter?: "published" | "unpublished" | "all";
}): Promise<
  (Page | { message: "That page has been disabled for this course" })[]
>;
export async function getPage({
  classId,
  pageId,
  filter,
}: {
  classId: string;
  pageId?: string;
  filter?: "published" | "unpublished" | "all";
}): Promise<
  | Page
  | { message: "That page has been disabled for this course" }
  | (Page | { message: "That page has been disabled for this course" })[]
  | "Unauthorized"
  | "Settings not configured"
> {
  const res = await getAuthedClient();
  if ("error" in res) return res.error as "Unauthorized" | "Settings not configured";

  const pages = res.canvas.courses.pages(Number(classId));

  if (pageId) {
    return pages.retrieve(pageId);
  }

  const published =
    filter === "published" ? true : filter === "unpublished" ? false : undefined;

  return pages.list({ published, per_page: 100 }).all();
}
