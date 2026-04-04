import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { getChatMessages } from "@/ai/utils/chat-messages";
import { auth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { chatId } = await params;
  const messages = await getChatMessages(session.user.id, chatId);

  return new Response(JSON.stringify({ messages }), {
    headers: { "Content-Type": "application/json" },
  });
}
