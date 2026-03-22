// ─── R2 key helpers (no Node.js deps, safe at module level) ─────────────────

export function gradingBlankKey(userId: string, sessionId: string) {
  return `users/${userId}/grading/${sessionId}/blank.pdf`;
}

export function gradingFullScanKey(userId: string, sessionId: string) {
  return `users/${userId}/grading/${sessionId}/full-scan.pdf`;
}

export function gradingStudentKey(
  userId: string,
  sessionId: string,
  index: number,
) {
  return `users/${userId}/grading/${sessionId}/students/${index}.pdf`;
}

// ─── Steps (must be in the same file as the workflow) ────────────────────────
// All heavy imports are done inside each step via dynamic import() so the
// Vercel Workflow bundler doesn't see Node.js modules at the module level.

async function splitPdfsStep(sessionId: string) {
  "use step";

  const { db } = await import("@/db");
  const { gradingResult, gradingSession } = await import(
    "@/db/schema/grading"
  );
  const { getR2SignedUrl, putR2Object } = await import(
    "@/ai/sandbox/r2-client"
  );
  const { PDFDocument } = await import("pdf-lib");
  const { eq } = await import("drizzle-orm");

  const session = await db.query.gradingSession.findFirst({
    where: eq(gradingSession.id, sessionId),
  });
  if (!session?.fullScanR2Key || !session.pagesPerStudent || !session.userId) {
    throw new Error("Session missing required data for splitting");
  }

  const signedUrl = await getR2SignedUrl(session.fullScanR2Key, 600);
  const pdfBytes = await fetch(signedUrl).then((r) => r.arrayBuffer());

  const fullPdf = await PDFDocument.load(pdfBytes);
  const totalPages = fullPdf.getPageCount();
  const pagesPerStudent = session.pagesPerStudent;
  const studentCount = Math.floor(totalPages / pagesPerStudent);

  await Promise.all(
    Array.from({ length: studentCount }, async (_, i) => {
      const studentPdf = await PDFDocument.create();
      const pageIndices = Array.from(
        { length: pagesPerStudent },
        (_, p) => i * pagesPerStudent + p,
      );
      const copiedPages = await studentPdf.copyPages(fullPdf, pageIndices);
      for (const page of copiedPages) {
        studentPdf.addPage(page);
      }
      const studentBytes = await studentPdf.save();
      const r2Key = gradingStudentKey(session.userId, sessionId, i);
      await putR2Object(r2Key, Buffer.from(studentBytes), "application/pdf");

      await db
        .insert(gradingResult)
        .values({ sessionId, studentIndex: i, r2Key })
        .onConflictDoNothing();
    }),
  );
}

async function runOcrStep(sessionId: string) {
  "use step";

  const { db } = await import("@/db");
  const { gradingResult } = await import("@/db/schema/grading");
  const { getR2SignedUrl } = await import("@/ai/sandbox/r2-client");
  const { env } = await import("@/env");
  const { eq } = await import("drizzle-orm");

  const results = await db.query.gradingResult.findMany({
    where: eq(gradingResult.sessionId, sessionId),
  });

  await Promise.all(
    results
      .filter((r) => !r.rawOcrText)
      .map(async (result) => {
        if (!result.r2Key) return;

        const signedUrl = await getR2SignedUrl(result.r2Key, 600);

        const res = await fetch("https://api.mistral.ai/v1/ocr", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistral-ocr-latest",
            document: { type: "url", url: signedUrl },
          }),
        });

        if (!res.ok) {
          throw new Error(
            `Mistral OCR failed for student ${result.studentIndex}: ${res.status}`,
          );
        }

        const data = (await res.json()) as { pages: { markdown: string }[] };
        const rawOcrText = data.pages.map((p) => p.markdown).join("\n\n");

        await db
          .update(gradingResult)
          .set({ rawOcrText })
          .where(eq(gradingResult.id, result.id));
      }),
  );
}

async function gradeStudentsStep(sessionId: string) {
  "use step";

  const { db } = await import("@/db");
  const { gradingAnswerKey, gradingResult } = await import(
    "@/db/schema/grading"
  );
  const { openai } = await import("@ai-sdk/openai");
  const { generateObject } = await import("ai");
  const { eq, asc } = await import("drizzle-orm");
  const z = (await import("zod/v4")).default;

  const [answerKey, results] = await Promise.all([
    db.query.gradingAnswerKey.findMany({
      where: eq(gradingAnswerKey.sessionId, sessionId),
      orderBy: asc(gradingAnswerKey.questionNumber),
    }),
    db.query.gradingResult.findMany({
      where: eq(gradingResult.sessionId, sessionId),
    }),
  ]);

  const maxScore = answerKey.reduce((sum, q) => sum + q.points, 0);
  const answerKeyText = answerKey
    .map(
      (q) =>
        `Q${q.questionNumber} [${q.questionType}, ${q.points}pt${q.points !== 1 ? "s" : ""}]: ${q.correctAnswer}`,
    )
    .join("\n");

  const gradingSchema = z.object({
    studentName: z.string().optional(),
    answers: z.array(
      z.object({
        questionNumber: z.number(),
        givenAnswer: z.string(),
        isCorrect: z.boolean(),
        pointsEarned: z.number(),
        feedback: z.string(),
      }),
    ),
    totalScore: z.number(),
  });

  await Promise.all(
    results
      .filter((r) => !r.gradedAt)
      .filter((r) => r.rawOcrText)
      .map(async (result) => {
        const { object } = await generateObject({
          model: openai("gpt-5"),
          schema: gradingSchema,
          prompt: `You are grading a student's exam. Here is the answer key:\n${answerKeyText}\n\nHere is the student's OCR'd exam text:\n${result.rawOcrText}\n\nFor each question, find the student's answer, determine if it's correct, assign points, and provide brief feedback explaining why it is right or wrong. If you can identify the student's name from the text, include it.`,
        });

        await db
          .update(gradingResult)
          .set({
            studentName: object.studentName ?? null,
            score: object.totalScore,
            maxScore,
            answers: object.answers,
            gradedAt: new Date(),
          })
          .where(eq(gradingResult.id, result.id));
      }),
  );
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

export async function gradingWorkflow(sessionId: string) {
  "use workflow";

  const { db } = await import("@/db");
  const { gradingSession } = await import("@/db/schema/grading");
  const { eq } = await import("drizzle-orm");

  try {
    await db
      .update(gradingSession)
      .set({ status: "processing" })
      .where(eq(gradingSession.id, sessionId));

    await splitPdfsStep(sessionId);
    await runOcrStep(sessionId);
    await gradeStudentsStep(sessionId);

    await db
      .update(gradingSession)
      .set({ status: "complete" })
      .where(eq(gradingSession.id, sessionId));
  } catch (err) {
    await db
      .update(gradingSession)
      .set({
        status: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      .where(eq(gradingSession.id, sessionId));
    throw err;
  }
}
