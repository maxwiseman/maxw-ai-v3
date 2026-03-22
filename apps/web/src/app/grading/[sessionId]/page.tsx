import { notFound } from "next/navigation";
import type {
  MultipleChoiceDetails,
  OtherDetails,
  ShortAnswerDetails,
  StudentAnswer,
} from "@/db/schema/grading";
import { cn } from "@/lib/utils";
import { getGradingSession } from "../actions";

export default async function GradingResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getGradingSession(sessionId);
  if (!session) notFound();

  const maxScore = session.answerKey.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="font-bold text-2xl">{session.title}</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {session.results.length} student
          {session.results.length !== 1 ? "s" : ""} graded · {maxScore} point
          {maxScore !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Answer Key summary */}
      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Answer Key</h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Answer</th>
                <th className="px-4 py-2 text-right font-medium">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {session.answerKey.map((q) => {
                const d = q.details as Record<string, unknown>;
                let answerCell: React.ReactNode;

                if (q.questionType === "multiple_choice") {
                  const det = d as unknown as MultipleChoiceDetails;
                  const correct = det.options
                    .filter((o) => o.correct)
                    .map((o, i) => {
                      const id = o.identifier ?? String.fromCharCode(65 + i);
                      return id.toLowerCase() === o.text.toLowerCase()
                        ? o.text
                        : `${id}) ${o.text}`;
                    });
                  answerCell = (
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {det.prompt}
                      </p>
                      <p className="font-medium">{correct.join(", ") || "—"}</p>
                    </div>
                  );
                } else if (q.questionType === "short_answer") {
                  const det = d as unknown as ShortAnswerDetails;
                  answerCell = (
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-xs">
                        {det.prompt}
                      </p>
                      <p className="font-medium">{det.sampleAnswer}</p>
                      {det.explanation && (
                        <p className="text-muted-foreground text-xs">
                          {det.explanation}
                        </p>
                      )}
                      {det.criteria && det.criteria.length > 0 && (
                        <ul className="list-disc pl-4 text-muted-foreground text-xs">
                          {det.criteria.map((c, i) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: criteria have no stable ID
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                } else {
                  const det = d as unknown as OtherDetails;
                  answerCell = (
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-xs">
                        {det.prompt}
                      </p>
                      <p className="font-medium">{det.answer}</p>
                      {det.explanation && (
                        <p className="text-muted-foreground text-xs">
                          {det.explanation}
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <tr key={q.id}>
                    <td className="px-4 py-2 text-muted-foreground">
                      {q.questionNumber}
                    </td>
                    <td className="px-4 py-2 capitalize">
                      {q.questionType.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2">{answerCell}</td>
                    <td className="px-4 py-2 text-right">{q.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Student results */}
      <section className="space-y-4">
        <h2 className="font-semibold text-lg">Student Results</h2>
        {(() => {
          const questionMap = new Map(
            session.answerKey.map((q) => [q.questionNumber, q]),
          );
          return session.results.map((result) => {
            const pct =
              result.maxScore && result.score != null
                ? Math.round((result.score / result.maxScore) * 100)
                : null;
            const answers = [
              ...((result.answers ?? []) as StudentAnswer[]),
            ].sort(
              (a, b) =>
                (questionMap.get(a.questionNumber)?.sortOrder ?? 0) -
                (questionMap.get(b.questionNumber)?.sortOrder ?? 0),
            );

            return (
              <details key={result.id} className="rounded-xl border">
                <summary className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/25">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">
                      #{result.studentIndex + 1}
                    </span>
                    <span className="font-medium">
                      {result.studentName ?? "Unknown Student"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      {result.score ?? "—"}/{result.maxScore ?? maxScore}
                    </span>
                    {pct != null && (
                      <span
                        className={cn(
                          "font-semibold text-sm",
                          pct >= 90 && "text-green-600 dark:text-green-400",
                          pct >= 70 &&
                            pct < 90 &&
                            "text-yellow-600 dark:text-yellow-400",
                          pct < 70 && "text-red-600 dark:text-red-400",
                        )}
                      >
                        {pct}%
                      </span>
                    )}
                  </div>
                </summary>

                {answers.length > 0 && (
                  <div className="border-t">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">
                            Q#
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Given Answer
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Feedback
                          </th>
                          <th className="px-4 py-2 text-right font-medium">
                            Points
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {answers.map((a) => (
                          <tr key={a.questionNumber}>
                            <td className="px-4 py-2 text-muted-foreground">
                              {a.questionNumber}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1",
                                  a.isCorrect
                                    ? "text-green-700 dark:text-green-400"
                                    : "text-red-700 dark:text-red-400",
                                )}
                              >
                                {a.isCorrect ? "✓" : "✗"} {(() => {
                                  const q = questionMap.get(a.questionNumber);
                                  if (q?.questionType === "multiple_choice") {
                                    const det =
                                      q.details as MultipleChoiceDetails;
                                    const match = det.options.find(
                                      (o, i) =>
                                        (o.identifier ??
                                          String.fromCharCode(65 + i)) ===
                                        a.givenAnswer,
                                    );
                                    if (!match) return a.givenAnswer;
                                    return a.givenAnswer.toLowerCase() ===
                                      match.text.toLowerCase()
                                      ? match.text
                                      : `${a.givenAnswer}) ${match.text}`;
                                  }
                                  return a.givenAnswer;
                                })()}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {a.feedback}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {a.pointsEarned}/
                              {questionMap.get(a.questionNumber)?.points ?? "?"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </details>
            );
          });
        })()}
      </section>
    </div>
  );
}
