"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type AnswerKeyQuestion,
  createGradingSession,
  generateAnswerKey,
  getGradingSession,
  updateAnswerKey,
  uploadBlankPdf,
  uploadFullScanAndTrigger,
} from "../actions";

type Step =
  | "upload-blank"
  | "review-key"
  | "upload-scan"
  | "processing"
  | "results";

type StudentResult = {
  studentIndex: number;
  studentName?: string | null;
  score?: number | null;
  maxScore?: number | null;
};

export default function NewGradingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeSessionId = searchParams.get("session");

  const [step, setStep] = useState<Step>("upload-blank");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [blankFile, setBlankFile] = useState<File | null>(null);
  const [fullScanFile, setFullScanFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<AnswerKeyQuestion[]>([]);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resume a session in progress
  useEffect(() => {
    if (!resumeSessionId) return;
    startTransition(async () => {
      const session = await getGradingSession(resumeSessionId);
      if (!session) return;
      setSessionId(resumeSessionId);
      if (session.status === "complete") {
        setResults(
          session.results.map((r) => ({
            studentIndex: r.studentIndex,
            studentName: r.studentName,
            score: r.score,
            maxScore: r.maxScore,
          })),
        );
        setStep("results");
      } else if (
        session.status === "processing" ||
        session.status === "answer_key_ready"
      ) {
        if (session.answerKey.length > 0) {
          setQuestions(
            session.answerKey.map((q) => ({
              questionNumber: q.questionNumber,
              questionType: q.questionType,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation ?? "",
              points: q.points,
            })),
          );
        }
        if (session.status === "processing") {
          setStep("processing");
          startPolling(resumeSessionId);
        } else {
          setStep("review-key");
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSessionId]);

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const session = await getGradingSession(id);
      if (!session) return;

      if (session.status === "complete") {
        clearInterval(pollRef.current!);
        setResults(
          session.results.map((r) => ({
            studentIndex: r.studentIndex,
            studentName: r.studentName,
            score: r.score,
            maxScore: r.maxScore,
          })),
        );
        setStep("results");
      } else if (session.status === "error") {
        clearInterval(pollRef.current!);
        setError(session.errorMessage ?? "An error occurred during processing");
        setStep("upload-scan");
      } else if (session.status === "processing") {
        const graded = session.results.filter((r) => r.gradedAt).length;
        const total = session.results.length;
        if (total > 0) {
          setStatusText(
            graded === total
              ? "Finalizing…"
              : `Grading students… (${graded}/${total})`,
          );
        }
      }
    }, 3000);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Step 1: Upload blank answer sheet ────────────────────────────────────
  function handleUploadBlank(e: React.FormEvent) {
    e.preventDefault();
    if (!blankFile) return;
    setError("");

    startTransition(async () => {
      let sid = sessionId;

      if (!sid) {
        const result = await createGradingSession(
          title.trim() || "Grading Session",
        );
        if ("error" in result) {
          setError(result.error);
          return;
        }
        sid = result.sessionId;
        setSessionId(sid);
      }

      const uploadResult = await uploadBlankPdf(
        sid,
        await blankFile.arrayBuffer(),
      );
      if ("error" in uploadResult) {
        setError(uploadResult.error);
        return;
      }

      setStatusText("Analyzing answer sheet with Claude…");
      const keyResult = await generateAnswerKey(sid);
      if ("error" in keyResult) {
        setError(keyResult.error);
        return;
      }

      setQuestions(keyResult.questions);
      setStep("review-key");
    });
  }

  // ── Step 2: Edit answer key ───────────────────────────────────────────────
  function updateQuestion(index: number, patch: Partial<AnswerKeyQuestion>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function addQuestion() {
    const nextNum =
      questions.length > 0
        ? Math.max(...questions.map((q) => q.questionNumber)) + 1
        : 1;
    setQuestions((prev) => [
      ...prev,
      {
        questionNumber: nextNum,
        questionType: "short_answer",
        correctAnswer: "",
        explanation: "",
        points: 1,
      },
    ]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    setError("");

    startTransition(async () => {
      const result = await updateAnswerKey(sessionId, questions);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStep("upload-scan");
    });
  }

  // ── Step 3: Upload full scan ──────────────────────────────────────────────
  function handleUploadScan(e: React.FormEvent) {
    e.preventDefault();
    if (!fullScanFile || !sessionId) return;
    setError("");

    startTransition(async () => {
      setStatusText("Uploading…");
      const result = await uploadFullScanAndTrigger(
        sessionId,
        await fullScanFile.arrayBuffer(),
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStatusText("Processing started…");
      setStep("processing");
      startPolling(sessionId);
    });
  }

  // ── Step indicator ────────────────────────────────────────────────────────
  const STEPS: { key: Step; label: string }[] = [
    { key: "upload-blank", label: "Answer Sheet" },
    { key: "review-key", label: "Answer Key" },
    { key: "upload-scan", label: "Class Scan" },
    { key: "processing", label: "Processing" },
    { key: "results", label: "Results" },
  ];

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Step indicator */}
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full font-semibold text-xs",
                i < stepIndex && "bg-primary text-primary-foreground",
                i === stepIndex &&
                  "bg-primary text-primary-foreground ring-2 ring-primary/30",
                i > stepIndex && "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                i === stepIndex ? "font-medium" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 text-muted-foreground">→</span>
            )}
          </li>
        ))}
      </ol>

      {/* ── Step 1 ── */}
      {step === "upload-blank" && (
        <form onSubmit={handleUploadBlank} className="space-y-5">
          <div>
            <h2 className="font-semibold text-xl">Upload Blank Answer Sheet</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Claude will extract questions and generate an answer key.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Session Title</Label>
            <Input
              id="title"
              placeholder="e.g. Chapter 5 Quiz"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blank-pdf">Blank Answer Sheet (PDF)</Label>
            <Input
              id="blank-pdf"
              type="file"
              accept=".pdf"
              disabled={isPending}
              onChange={(e) => setBlankFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>

          {error && <ErrorBox>{error}</ErrorBox>}

          <Button
            type="submit"
            disabled={isPending || !blankFile}
            className="w-full"
          >
            {isPending ? statusText || "Analyzing…" : "Continue"}
          </Button>
        </form>
      )}

      {/* ── Step 2 ── */}
      {step === "review-key" && (
        <form onSubmit={handleSaveKey} className="space-y-5">
          <div>
            <h2 className="font-semibold text-xl">Review Answer Key</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Claude extracted {questions.length} question
              {questions.length !== 1 ? "s" : ""}. Edit as needed.
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-sm">
                    Q{q.questionNumber}
                  </span>
                  <Select
                    value={q.questionType}
                    onValueChange={(v) =>
                      updateQuestion(i, {
                        questionType: v as AnswerKeyQuestion["questionType"],
                      })
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">
                        Multiple Choice
                      </SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                      <SelectItem value="true_false">True / False</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={q.points}
                    onChange={(e) =>
                      updateQuestion(i, { points: Number(e.target.value) })
                    }
                  />
                  <span className="text-muted-foreground text-xs">pts</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(i)}
                    className="text-destructive hover:text-destructive"
                  >
                    ✕
                  </Button>
                </div>
                <Input
                  placeholder="Correct answer"
                  value={q.correctAnswer}
                  onChange={(e) =>
                    updateQuestion(i, { correctAnswer: e.target.value })
                  }
                  required
                />
                <Input
                  placeholder="Explanation (optional)"
                  value={q.explanation}
                  onChange={(e) =>
                    updateQuestion(i, { explanation: e.target.value })
                  }
                />
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addQuestion}
            className="w-full"
          >
            + Add Question
          </Button>

          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("upload-blank")}
              disabled={isPending}
              className="flex-1"
            >
              Back
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Saving…" : "Save & Continue"}
            </Button>
          </div>
        </form>
      )}

      {/* ── Step 3 ── */}
      {step === "upload-scan" && (
        <form onSubmit={handleUploadScan} className="space-y-5">
          <div>
            <h2 className="font-semibold text-xl">Upload Full Class Scan</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Upload the scanned PDF of all students' work. It will be split
              automatically using the blank answer sheet's page count.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scan-pdf">Full Class Scan (PDF)</Label>
            <Input
              id="scan-pdf"
              type="file"
              accept=".pdf"
              disabled={isPending}
              onChange={(e) => setFullScanFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>

          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("review-key")}
              disabled={isPending}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isPending || !fullScanFile}
              className="flex-1"
            >
              {isPending ? statusText || "Uploading…" : "Grade"}
            </Button>
          </div>
        </form>
      )}

      {/* ── Processing ── */}
      {step === "processing" && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-muted-foreground">
            {statusText || "Processing… this may take a few minutes"}
          </p>
          <p className="text-muted-foreground text-xs">
            You can safely close this page. Come back to check progress.
          </p>
        </div>
      )}

      {/* ── Results ── */}
      {step === "results" && sessionId && (
        <div className="space-y-5">
          <div>
            <h2 className="font-semibold text-xl">Results</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Graded {results.length} student{results.length !== 1 ? "s" : ""}.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-right font-medium">Score</th>
                  <th className="px-4 py-3 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((r) => {
                  const pct =
                    r.maxScore && r.score != null
                      ? Math.round((r.score / r.maxScore) * 100)
                      : null;
                  return (
                    <tr key={r.studentIndex} className="hover:bg-muted/25">
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.studentIndex + 1}
                      </td>
                      <td className="px-4 py-3">
                        {r.studentName ?? (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.score ?? "—"}/{r.maxScore ?? "—"}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-medium",
                          pct != null &&
                            pct >= 90 &&
                            "text-green-600 dark:text-green-400",
                          pct != null &&
                            pct < 60 &&
                            "text-red-600 dark:text-red-400",
                        )}
                      >
                        {pct != null ? `${pct}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Button asChild className="w-full">
            <a href={`/grading/${sessionId}`}>View Full Results</a>
          </Button>
        </div>
      )}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-destructive/10 px-4 py-2 text-destructive text-sm">
      {children}
    </div>
  );
}
