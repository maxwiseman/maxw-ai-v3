"use client";

import { useSearchParams } from "next/navigation";
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
import type {
  MultipleChoiceDetails,
  OtherDetails,
  ShortAnswerDetails,
} from "@/db/schema/grading";
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

// ── Default details per question type ────────────────────────────────────────

function defaultDetails(
  type: AnswerKeyQuestion["questionType"],
): AnswerKeyQuestion["details"] {
  if (type === "multiple_choice")
    return { prompt: "", options: [] } satisfies MultipleChoiceDetails;
  if (type === "short_answer")
    return {
      prompt: "",
      sampleAnswer: "",
      explanation: "",
      criteria: [],
    } satisfies ShortAnswerDetails;
  return { prompt: "", answer: "", explanation: "" } satisfies OtherDetails;
}

export default function NewGradingPage() {
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: startPolling is stable at mount
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
              id: q.id,
              questionNumber: q.questionNumber,
              questionType: q.questionType,
              details: q.details as AnswerKeyQuestion["details"],
              points: q.points,
              sortOrder: q.sortOrder,
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
  }, [resumeSessionId]);

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const session = await getGradingSession(id);
      if (!session) return;

      if (session.status === "complete") {
        if (pollRef.current) clearInterval(pollRef.current);
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
        if (pollRef.current) clearInterval(pollRef.current);
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

  function setQuestion(index: number, q: AnswerKeyQuestion) {
    setQuestions((prev) => prev.map((old, i) => (i === index ? q : old)));
  }

  function patchDetails(index: number, patch: Record<string, unknown>) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index ? { ...q, details: { ...q.details, ...patch } } : q,
      ),
    );
  }

  function changeType(
    index: number,
    newType: AnswerKeyQuestion["questionType"],
  ) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? { ...q, questionType: newType, details: defaultDetails(newType) }
          : q,
      ),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        questionNumber: String(prev.length + 1),
        questionType: "short_answer",
        details: defaultDetails("short_answer"),
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
              <QuestionEditor
                key={q.id}
                question={q}
                onChange={(updated) => setQuestion(i, updated)}
                onPatchDetails={(patch) => patchDetails(i, patch)}
                onChangeType={(type) => changeType(i, type)}
                onRemove={() => removeQuestion(i)}
              />
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

// ── Question editor component ─────────────────────────────────────────────────

