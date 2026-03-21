"use server";

import { anthropic } from "@ai-sdk/anthropic";
import { PDFDocument } from "pdf-lib";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { start } from "workflow/api";
import z from "zod/v4";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import {
  gradingAnswerKey,
  gradingResult,
  gradingSession,
  type GradingAnswerKey,
  type GradingResult,
  type GradingSession,
} from "@/db/schema/grading";
import { auth } from "@/lib/auth";
import { getR2SignedUrl, putR2Object } from "@/ai/sandbox/r2-client";
import {
  gradingBlankKey,
  gradingFullScanKey,
  gradingWorkflow,
} from "./workflow";

// ─── Auth helpers ─────────────────────────────────────────────────────────

async function getTeacherSession() {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return null;

  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, authData.user.id),
  });
  if (userRecord?.settings?.role !== "teacher") return null;

  return { userId: authData.user.id };
}

// ─── Session management ───────────────────────────────────────────────────

export async function createGradingSession(
  title: string,
): Promise<{ sessionId: string } | { error: string }> {
  const session = await getTeacherSession();
  if (!session) return { error: "Unauthorized" };

  const [created] = await db
    .insert(gradingSession)
    .values({ userId: session.userId, title })
    .returning({ id: gradingSession.id });

  return { sessionId: created.id };
}

export async function uploadBlankPdf(
  sessionId: string,
  fileBuffer: ArrayBuffer,
): Promise<{ r2Key: string } | { error: string }> {
  const session = await getTeacherSession();
  if (!session) return { error: "Unauthorized" };

  const r2Key = gradingBlankKey(session.userId, sessionId);
  await putR2Object(r2Key, Buffer.from(fileBuffer), "application/pdf");

  await db
    .update(gradingSession)
    .set({ blankPdfR2Key: r2Key })
    .where(eq(gradingSession.id, sessionId));

  return { r2Key };
}

export type AnswerKeyQuestion = {
  questionNumber: number;
  questionType: "multiple_choice" | "short_answer" | "true_false";
  correctAnswer: string;
  explanation: string;
  points: number;
};

export async function generateAnswerKey(
  sessionId: string,
): Promise<{ questions: AnswerKeyQuestion[] } | { error: string }> {
  const teacher = await getTeacherSession();
  if (!teacher) return { error: "Unauthorized" };

  const session = await db.query.gradingSession.findFirst({
    where: eq(gradingSession.id, sessionId),
  });
  if (!session?.blankPdfR2Key) return { error: "Blank PDF not uploaded" };

  // Fetch blank PDF bytes for two purposes:
  // 1. Pass to Claude for answer key extraction
  // 2. Read page count to set pagesPerStudent
  const signedUrl = await getR2SignedUrl(session.blankPdfR2Key, 300);
  const pdfBytes = await fetch(signedUrl).then((r) => r.arrayBuffer());

  const [pdfDoc, aiResult] = await Promise.all([
    PDFDocument.load(pdfBytes),
    generateObject({
      model: anthropic("claude-sonnet-4-6"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file" as const,
              data: Buffer.from(pdfBytes).toString("base64"),
              mediaType: "application/pdf" as const,
            },
            {
              type: "text" as const,
              text: "Extract all questions from this answer sheet. For each question provide: its number, type (multiple_choice, short_answer, or true_false), the correct answer, a brief explanation of why it is correct, and the point value (default 1 if not shown). Return all questions you find.",
            },
          ],
        },
      ],
      schema: z.object({
        questions: z.array(
          z.object({
            questionNumber: z.number(),
            questionType: z.enum([
              "multiple_choice",
              "short_answer",
              "true_false",
            ]),
            correctAnswer: z.string(),
            explanation: z.string(),
            points: z.number().default(1),
          }),
        ),
      }),
    }),
  ]);

  const pagesPerStudent = pdfDoc.getPageCount();
  const questions = aiResult.object.questions;

  // Delete any existing answer key rows and insert fresh ones
  await db
    .delete(gradingAnswerKey)
    .where(eq(gradingAnswerKey.sessionId, sessionId));

  if (questions.length > 0) {
    await db.insert(gradingAnswerKey).values(
      questions.map((q) => ({
        sessionId,
        questionNumber: q.questionNumber,
        questionType: q.questionType,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points,
      })),
    );
  }

  await db
    .update(gradingSession)
    .set({ status: "answer_key_ready", pagesPerStudent })
    .where(eq(gradingSession.id, sessionId));

  return { questions };
}

export async function updateAnswerKey(
  sessionId: string,
  questions: AnswerKeyQuestion[],
): Promise<{ success: true } | { error: string }> {
  const session = await getTeacherSession();
  if (!session) return { error: "Unauthorized" };

  await db
    .delete(gradingAnswerKey)
    .where(eq(gradingAnswerKey.sessionId, sessionId));

  if (questions.length > 0) {
    await db.insert(gradingAnswerKey).values(
      questions.map((q) => ({
        sessionId,
        questionNumber: q.questionNumber,
        questionType: q.questionType,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation ?? "",
        points: q.points,
      })),
    );
  }

  return { success: true };
}

export async function uploadFullScanAndTrigger(
  sessionId: string,
  fileBuffer: ArrayBuffer,
): Promise<{ success: true } | { error: string }> {
  const teacher = await getTeacherSession();
  if (!teacher) return { error: "Unauthorized" };

  const r2Key = gradingFullScanKey(teacher.userId, sessionId);
  await putR2Object(r2Key, Buffer.from(fileBuffer), "application/pdf");

  await db
    .update(gradingSession)
    .set({ fullScanR2Key: r2Key })
    .where(eq(gradingSession.id, sessionId));

  // Kick off the durable workflow in the background
  await start(gradingWorkflow, [sessionId]);

  return { success: true };
}

export async function getGradingSession(
  sessionId: string,
): Promise<
  | (GradingSession & {
      answerKey: GradingAnswerKey[];
      results: GradingResult[];
    })
  | null
> {
  const teacher = await getTeacherSession();
  if (!teacher) return null;

  const session = await db.query.gradingSession.findFirst({
    where: eq(gradingSession.id, sessionId),
    with: {
      answerKey: { orderBy: (t, { asc }) => asc(t.questionNumber) },
      results: { orderBy: (t, { asc }) => asc(t.studentIndex) },
    },
  });

  if (!session || session.userId !== teacher.userId) return null;
  return session;
}

export async function listGradingSessions(): Promise<GradingSession[]> {
  const teacher = await getTeacherSession();
  if (!teacher) return [];

  return db.query.gradingSession.findMany({
    where: eq(gradingSession.userId, teacher.userId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  });
}
