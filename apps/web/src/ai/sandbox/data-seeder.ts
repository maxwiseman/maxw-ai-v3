/**
 * Canvas Data Seeder
 * Fetches Canvas data and uploads it to the sandbox as JSON files.
 * Redis-cached per user (5 min TTL) to avoid hitting Canvas API on every turn.
 *
 * Produces in /home/daytona/data/:
 *   - courses.json       — array of CanvasCourse
 *   - assignments.json   — array of assignments with _classId and _className fields
 */

import { Redis } from "@upstash/redis";
import {
  getAllCanvasCourses,
  getAssignment,
} from "@/app/classes/classes-actions";
import { env } from "@/env";
import type { Sandbox } from "./sandbox-manager";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const CANVAS_CACHE_KEY = (userId: string) => `canvas:data:${userId}`;
const CANVAS_CACHE_TTL = 60 * 5; // 5 minutes

interface CanvasData {
  courses: object[];
  assignments: object[];
}

async function fetchCanvasData(): Promise<CanvasData | null> {
  const courses = await getAllCanvasCourses();

  if (!courses || courses === "Unauthorized" || courses === "Settings not configured") {
    return null;
  }

  const assignmentResults = await Promise.all(
    courses.map(async (course) => {
      const assignments = await getAssignment({
        classId: course.id.toString(),
      });
      if (
        assignments === "Unauthorized" ||
        assignments === "Settings not configured"
      ) {
        return [];
      }
      return (assignments as Array<object>).map((a) => ({
        ...a,
        _classId: course.id.toString(),
        _className: course.name,
      }));
    }),
  );

  return {
    courses: courses as object[],
    assignments: assignmentResults.flat(),
  };
}

/**
 * Seed the sandbox /data directory with Canvas JSON files.
 * Fetches fresh data if cache is expired, otherwise uses cached data.
 * Silently returns on any error (Canvas not configured, network issues, etc.)
 */
export async function seedCanvasData(
  userId: string,
  sandbox: Sandbox,
): Promise<void> {
  try {
    // Try cache first
    let data = await redis.get<CanvasData>(CANVAS_CACHE_KEY(userId));

    if (!data) {
      data = await fetchCanvasData();
      if (!data) return; // Canvas not configured or unauthorized

      await redis.set(CANVAS_CACHE_KEY(userId), data, { ex: CANVAS_CACHE_TTL });
    }

    // Upload JSON files to sandbox
    await Promise.all([
      sandbox.fs.uploadFile(
        Buffer.from(JSON.stringify(data.courses, null, 2)),
        "/home/daytona/data/courses.json",
      ),
      sandbox.fs.uploadFile(
        Buffer.from(JSON.stringify(data.assignments, null, 2)),
        "/home/daytona/data/assignments.json",
      ),
    ]);
  } catch {
    // Silently ignore — seeding is best-effort, agent can still function without it
  }
}
