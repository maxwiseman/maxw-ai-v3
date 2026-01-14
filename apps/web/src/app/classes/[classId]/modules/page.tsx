"use client";

export const dynamic = "force-static";

import {
  type Icon,
  IconChecklist,
  IconFile,
  IconFileDescription,
  IconFileDots,
  IconLink,
  IconMessage,
  IconNotebook,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ComponentProps } from "react";
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
import { moduleItemDetailsUrl } from "@/lib/canvas-helpers";
import type { CanvasModuleItem, CanvasModuleItemType } from "@/types/canvas";
import { useClassModules } from "../../use-classes";

export default function ClassModulesPage() {
  const params = useParams<{ classId: string }>();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data, isLoading, isError } = useClassModules(params.classId);

  if (sessionPending) {
    return <ModulesPageSkeleton />;
  }

  if (!session?.user) {
    return <NotAuthenticated />;
  }

  if (isLoading) {
    return <ModulesPageSkeleton />;
  }

  if (isError || typeof data === "string") {
    return (
      <div className="grid size-full max-h-96 place-items-center text-muted-foreground">
        {typeof data === "string" ? data : "Error loading modules"}
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Modules</PageHeaderTitle>
        </PageHeaderContent>
      </PageHeader>
      <Accordion className="space-y-2 px-8 pb-8" collapsible type="single">
        {typeof data === "object" &&
          data?.map((module) => (
            <AccordionItem
              className="rounded-md border bg-background px-4 py-1 outline-none last:border-b has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
              key={module.id}
              value={module.id.toString()}
            >
              <AccordionTrigger className="[&>svg]:-order-1 justify-start gap-3 py-2 text-[15px] leading-6 hover:no-underline focus-visible:ring-0 [&>svg]:size-5">
                {module.name}
              </AccordionTrigger>
              <AccordionContent className="divide-y pb-1">
                {module.items?.map((item) => (
                  <ModuleItem
                    key={item.id}
                    item={item}
                    classId={params.classId}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    </div>
  );
}

const moduleItemIcons: Partial<Record<CanvasModuleItemType, Icon>> = {
  Assignment: IconNotebook,
  File: IconFile,
  Page: IconFileDescription,
  Quiz: IconChecklist,
  Discussion: IconMessage,
  ExternalUrl: IconLink,
};

function ModuleItem({
  item,
  classId,
}: {
  item: CanvasModuleItem;
  classId: string;
}) {
  const Icon = moduleItemIcons[item.type] ?? IconFileDots;

  if (classId === undefined) return;

  if (item.type === "SubHeader")
    return (
      <div className="flex items-center gap-2 py-4 font-medium">
        {item.title}
      </div>
    );

  return (
    <Link
      href={
        (moduleItemDetailsUrl(classId, item) as ComponentProps<
          typeof Link
        >["href"]) ?? ""
      }
      className="group ml-8 flex items-center gap-2 py-4 hover:underline"
      key={item.id}
      target={item.type === "ExternalUrl" ? "_blank" : undefined}
    >
      <Icon className="size-5 text-muted-foreground" />
      <div>
        {item.title}
        {item.content_details?.due_at && (
          <DateDisplay
            className="block text-muted-foreground text-xs decoration-muted-foreground group-hover:underline"
            date={item.content_details?.due_at}
            options={{ dateStyle: "medium", timeStyle: "short" }}
          />
        )}
      </div>
    </Link>
  );
}

function ModulesPageSkeleton() {
  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Modules</PageHeaderTitle>
        </PageHeaderContent>
      </PageHeader>
      <div className="space-y-2 px-8 pb-8">
        {Array.from({ length: 4 }).map((_, i) => (
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
