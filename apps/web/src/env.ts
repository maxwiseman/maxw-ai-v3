import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(1),
  },
  client: {},
  experimental__runtimeEnv: process.env,
  skipValidation: !process.env.DATABASE_URL,
});