function QuestionEditor({
  question: q,
  onChange,
  onPatchDetails,
  onChangeType,
  onRemove,
}: {
  question: AnswerKeyQuestion;
  onChange: (q: AnswerKeyQuestion) => void;
  onPatchDetails: (patch: Record<string, unknown>) => void;
  onChangeType: (type: AnswerKeyQuestion["questionType"]) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      {/* Header row: question number, type, points, remove */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Q</span>
        <Input
          className="w-16"
          placeholder="1"
          value={q.questionNumber}
          onChange={(e) => onChange({ ...q, questionNumber: e.target.value })}
          required
        />
        <Select
          value={q.questionType}
          onValueChange={(v) =>
            onChangeType(v as AnswerKeyQuestion["questionType"])
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
            <SelectItem value="short_answer">Short Answer</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={1}
          className="w-16"
          value={q.points}
          onChange={(e) => onChange({ ...q, points: Number(e.target.value) })}
        />
        <span className="text-muted-foreground text-xs">pts</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="ml-auto text-destructive hover:text-destructive"
        >
          ✕
        </Button>
      </div>

      {/* Type-specific fields */}
      {q.questionType === "multiple_choice" && (
        <MultipleChoiceEditor
          details={q.details as MultipleChoiceDetails}
          onPatch={onPatchDetails}
        />
      )}
      {q.questionType === "short_answer" && (
        <ShortAnswerEditor
          details={q.details as ShortAnswerDetails}
          onPatch={onPatchDetails}
        />
      )}
      {q.questionType === "other" && (
        <OtherEditor
          details={q.details as OtherDetails}
          onPatch={onPatchDetails}
        />
      )}
    </div>
  );
}

function MultipleChoiceEditor({
  details: d,
  onPatch,
}: {
  details: MultipleChoiceDetails;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  function setOptions(
    updater: (
      opts: MultipleChoiceDetails["options"],
    ) => MultipleChoiceDetails["options"],
  ) {
    onPatch({ options: updater(d.options) });
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Prompt"
        value={d.prompt}
        onChange={(e) => onPatch({ prompt: e.target.value })}
        required
      />
      <div className="space-y-1.5 pl-1">
        {d.options.map((opt, oi) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: options have no stable ID
          <div key={oi} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer accent-primary"
              checked={opt.correct}
              onChange={(e) =>
                setOptions((opts) =>
                  opts.map((o, j) =>
                    j === oi ? { ...o, correct: e.target.checked } : o,
                  ),
                )
              }
              title="Mark as correct"
            />
            <Input
              className="w-12 text-center"
              placeholder={String.fromCharCode(65 + oi)}
              value={opt.identifier ?? ""}
              onChange={(e) =>
                setOptions((opts) =>
                  opts.map((o, j) =>
                    j === oi
                      ? { ...o, identifier: e.target.value || undefined }
                      : o,
                  ),
                )
              }
              title="Option identifier"
            />
            <Input
              className="flex-1"
              placeholder={`Option ${oi + 1} text`}
              value={opt.text}
              onChange={(e) =>
                setOptions((opts) =>
                  opts.map((o, j) =>
                    j === oi ? { ...o, text: e.target.value } : o,
                  ),
                )
              }
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setOptions((opts) => opts.filter((_, j) => j !== oi))
              }
              className="shrink-0 text-muted-foreground"
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setOptions((opts) => [
              ...opts,
              {
                identifier: String.fromCharCode(65 + opts.length),
                text: "",
                correct: false,
              },
            ])
          }
        >
          + Option
        </Button>
      </div>
    </div>
  );
}

function ShortAnswerEditor({
  details: d,
  onPatch,
}: {
  details: ShortAnswerDetails;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  function setCriteria(updater: (c: string[]) => string[]) {
    onPatch({ criteria: updater(d.criteria ?? []) });
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Prompt"
        value={d.prompt}
        onChange={(e) => onPatch({ prompt: e.target.value })}
        required
      />
      <Input
        placeholder="Sample answer"
        value={d.sampleAnswer}
        onChange={(e) => onPatch({ sampleAnswer: e.target.value })}
        required
      />
      <Input
        placeholder="Explanation (optional)"
        value={d.explanation ?? ""}
        onChange={(e) => onPatch({ explanation: e.target.value })}
      />
      {/* Criteria list */}
      <div className="space-y-1.5 pl-1">
        <p className="text-muted-foreground text-xs">
          Criteria — things that must (or must not) appear in the response:
        </p>
        {(d.criteria ?? []).map((c, ci) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: criteria have no stable ID
          <div key={ci} className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder={`Criterion ${ci + 1}`}
              value={c}
              onChange={(e) =>
                setCriteria((prev) =>
                  prev.map((x, j) => (j === ci ? e.target.value : x)),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setCriteria((prev) => prev.filter((_, j) => j !== ci))
              }
              className="shrink-0 text-muted-foreground"
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCriteria((prev) => [...prev, ""])}
        >
          + Criterion
        </Button>
      </div>
    </div>
  );
}

function OtherEditor({
  details: d,
  onPatch,
}: {
  details: OtherDetails;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        placeholder="Prompt"
        value={d.prompt}
        onChange={(e) => onPatch({ prompt: e.target.value })}
        required
      />
      <Input
        placeholder="Answer"
        value={d.answer}
        onChange={(e) => onPatch({ answer: e.target.value })}
        required
      />
      <Input
        placeholder="Explanation (optional)"
        value={d.explanation ?? ""}
        onChange={(e) => onPatch({ explanation: e.target.value })}
      />
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
