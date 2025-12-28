import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(1),
    UPSTASH_SEARCH_URL: z.url(),
    UPSTASH_SEARCH_TOKEN: z.string(),
  },
  client: {
    NEXT_PUBLIC_UPSTASH_SEARCH_TOKEN: z.string().optional(),
  },
  // @ts-expect-error -- This does contain all the correct data, it's just not typed
  experimental__runtimeEnv: process.env,
  skipValidation: !process.env.DATABASE_URL,
});
