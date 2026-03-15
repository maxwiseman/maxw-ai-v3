/**
 * Create the Daytona snapshot with the workspace sync script pre-installed.
 * Run this once to register the snapshot, then set DAYTONA_SNAPSHOT in .env.
 *
 * Usage:
 *   bun apps/web/src/ai/sandbox/snapshot/setup-snapshot.ts
 */

import path from "path";
import { Daytona, Image } from "@daytonaio/sdk";

const SNAPSHOT_NAME = "maxw-python-r2";

const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY });

const image = Image.base("daytonaio/sandbox:latest")
  // Install agent-browser CLI and pre-download Chrome so it's ready at runtime
  .runCommands(
    "npm install -g agent-browser",
    "agent-browser install",
  )
  // Document creation tools: LibreOffice (headless conversions), TeX Live (LaTeX/XeLaTeX/LuaLaTeX), Typst
  .runCommands(
    "sudo apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends " +
      "libreoffice " +
      "texlive-latex-recommended texlive-fonts-recommended texlive-xetex texlive-luatex texlive-latex-extra latexmk " +
      "&& sudo rm -rf /var/lib/apt/lists/*",
    // Typst — install latest pre-built binary
    "curl -fsSL https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz " +
      "| sudo tar -xJf - --strip-components=1 -C /usr/local/bin typst-x86_64-unknown-linux-musl/typst",
  )
  // Skills are not baked in — they are pulled from R2 on startup via the sync script.
  // Global skills live at skills/global/ in R2; user skills at users/{id}/workspace/skills/.
  // Both are merged into /home/daytona/workspace/skills/ when the sandbox starts.
  //
  // To seed/update global skills: bun apps/web/src/ai/sandbox/seed-global-skills.ts
  //
  // Copy files to /home/daytona/ (user-owned) so chmod works without BuildKit
  // No chmod needed — both scripts are invoked with `python3`, not executed directly
  .addLocalFile(path.join(import.meta.dir, "sync-workspace.py"), "/home/daytona/sync-workspace.py")
  .addLocalFile(path.join(import.meta.dir, "entrypoint.py"), "/home/daytona/entrypoint.py")
  .entrypoint(["python3", "/home/daytona/entrypoint.py", "sleep", "infinity"]);

console.log(`Creating snapshot "${SNAPSHOT_NAME}"...`);

await daytona.snapshot.create({ name: SNAPSHOT_NAME, image }, { onLogs: console.log });

console.log(`\nDone! Add to your root .env:\n\n  DAYTONA_SNAPSHOT=${SNAPSHOT_NAME}\n`);
