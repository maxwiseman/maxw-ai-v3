import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(1),
    UPSTASH_SEARCH_URL: z.url(),
    UPSTASH_SEARCH_TOKEN: z.string(),
    DAYTONA_API_KEY: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    DAYTONA_SNAPSHOT: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_UPSTASH_SEARCH_TOKEN: z.string().optional(),
    /** Public app origin — used by the sandbox sync script to reach /api/sandbox/sync. */
    NEXT_PUBLIC_SERVER_URL: z.url(),
  },
  // @ts-expect-error -- This does contain all the correct data, it's just not typed
  experimental__runtimeEnv: process.env,
  skipValidation: !process.env.DATABASE_URL,
});
