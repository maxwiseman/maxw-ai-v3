/**
 * Skills Tree
 * Builds and caches the merged list of skill files visible to the agent
 * (global skills + user-specific overrides) without starting a sandbox.
 *
 * Cache key:  skills:tree:{userId}
 * TTL:        10 minutes (also explicitly invalidated on skill file changes)
 */

import { Redis } from "@upstash/redis";
import { env } from "@/env";
import {
  GLOBAL_SKILLS_PREFIX,
  listR2Objects,
  userSkillsPrefix,
} from "./r2-client";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const CACHE_KEY = (userId: string) => `skills:tree:${userId}`;
const CACHE_TTL = 10 * 60; // 10 minutes

/**
 * Return a formatted skills tree for the given user, e.g.:
 *
 *   skills/
 *     agent-browser.md
 *     canvas-assignments.md
 *     todo-management.md
 *     my-custom.md  [yours]
 *
 * Global skills are fetched from `global/skills/`, user overrides/additions
 * from `users/{userId}/skills/`. User files win on name collision and are
 * annotated with "[yours]" so the agent knows they can be edited.
 *
 * Returns an empty string if no skills exist yet.
 */
export async function getSkillsTree(userId: string): Promise<string> {
  const cached = await redis.get<string>(CACHE_KEY(userId));
  if (cached !== null) return cached;

  const [globalObjects, userObjects] = await Promise.all([
    listR2Objects(GLOBAL_SKILLS_PREFIX),
    listR2Objects(userSkillsPrefix(userId)),
  ]);

  const globalNames = new Set(
    globalObjects.map((o) => o.key.slice(GLOBAL_SKILLS_PREFIX.length)),
  );
  const userNames = new Set(
    userObjects.map((o) => o.key.slice(userSkillsPrefix(userId).length)),
  );

  const all = new Map<string, "global" | "user">();
  for (const name of globalNames) all.set(name, "global");
  for (const name of userNames) all.set(name, "user"); // user wins on collision

  if (all.size === 0) {
    await redis.set(CACHE_KEY(userId), "", { ex: CACHE_TTL });
    return "";
  }

  const lines = [...all.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([name, source]) => `  ${name}${source === "user" ? "  [yours]" : ""}`,
    );

  const tree = `skills/\n${lines.join("\n")}`;
  await redis.set(CACHE_KEY(userId), tree, { ex: CACHE_TTL });
  return tree;
}

/** Call this whenever a skill file is added, edited, or deleted for a user. */
export async function invalidateSkillsTree(userId: string): Promise<void> {
  await redis.del(CACHE_KEY(userId));
}
