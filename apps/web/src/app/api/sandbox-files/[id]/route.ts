import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
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

  // Proxy the private Vercel Blob using our read/write token
  const blobResponse = await fetch(file.blobUrl, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });

  if (!blobResponse.ok) {
    return new Response("Failed to fetch file", {
      status: blobResponse.status,
    });
  }

  return new Response(blobResponse.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${file.filename}"`,
      "Content-Length": String(file.sizeBytes),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
