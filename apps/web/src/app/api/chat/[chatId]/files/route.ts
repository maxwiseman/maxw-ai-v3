import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { sandboxFile } from "@/db/schema/sandbox-files";
import { auth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { chatId } = await params;

  const files = await db
    .select()
    .from(sandboxFile)
    .where(
      and(
        eq(sandboxFile.chatId, chatId),
        eq(sandboxFile.userId, authData.user.id),
      ),
    )
    .orderBy(desc(sandboxFile.createdAt));

  // Return proxy URLs instead of raw private blob URLs
  return Response.json(
    files.map((f) => ({
      ...f,
      downloadUrl: `/api/sandbox-files/${f.id}`,
    })),
  );
}
