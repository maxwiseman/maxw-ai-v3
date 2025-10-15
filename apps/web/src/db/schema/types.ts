import z from "zod/v4";

export const userSettingsSchema = z.object({
  canvasApiKey: z.string().optional(),
  canvasDomain: z.string().optional(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;
