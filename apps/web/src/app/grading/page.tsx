import Link from "next/link";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { listGradingSessions } from "./actions";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  answer_key_ready: "Answer Key Ready",
  processing: "Processing…",
  complete: "Complete",
  error: "Error",
};

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  answer_key_ready:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  processing:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  complete:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default async function GradingPage() {
  const sessions = await listGradingSessions();

  return (
    <div className="mx-auto w-full">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Grading</PageHeaderTitle>
          <PageHeaderDescription>
            Grade assignments faster than ever before
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild>
            <Link href="/grading/new">New Session</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <div className="space-y-8 px-8">
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <p className="mb-4 text-lg">No grading sessions yet</p>
            <Button className="text-foreground" asChild variant="outline">
              <Link href="/grading/new">Start grading</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={
                  session.status === "complete"
                    ? `/grading/${session.id}`
                    : `/grading/new?session=${session.id}`
                }
                className="flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50"
              >
                <div>
                  <p className="font-medium">{session.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {new Date(session.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-medium text-xs ${statusColor[session.status] ?? statusColor.draft}`}
                >
                  {statusLabel[session.status] ?? session.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
