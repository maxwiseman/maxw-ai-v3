/**
 * Seed global skill files into R2 at `global/skills/`.
 *
 * Run this whenever skill files change (e.g. as part of your deploy pipeline):
 *   bun apps/web/src/ai/sandbox/seed-global-skills.ts
 *
 * These files are read-only from the sandbox's perspective — the sync proxy
 * only allows writes to `users/{userId}/chats/{chatId}/workspace/`, so the
 * sandbox can never overwrite anything under `global/skills/`.
 */

import { readdir, readFile } from "fs/promises";
import path from "path";
import { globalSkillKey, putR2Object } from "./r2-client";

const SKILLS_SRC = path.join(import.meta.dir, "../skills");

const files = await readdir(SKILLS_SRC);
const mdFiles = files.filter((f) => f.endsWith(".md"));

if (mdFiles.length === 0) {
  console.error(`No .md files found in ${SKILLS_SRC}`);
  process.exit(1);
}

console.log(`Seeding ${mdFiles.length} global skill(s) to R2...`);

await Promise.all(
  mdFiles.map(async (filename) => {
    const content = await readFile(path.join(SKILLS_SRC, filename));
    const key = globalSkillKey(filename);
    await putR2Object(key, content, "text/markdown");
    console.log(`  ✓ ${filename} → ${key}`);
  }),
);

console.log("Done.");
