import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { getR2SignedUrl } from "@/ai/sandbox/r2-client";
import { db } from "@/db";
import { sandboxFile } from "@/db/schema/sandbox-files";
import { auth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  // Verify the file exists and belongs to this user
  const file = await db.query.sandboxFile.findFirst({
    where: and(
      eq(sandboxFile.id, id),
      eq(sandboxFile.userId, authData.user.id),
    ),
  });

  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  // Generate a short-lived signed URL and redirect
  const signedUrl = await getR2SignedUrl(file.r2Key, 3600);
  return Response.redirect(signedUrl, 302);
}
