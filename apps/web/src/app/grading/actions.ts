"use server";

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { PDFDocument } from "pdf-lib";
import { start } from "workflow/api";
import z from "zod/v4";
import { getR2SignedUrl, putR2Object } from "@/ai/sandbox/r2-client";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import {
  type GradingAnswerKey,
  type GradingResult,
  type GradingSession,
  gradingAnswerKey,
  gradingSession,
  type MultipleChoiceDetails,
  type OtherDetails,
  type QuestionDetails,
  type ShortAnswerDetails,
} from "@/db/schema/grading";
import { auth } from "@/lib/auth";
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
  /** Stable UUID — persists across saves so it can be used as a React key */
  id: string;
  /** String label, e.g. "1", "1B", "2a" */
  questionNumber: string;
  questionType: "multiple_choice" | "short_answer" | "other";
  details: QuestionDetails;
  points: number;
};

// Zod schemas for each question type (used in generateObject)
const mcSchema = z.object({
  questionNumber: z.string(),
  questionType: z.literal("multiple_choice"),
  details: z.object({
    prompt: z.string(),
    options: z.array(z.object({ text: z.string(), correct: z.boolean() })),
  }),
  points: z.number().default(1),
});

const saSchema = z.object({
  questionNumber: z.string(),
  questionType: z.literal("short_answer"),
  details: z.object({
    prompt: z.string(),
    sampleAnswer: z.string(),
    explanation: z.string().optional(),
    criteria: z.array(z.string()).optional(),
  }),
  points: z.number().default(1),
});

const otherSchema = z.object({
  questionNumber: z.string(),
  questionType: z.literal("other"),
  details: z.object({
    prompt: z.string(),
    answer: z.string(),
    explanation: z.string().optional(),
  }),
  points: z.number().default(1),
});

const answerKeySchema = z.object({
  questions: z.array(
    z.discriminatedUnion("questionType", [mcSchema, saSchema, otherSchema]),
  ),
});

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
              text: `Extract all questions from this answer sheet. For each question provide:
- questionNumber: the question label as a string (e.g. "1", "1B", "2a")
- questionType: "multiple_choice" for MC and true/false questions, "short_answer" for free-response, "other" for anything else
- details: type-specific fields
  - multiple_choice: { prompt, options: [{ text, correct }] } — mark all correct options
  - short_answer: { prompt, sampleAnswer, explanation?, criteria? } — criteria are things that must appear (or must not appear) in a correct response
  - other: { prompt, answer, explanation? }
- points: point value (default 1 if not shown)

Return every question you find.`,
            },
          ],
        },
      ],
      schema: answerKeySchema,
    }),
  ]);

  const pagesPerStudent = pdfDoc.getPageCount();
  const questions = aiResult.object.questions;

  // Delete any existing answer key rows and insert fresh ones
  await db
    .delete(gradingAnswerKey)
    .where(eq(gradingAnswerKey.sessionId, sessionId));

  let inserted: GradingAnswerKey[] = [];
  if (questions.length > 0) {
    inserted = await db
      .insert(gradingAnswerKey)
      .values(
        questions.map((q) => ({
          sessionId,
          questionNumber: q.questionNumber,
          questionType: q.questionType,
          details: q.details as QuestionDetails,
          points: q.points,
        })),
      )
      .returning();
  }

  await db
    .update(gradingSession)
    .set({ status: "answer_key_ready", pagesPerStudent })
    .where(eq(gradingSession.id, sessionId));

  return {
    questions: inserted.map((row) => ({
      id: row.id,
      questionNumber: row.questionNumber,
      questionType: row.questionType,
      details: row.details as QuestionDetails,
      points: row.points,
    })),
  };
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
        id: q.id,
        sessionId,
        questionNumber: q.questionNumber,
        questionType: q.questionType,
        details: q.details,
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

export async function getGradingSession(sessionId: string): Promise<
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

// Re-export detail types for convenience in UI files
export type {
  MultipleChoiceDetails,
  ShortAnswerDetails,
  OtherDetails,
  QuestionDetails,
};
