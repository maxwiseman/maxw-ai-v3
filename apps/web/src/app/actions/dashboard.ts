"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import type { CanvasAssignment, Course } from "@/lib/canvas-types";

export async function getDashboardData() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, session.user.id) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain) {
    return { error: "Settings not configured" };
  }

  const headersInit = {
    Authorization: `Bearer ${settings.canvasApiKey}`,
  };

  try {
    // Fetch courses
    const coursesPromise = fetch(
      `https://${settings.canvasDomain}/api/v1/courses?enrollment_state=active&per_page=6&include[]=teachers&order_by=activity`,
      { headers: headersInit },
    ).then((res) => res.json() as Promise<Course[]>);

    // Fetch upcoming assignments (using user todo list for relevance)
    // /api/v1/users/self/todo
    const todoPromise = fetch(
      `https://${settings.canvasDomain}/api/v1/users/self/todo?per_page=5`,
      { headers: headersInit },
    ).then((res) => res.json() as Promise<CanvasTodoItem[]>);

    const [courses, todoItems] = await Promise.all([
      coursesPromise,
      todoPromise,
    ]);

    return {
      courses: Array.isArray(courses) ? courses : [],
      assignments: Array.isArray(todoItems) ? todoItems : [],
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return { error: "Failed to fetch data" };
  }
}

export interface CanvasTodoItem {
  type: "submitting" | "grading";
  assignment: CanvasAssignment;
  ignore: string;
  ignore_permanently: string;
  html_url: string;
  context_type: "Course" | "Group";
  course_id: number;
  group_id: null;
}
