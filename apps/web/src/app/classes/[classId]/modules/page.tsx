"use client";

import {
  IconChecklist,
  IconFile,
  IconFileDescription,
  IconFileDots,
  IconLink,
  IconNotebook,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { use } from "react";
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
import { moduleItemDetailsUrl } from "@/lib/canvas-helpers";
import {
  type CanvasModuleItem,
  CanvasModuleItemType,
} from "@/lib/canvas-types";
import { getClassModules } from "../../classes-actions";
import { useModulesState } from "../../modules-store";

export default function ClassModulesPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string }>;
}) {
  const params = use(paramsPromise);
  const { modulesByClass, setModulesByClass } = useModulesState();
  const { data } = useQuery({
    queryFn: () => getClassModules(params),
    queryKey: ["canvas-course", params.classId, "modules"],
  });

  if (typeof data === "string") notFound();

  return (
    <div>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Modules</PageHeaderTitle>
        </PageHeaderContent>
      </PageHeader>
      <Accordion
        defaultValue={modulesByClass[params.classId]}
        onValueChange={(newVal) =>
          setModulesByClass({ [params.classId]: newVal })
        }
        className="space-y-2 px-8 pb-8"
        collapsible
        type="single"
      >
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
                {module.items.map((item) => (
                  <ModuleItem key={item.id} item={item} />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    </div>
  );
}

function ModuleItem({ item }: { item: CanvasModuleItem }) {
  const { classId } = useParams<{ classId: string }>();
  const Icon =
    item.type === CanvasModuleItemType.Assignment
      ? IconNotebook
      : item.type === CanvasModuleItemType.File
        ? IconFile
        : item.type === CanvasModuleItemType.Page
          ? IconFileDescription
          : item.type === CanvasModuleItemType.Quiz
            ? IconChecklist
            : item.type === CanvasModuleItemType.ExternalUrl
              ? IconLink
              : IconFileDots;
  console.log(item);
  if (classId === undefined) return;

  if (item.type === CanvasModuleItemType.SubHeader)
    return (
      <div className="flex items-center gap-2 py-4 font-medium">
        {item.title}
      </div>
    );

  return (
    <Link
      // @ts-expect-error
      href={moduleItemDetailsUrl(classId, item) ?? ""}
      className="ml-8 flex items-center gap-2 py-4 hover:underline"
      key={item.id}
      target={
        item.type === CanvasModuleItemType.ExternalUrl ? "_blank" : undefined
      }
    >
      <Icon className="size-5 text-muted-foreground" />
      {item.title}
    </Link>
  );
}
