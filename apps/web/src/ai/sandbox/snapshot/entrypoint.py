#!/usr/bin/env python3
"""Sandbox entrypoint — starts the workspace sync then execs the main process."""

import os
import subprocess
import sys

SYNC_API_URL = os.environ.get("SYNC_API_URL", "")
SYNC_TOKEN = os.environ.get("SYNC_TOKEN", "")

if SYNC_API_URL and SYNC_TOKEN:
    os.makedirs("/home/daytona/workspace", exist_ok=True)
    with open("/tmp/sync.log", "w") as log:
        proc = subprocess.Popen(
            [sys.executable, "/home/daytona/sync-workspace.py"],
            stdout=log,
            stderr=subprocess.STDOUT,
        )
    print(f"[entrypoint] Workspace sync started (PID {proc.pid})", flush=True)
else:
    print(
        "[entrypoint] SYNC_API_URL/SYNC_TOKEN not set — workspace will use local storage only",
        flush=True,
    )

if len(sys.argv) > 1:
    os.execvp(sys.argv[1], sys.argv[1:])
