"use server";

import { headers } from "next/headers";
import type { Course, TodoItem } from "@maxw-ai/canvas";
import { auth } from "@/lib/auth";
import { getCanvasClient } from "@/lib/canvas-client";

export type { TodoItem };

export async function getDashboardData() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const result = await getCanvasClient(session.user.id);
  if (result.error) return { error: result.error };

  const { canvas } = result;

  try {
    const [courses, todoItems] = await Promise.all([
      canvas.courses
        .list({ enrollment_state: "active", per_page: 6, include: ["teachers"] })
        .all() as Promise<Course[]>,
      canvas.users.todoItems({ per_page: 5 }),
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
