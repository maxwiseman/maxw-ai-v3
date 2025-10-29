"use cache: private";

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
// import { useModulesState } from "../../modules-store";
import { eq } from "drizzle-orm";
import type { Prefetch } from "next/dist/build/segment-config/app/app-segment-config";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentProps } from "react";
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
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { moduleItemDetailsUrl } from "@/lib/canvas-helpers";
import {
  type CanvasModule,
  type CanvasModuleItem,
  CanvasModuleItemType,
} from "@/lib/canvas-types";
import { DateDisplay } from "@/components/date-display";

export const unstable_prefetch: Prefetch = {
  mode: "runtime",
  samples: [
    {
      params: {
        classId: "1234567",
      },
      cookies: [
        {
          name: "better-auth.session_token",
          value:
            "y8YE2cBNaOADiF2ttYvpgt8ElyAOGBXl.DAolkZhTDI8C4%2Bw0UbJQj7MrjxyXSOYkNzuWWLtOpck%3D",
        },
      ],
    },
  ],
};

export default async function ClassModulesPage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string }>;
}) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return <NotAuthenticated />;

  const params = await paramsPromise;
  // const { modulesByClass, setModulesByClass } = useModulesState();
  const data = await fetchData({
    userId: authData.user.id,
    classId: params.classId,
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
        // defaultValue={modulesByClass[params.classId]}
        // onValueChange={(newVal) =>
        //   setModulesByClass({ [params.classId]: newVal })
        // }
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
  [CanvasModuleItemType.Assignment]: IconNotebook,
  [CanvasModuleItemType.File]: IconFile,
  [CanvasModuleItemType.Page]: IconFileDescription,
  [CanvasModuleItemType.Quiz]: IconChecklist,
  [CanvasModuleItemType.Discussion]: IconMessage,
  [CanvasModuleItemType.ExternalUrl]: IconLink,
};

function ModuleItem({
  item,
  classId,
}: {
  item: CanvasModuleItem;
  classId: string;
}) {
  const Icon = moduleItemIcons[item.type] ?? IconFileDots;

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
      href={
        (moduleItemDetailsUrl(classId, item) as ComponentProps<
          typeof Link
        >["href"]) ?? ""
      }
      className="ml-8 flex items-center gap-2 py-4 hover:underline"
      key={item.id}
      target={
        item.type === CanvasModuleItemType.ExternalUrl ? "_blank" : undefined
      }
    >
      <Icon className="size-5 text-muted-foreground" />
      <div>
        {item.title}
        {item.content_details?.due_at && <DateDisplay className="block text-muted-foreground text-xs" date={item.content_details?.due_at} options={{dateStyle: "medium", timeStyle: "short"}} />}
      </div>
    </Link>
  );
}

async function fetchData({
  classId,
  userId,
}: {
  classId: string;
  userId: string;
}) {
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, userId) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain)
    return "Settings not configured" as const;
  const data = (await fetch(
    `https://${settings.canvasDomain}/api/v1/courses/${classId}/modules?include[]=items&include[]=content_details`,
    {
      headers: {
        Authorization: `Bearer ${settings.canvasApiKey}`,
      },
    },
  ).then((res) => res.json())) as CanvasModule[];
  return data;
}
