"use client";

export const dynamic = "force-static";

import { IconNotebook } from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DateDisplay } from "@/components/date-display";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderTitle,
} from "@/components/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { useClassAssignments } from "../../use-classes";

export default function ClassAssignmentsPage() {
  const params = useParams<{ classId: string }>();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data, isLoading, isError } = useClassAssignments(params.classId);

  if (sessionPending) {
    return <AssignmentsPageSkeleton />;
  }

  if (!session?.user) {
    return <NotAuthenticated />;
  }

  if (isLoading) {
    return <AssignmentsPageSkeleton />;
  }

  if (isError || typeof data === "string") {
    return (
      <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
        {typeof data === "string" ? data : "Error loading assignments"}
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Assignments</PageHeaderTitle>
        </PageHeaderContent>
      </PageHeader>
      <Accordion
        className="space-y-2 px-8 pb-8"
        type="multiple"
        defaultValue={["upcoming", "past", "undated"]}
      >
        <AccordionItem
          className="rounded-md border bg-background px-4 py-1 outline-none last:border-b has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
          value={"upcoming"}
        >
          <AccordionTrigger className="[&>svg]:-order-1 justify-start gap-3 py-2 text-[15px] leading-6 hover:no-underline focus-visible:ring-0 [&>svg]:size-5">
            Upcoming Assignments
          </AccordionTrigger>
          <AccordionContent className="divide-y pb-1">
            {data
              ?.filter(
                (a) =>
                  a.due_at &&
                  new Date(a.due_at).getDate() >= new Date().getDate(),
              )
              .map((assignment) => (
                <Link
                  href={`/classes/${params.classId}/assignments/${assignment.id}`}
                  className="group ml-8 flex items-center gap-2 py-4 hover:underline"
                  key={assignment.id}
                >
                  <IconNotebook className="size-5 text-muted-foreground" />
                  <div>
                    {assignment.name}
                    {assignment.due_at && (
                      <DateDisplay
                        className="block text-muted-foreground text-xs decoration-muted-foreground group-hover:underline"
                        date={assignment.due_at}
                        options={{ dateStyle: "medium", timeStyle: "short" }}
                      />
                    )}
                  </div>
                </Link>
              ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem
          className="rounded-md border bg-background px-4 py-1 outline-none last:border-b has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
          value={"past"}
        >
          <AccordionTrigger className="[&>svg]:-order-1 justify-start gap-3 py-2 text-[15px] leading-6 hover:no-underline focus-visible:ring-0 [&>svg]:size-5">
            Past Assignments
          </AccordionTrigger>
          <AccordionContent className="divide-y pb-1">
            {data
              ?.filter(
                (a) =>
                  a.due_at &&
                  new Date(a.due_at).getDate() <= new Date().getDate(),
              )
              .map((assignment) => (
                <Link
                  href={`/classes/${params.classId}/assignments/${assignment.id}`}
                  className="group ml-8 flex items-center gap-2 py-4 hover:underline"
                  key={assignment.id}
                >
                  <IconNotebook className="size-5 text-muted-foreground" />
                  <div className="">
                    {assignment.name}
                    {assignment.due_at && (
                      <DateDisplay
                        className="block text-muted-foreground text-xs decoration-muted-foreground group-hover:underline"
                        date={assignment.due_at}
                        options={{ dateStyle: "medium", timeStyle: "short" }}
                      />
                    )}
                  </div>
                </Link>
              ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem
          className="rounded-md border bg-background px-4 py-1 outline-none last:border-b has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
          value={"undated"}
        >
          <AccordionTrigger className="[&>svg]:-order-1 justify-start gap-3 py-2 text-[15px] leading-6 hover:no-underline focus-visible:ring-0 [&>svg]:size-5">
            Undated Assignments
          </AccordionTrigger>
          <AccordionContent className="divide-y pb-1">
            {data
              ?.filter((a) => !a.due_at)
              .map((assignment) => (
                <Link
                  href={`/classes/${params.classId}/assignments/${assignment.id}`}
                  className="ml-8 flex items-center gap-2 py-4 hover:underline"
                  key={assignment.id}
                >
                  <IconNotebook className="size-5 text-muted-foreground" />
                  {assignment.name}
                </Link>
              ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function AssignmentsPageSkeleton() {
  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Assignments</PageHeaderTitle>
        </PageHeaderContent>
      </PageHeader>
      <div className="space-y-2 px-8 pb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`skeleton-${i}`}
            className="rounded-md border bg-background px-4 py-3"
          >
            <Skeleton className="h-6 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}
