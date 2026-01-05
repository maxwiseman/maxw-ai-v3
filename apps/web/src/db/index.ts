import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";
import { env } from "../env";
import * as authSchema from "./schema/auth";
import * as studySchema from "./schema/study";
import * as todoSchema from "./schema/todo";

neonConfig.webSocketConstructor = ws;

// To work in edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
// neonConfig.poolQueryViaFetch = true

const sql = neon(env.DATABASE_URL ?? process.env.DATABASE_URL);
export const db = drizzle({
  client: sql,
  schema: { ...authSchema, ...studySchema, ...todoSchema },
});
