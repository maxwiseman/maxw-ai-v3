import z from "zod/v4";

export const userSettingsSchema = z.object({
  canvasApiKey: z.string().optional(),
  canvasDomain: z.string().optional(),
  role: z.enum(["student", "teacher"]).default("student"),
  schoolName: z.string().optional(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;
