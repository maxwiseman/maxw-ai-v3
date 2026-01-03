import { geolocation } from "@vercel/functions";
import { smoothStream } from "ai";
import type { NextRequest } from "next/server";
import { generalAgent } from "@/ai";
import { buildAppContext } from "@/ai/agents/shared";
import { getAllCanvasCourses } from "@/app/classes/classes-actions";

export async function POST(request: NextRequest) {
  const location = geolocation(request);
  //   const ip = getClientIP(request);
  //   const { success, remaining } = await checkRateLimit(ip);

  //   if (!success) {
  //     return new Response(
  //       JSON.stringify({
  //         error: "Rate limit exceeded. Please try again later.",
  //         remaining,
  //       }),
  //       {
  //         status: 429,
  //         headers: { "Content-Type": "application/json" },
  //       }
  //     );
  //   }

  // Get only the last message from client
  const { message, id, agentChoice, toolChoice } = await request.json();

  if (!message) {
    return new Response(JSON.stringify({ error: "No message provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  //   const userId = `user-${ip}`;

  const classesResponse = await getAllCanvasCourses();
  const classes = typeof classesResponse === "string" ? [] : classesResponse;

  const appContext = buildAppContext({
    userId: "1",
    fullName: "John Doe",
    schoolName: "Harvard University",
    classes,
    locale: "en-US",
    timezone: "America/New_York",
    country: location.country,
    city: location.city,
    region: location.countryRegion,
    chatId: id,
  });

  return generalAgent.toUIMessageStream({
    message,
    strategy: "auto",
    maxRounds: 5,
    maxSteps: 10,
    context: appContext,
    agentChoice,
    toolChoice,
    experimental_transform: smoothStream({ chunking: "word" }),
    sendReasoning: true,
    sendSources: true,
  });
}
