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
  const { gradingResult, gradingSession } = await import("@/db/schema/grading");
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

async function gradeStudentsStep(sessionId: string) {
  "use step";

  const { db } = await import("@/db");
  const { gradingAnswerKey, gradingResult } = await import(
    "@/db/schema/grading"
  );
  const { openai } = await import("@ai-sdk/openai");
  const { Output, generateText } = await import("ai");
  const { getR2SignedUrl } = await import("@/ai/sandbox/r2-client");
  const { eq, asc } = await import("drizzle-orm");
  const z = (await import("zod/v4")).default;

  const [answerKey, results] = await Promise.all([
    db.query.gradingAnswerKey.findMany({
      where: eq(gradingAnswerKey.sessionId, sessionId),
      orderBy: asc(gradingAnswerKey.sortOrder),
    }),
    db.query.gradingResult.findMany({
      where: eq(gradingResult.sessionId, sessionId),
    }),
  ]);

  const maxScore = answerKey.reduce((sum, q) => sum + q.points, 0);

  // Serialize the answer key into a grading rubric string for the model
  const answerKeyText = answerKey
    .map((q) => {
      const d = q.details as Record<string, unknown>;
      const pts = `${q.points}pt${q.points !== 1 ? "s" : ""}`;

      if (q.questionType === "multiple_choice") {
        const options = d.options as {
          identifier?: string;
          text: string;
          correct: boolean;
        }[];
        const optionList = options
          .map((o, i) => {
            const id = o.identifier ?? String.fromCharCode(65 + i);
            return `${id}) ${o.text}${o.correct ? " (✓)" : ""}`;
          })
          .join(", ");
        const correctIds = options
          .filter((o) => o.correct)
          .map((o, i) => o.identifier ?? String.fromCharCode(65 + i))
          .join(", ");
        return `Q${q.questionNumber} [multiple_choice, ${pts}]: ${d.prompt}\nOptions: ${optionList}\nCorrect identifier: ${correctIds}`;
      }

      if (q.questionType === "short_answer") {
        let text = `Q${q.questionNumber} [short_answer, ${pts}]: ${d.prompt}\nSample answer: ${d.sampleAnswer}`;
        if (d.explanation) text += `\nExplanation: ${d.explanation}`;
        if (Array.isArray(d.criteria) && d.criteria.length > 0) {
          text += `\nRequired criteria: ${(d.criteria as string[]).join("; ")}`;
        }
        return text;
      }

      // other
      let text = `Q${q.questionNumber} [other, ${pts}]: ${d.prompt}\nAnswer: ${d.answer}`;
      if (d.explanation) text += `\nExplanation: ${d.explanation}`;
      return text;
    })
    .join("\n\n");

  const gradingSchema = z.object({
    studentName: z.string().optional(),
    answers: z.array(
      z.object({
        questionNumber: z.string(),
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
      .filter((r) => r.r2Key)
      .map(async (result) => {
        const signedUrl = await getR2SignedUrl(result.r2Key as string, 600);

        const { output: object } = await generateText({
          model: openai("gpt-5.4"),
          output: Output.object({ schema: gradingSchema }),
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "file",
                  data: new URL(signedUrl),
                  mediaType: "application/pdf",
                },
                {
                  type: "text",
                  text: `You are grading a student's exam. Here is the answer key:\n\n${answerKeyText}\n\nFor each question, find the student's answer in the attached PDF, determine if it's correct, assign points, and provide brief feedback explaining why it is right or wrong. Use the question number exactly as shown (e.g. "1B"). For multiple choice questions, set givenAnswer to the option identifier only (e.g., "A", "B", "C", "D") — not the full option text. If you can identify the student's name, include it.`,
                },
              ],
            },
          ],
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

// ─── Status steps ─────────────────────────────────────────────────────────────

async function setStatusProcessingStep(sessionId: string) {
  "use step";
  const { db } = await import("@/db");
  const { gradingSession } = await import("@/db/schema/grading");
  const { eq } = await import("drizzle-orm");
  await db
    .update(gradingSession)
    .set({ status: "processing" })
    .where(eq(gradingSession.id, sessionId));
}

async function setStatusCompleteStep(sessionId: string) {
  "use step";
  const { db } = await import("@/db");
  const { gradingSession } = await import("@/db/schema/grading");
  const { eq } = await import("drizzle-orm");
  await db
    .update(gradingSession)
    .set({ status: "complete" })
    .where(eq(gradingSession.id, sessionId));
}

async function setStatusErrorStep(sessionId: string, errorMessage: string) {
  "use step";
  const { db } = await import("@/db");
  const { gradingSession } = await import("@/db/schema/grading");
  const { eq } = await import("drizzle-orm");
  await db
    .update(gradingSession)
    .set({ status: "error", errorMessage })
    .where(eq(gradingSession.id, sessionId));
}

// ─── Workflow ─────────────────────────────────────────────────────────────────
// "use workflow" functions are sandboxed: no Node.js APIs, no DB, no network.
// They may only call step functions and perform pure control flow.

export async function gradingWorkflow(sessionId: string) {
  "use workflow";

  await setStatusProcessingStep(sessionId);
  try {
    await splitPdfsStep(sessionId);
    await gradeStudentsStep(sessionId);
    await setStatusCompleteStep(sessionId);
  } catch (err) {
    await setStatusErrorStep(
      sessionId,
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  }
}
