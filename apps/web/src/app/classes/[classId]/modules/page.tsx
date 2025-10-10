"use client";

import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { ClassSidebar } from "../class-sidebar";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClassModules } from "../../classes-actions";
import { notFound, useParams } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CanvasModuleItemType,
  moduleItemDetailsUrl,
  type CanvasModuleItem,
} from "@/lib/canvas-types";
import {
  IconChecklist,
  IconFile,
  IconFileDescription,
  IconFileDots,
  IconLink,
  IconNotebook,
} from "@tabler/icons-react";
import Link from "next/link";

export const useModulesState = create<{
  modulesByClass: Record<string, string>;
  setModulesByClass: (val: Record<string, string>) => void;
}>()(
  persist(
    (set) => ({
      modulesByClass: {},
      setModulesByClass: (val: Record<string, string>) => {
        set((prev) => ({ modulesByClass: { ...prev.modulesByClass, ...val } }));
      },
    }),
    { name: "module-store" }
  )
);

export default function ClassModulesPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string }>;
}) {
  const params = use(paramsPromise);
  const { modulesByClass, setModulesByClass } = useModulesState();
  const { data } = useQuery({
    queryFn: () => getClassModules({ courseId: params.classId }),
    queryKey: ["canvas-course", params.classId, "modules"],
  });

  if (typeof data === "string") notFound();

  return (
    <div>
      <ClassSidebar classId={params.classId} />
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
        className="px-8 space-y-2"
        collapsible
        type="single"
      >
        {data?.map((module) => (
          <AccordionItem
            className="bg-background has-focus-visible:border-ring has-focus-visible:ring-ring/50 rounded-md border px-4 py-1 outline-none last:border-b has-focus-visible:ring-[3px]"
            key={module.id}
            value={module.id.toString()}
          >
            <AccordionTrigger className="justify-start gap-3 py-2 text-[15px] leading-6 hover:no-underline focus-visible:ring-0 [&>svg]:-order-1 [&>svg]:size-5">
              {module.name}
            </AccordionTrigger>
            <AccordionContent className="pb-1 divide-y">
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
  return (
    <Link
      // @ts-expect-error
      href={moduleItemDetailsUrl(classId, item) ?? ""}
      className="flex gap-2 items-center py-4 hover:underline"
      key={item.id}
      target={
        item.type === CanvasModuleItemType.ExternalUrl ? "_blank" : undefined
      }
    >
      <Icon className="text-muted-foreground size-5" />
      {item.title}
    </Link>
  );
}
