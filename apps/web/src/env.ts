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
    OPENAI_API_KEY: z.string().min(1),
    /**
     * Optional override for the URL the Daytona sandbox uses to call `/api/sandbox/sync`.
     * Set to your `*.vercel.app` host if you use a custom domain publicly: Daytona Tier 1/2
     * only allowlists `*.vercel.app` (not arbitrary domains), so sync would fail with
     * "connection reset" while `NEXT_PUBLIC_SERVER_URL` stays `https://your-domain.com`.
     */
    SANDBOX_SYNC_API_URL: z.url().optional(),
  },
  client: {
    NEXT_PUBLIC_UPSTASH_SEARCH_TOKEN: z.string().optional(),
    /** Public app origin (browser, OAuth, links). Not necessarily the same host sandboxes use for sync — see SANDBOX_SYNC_API_URL. */
    NEXT_PUBLIC_SERVER_URL: z.url().optional(),
  },
  // @ts-expect-error -- This does contain all the correct data, it's just not typed
  experimental__runtimeEnv: process.env,
  skipValidation: !process.env.DATABASE_URL,
});
