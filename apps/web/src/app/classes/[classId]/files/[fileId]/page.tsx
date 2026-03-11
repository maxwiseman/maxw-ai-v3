"use cache: private";

import { IconDownload } from "@tabler/icons-react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCanvasFile } from "@/app/classes/classes-actions";
import { CanvasFilePreview } from "@/components/canvas-file-preview";
import { NotAuthenticated } from "@/components/not-authenticated";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default async function FilePage({
  params: paramsPromise,
}: {
  params: Promise<{ classId: string; fileId: string }>;
}) {
  cacheLife("weeks");
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return <NotAuthenticated />;

  const { classId, fileId } = await paramsPromise;
  const data = await getCanvasFile({ classId, fileId });

  if (typeof data === "string") notFound();

  return (
    <div>
      <PageHeader className="flex-wrap">
        <PageHeaderContent>
          <PageHeaderTitle>{data.display_name}</PageHeaderTitle>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <a href={data.url} download={data.filename}>
              <IconDownload className="text-muted-foreground" />
              Download
            </a>
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <div className="px-8 pb-8">
        <CanvasFilePreview file={data} />
      </div>
    </div>
  );
}
