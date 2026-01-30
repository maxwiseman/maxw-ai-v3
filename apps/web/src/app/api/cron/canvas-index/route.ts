import type { NextRequest } from "next/server";
import { updateCanvasIndex } from "@/ai/utils/upstash-helpers";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  await updateCanvasIndex();

  return new Response("Canvas index updated", {
    status: 200,
  });
}
