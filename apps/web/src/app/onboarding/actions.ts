"use server";

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import z from "zod/v4";
import { CanvasAPIError, CanvasAuthenticationError, CanvasClient } from "@maxw-ai/canvas";
import type { Course } from "@maxw-ai/canvas";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";

export async function saveOnboardingSettings(data: {
  role: "student" | "teacher";
  canvasApiKey: string;
  canvasDomain: string;
}) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return { error: "Unauthorized" };

  await db
    .update(user)
    .set({
      settings: {
        role: data.role,
        canvasApiKey: data.canvasApiKey,
        canvasDomain: data.canvasDomain,
      },
    })
    .where(eq(user.id, authData.user.id));

  return { success: true };
}

export async function validateAndFetchCourses(
  canvasApiKey: string,
  canvasDomain: string,
): Promise<
  | { success: true; courses: Pick<Course, "id" | "name">[] }
  | { success: false; error: string }
> {
  try {
    const canvas = new CanvasClient({ token: canvasApiKey, domain: canvasDomain });
    const courses = await canvas.courses
      .list({ enrollment_state: "active", per_page: 50 })
      .all() as Course[];

    return {
      success: true,
      courses: courses.map((c) => ({ id: c.id, name: c.name })),
    };
  } catch (err: unknown) {
    if (err instanceof CanvasAuthenticationError) {
      return { success: false, error: "Invalid API key" };
    }
    if (err instanceof CanvasAPIError) {
      return { success: false, error: "Canvas returned an error — check your domain" };
    }
    return { success: false, error: "Could not reach Canvas — check the domain" };
  }
}

/** Uses GPT-4o-mini to identify course codes that need a human-readable name,
 *  then sets per-user nicknames via the Canvas API. */
export async function processAndRenameCoursesIfNeeded(
  courses: Pick<Course, "id" | "name">[],
  canvasApiKey: string,
  canvasDomain: string,
): Promise<{ renamed: { id: number; original: string; newName: string }[] }> {
  if (courses.length === 0) return { renamed: [] };

  const { object } = await generateObject({
    model: openai("gpt-5.4-nano"),
    providerOptions: {
      openai: { reasoningEffort: "medium" },
    },
    schema: z.object({
      courses: z.array(
        z.object({
          id: z.number(),
          needsRename: z.boolean(),
          suggestedName: z.string().optional(),
        }),
      ),
    }),
    prompt: `You are reviewing Canvas LMS course names to determine if they are human-readable.
A course name is NOT human-readable when it looks like a course code: e.g. "CS 2340-A", "ENG-WR-227-001", "BIOL 1010-003", "MAT101".
A course name IS human-readable when it describes the subject: e.g. "Introduction to Biology", "English Composition", "Calculus I".

For each course below, decide if it needs a more descriptive name.
If it does, provide a clear, concise human-readable name based on what the course code likely represents.
Keep names short (2-5 words). Do not include section numbers, terms, or codes in the suggested name.

Courses:
${courses.map((c) => `- id: ${c.id}, name: "${c.name}"`).join("\n")}

Return JSON with the courses array, each with id, needsRename (boolean), and suggestedName (string, only when needsRename is true).`,
  });

  const renamed: { id: number; original: string; newName: string }[] = [];

  await Promise.all(
    object.courses
      .filter((c) => c.needsRename && c.suggestedName)
      .map(async (c) => {
        const original = courses.find((course) => Number(course.id) === c.id);
        if (!original) return;

        try {
          await fetch(
            `https://${canvasDomain}/api/v1/users/self/course_nicknames/${c.id}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${canvasApiKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({ nickname: c.suggestedName! }).toString(),
            },
          );
          renamed.push({
            id: c.id,
            original: original.name,
            newName: c.suggestedName!,
          });
        } catch {
          // Silently ignore failures to rename individual courses
        }
      }),
  );

  return { renamed };
}
