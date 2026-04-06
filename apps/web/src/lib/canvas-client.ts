/**
 * Shared helper for creating an authenticated {@link CanvasClient} from the
 * current user's stored settings.
 *
 * Usage in server actions and server components:
 * ```ts
 * const result = await getCanvasClient(userId);
 * if (result.error) return result.error;
 * const { canvas } = result;
 * ```
 */

import { CanvasClient } from "@maxw-ai/canvas";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth";

type CanvasClientSuccess = { canvas: CanvasClient; error: null };
type CanvasClientError = { canvas: null; error: "Settings not configured" };

export type GetCanvasClientResult = CanvasClientSuccess | CanvasClientError;

/**
 * Looks up the user's Canvas API key and domain from the database and returns
 * a configured {@link CanvasClient}.
 *
 * @param userId - The authenticated user's ID (from the session).
 */
export async function getCanvasClient(
  userId: string,
): Promise<GetCanvasClientResult> {
  const settings = (
    await db.query.user.findFirst({ where: eq(user.id, userId) })
  )?.settings;

  if (!settings?.canvasApiKey || !settings.canvasDomain) {
    return { canvas: null, error: "Settings not configured" };
  }

  return {
    canvas: new CanvasClient({
      token: settings.canvasApiKey,
      domain: settings.canvasDomain,
    }),
    error: null,
  };
}
