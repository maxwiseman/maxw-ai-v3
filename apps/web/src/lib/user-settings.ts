import { userSettingsSchema } from "@/db/schema/types";

export function getUserSettings(user: unknown) {
  if (!user || typeof user !== "object" || !("settings" in user)) {
    return undefined;
  }

  const parsed = userSettingsSchema.safeParse(user.settings);
  if (!parsed.success) {
    return undefined;
  }

  return parsed.data;
}
