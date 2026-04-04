import { anthropic } from "@ai-sdk/anthropic";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { streamObject } from "ai";
import { z } from "zod";
import { getAssignment, getAllCanvasCourses } from "@/app/classes/classes-actions";
import { db } from "@/db";
import { dailyStatusMessage } from "@/db/schema/memory";
import { auth } from "@/lib/auth";
import { openai } from "@ai-sdk/openai";

const statusSchema = z.object({
  message: z
    .string()
    .describe(
      "A 1-2 sentence status update for the student written in markdown. Mention the most important upcoming assignment or deadline. Use **bold** for assignment/course names. Be conversational and brief.",
    ),
});

export async function GET() {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = authData.user.id;
  const today = new Date().toISOString().split("T")[0]!; // YYYY-MM-DD

  // Return cached message if already generated today
  const cached = await db.query.dailyStatusMessage.findFirst({
    where: and(
      eq(dailyStatusMessage.userId, userId),
      eq(dailyStatusMessage.date, today),
    ),
  });

  if (cached) {
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(cached.content));
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Cached": "true",
        },
      },
    );
  }

  // Pre-fetch Canvas assignments before streaming starts (headers() context required)
  let assignmentsContext = "No Canvas assignments available.";
  try {
    const courses = await getAllCanvasCourses();
    if (Array.isArray(courses)) {
      const perCourse = await Promise.all(
        courses.map(async (course) => {
          const assignments = await getAssignment({
            classId: course.id.toString(),
            filter: "upcoming",
          });
          if (!Array.isArray(assignments)) return [];
          return assignments.slice(0, 10).map((a) => ({
            name: a.name,
            due_at: a.due_at,
            points_possible: a.points_possible,
            course: course.name,
          }));
        }),
      );
      const all = perCourse.flat();
      if (all.length > 0) {
        assignmentsContext = JSON.stringify(all, null, 2);
      }
    }
  } catch {
    // Proceed without Canvas data
  }

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const result = streamObject({
    model: openai("gpt-5.4-mini"),
    schema: statusSchema,
    system:
      "You generate brief daily status messages for a student's dashboard homepage. " +
      "The message should be 1-2 sentences, conversational in tone. " +
      "Focus on the single most time-sensitive upcoming assignment or event. " +
      "Use **bold** for assignment and course names. " +
      "If nothing is due soon, say something encouraging about staying on top of things." +
      "Keep it brief. Just give them a brief update" +
      "Ex: 'You have a **Bio test** on Thursday, and a **ToK assignment** due Sunday night'",
    prompt: `Today is ${todayLabel}. Here are the student's upcoming Canvas assignments:\n\n${assignmentsContext}\n\nWrite the daily status message.`,
  });

  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const partial of result.partialObjectStream) {
          const current = partial.message ?? "";
          if (current.length > fullContent.length) {
            const newChars = current.slice(fullContent.length);
            controller.enqueue(encoder.encode(newChars));
            fullContent = current;
          }
        }
        // Save completed message to DB
        if (fullContent) {
          await db
            .insert(dailyStatusMessage)
            .values({ userId, date: today, content: fullContent })
            .onConflictDoNothing();
        }
      } catch (err) {
        console.error("[status-message] generation failed:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Cached": "false",
    },
  });
}
