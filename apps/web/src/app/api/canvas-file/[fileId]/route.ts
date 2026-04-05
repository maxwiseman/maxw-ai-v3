import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getCanvasClient } from "@/lib/canvas-client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const authData = await auth.api.getSession({ headers: await headers() });
  if (!authData) return new Response("Unauthorized", { status: 401 });

  const result = await getCanvasClient(authData.user.id);
  if (result.error) return new Response("Canvas not configured", { status: 400 });

  const { fileId } = await params;

  // Fetch file metadata to get the CDN download URL and filename
  const fileMeta = await result.canvas.files.retrieve(Number(fileId));

  if (!fileMeta?.url) return new Response("File not found", { status: 404 });

  // Fetch the actual file bytes from the CDN URL (pre-authenticated)
  const fileResponse = await fetch(fileMeta.url);
  if (!fileResponse.ok)
    return new Response("Failed to fetch file", {
      status: fileResponse.status,
    });

  const contentType =
    fileMeta.content_type ||
    fileResponse.headers.get("content-type") ||
    "application/octet-stream";
  const filename = fileMeta.display_name || fileMeta.filename || "file";

  return new Response(fileResponse.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
