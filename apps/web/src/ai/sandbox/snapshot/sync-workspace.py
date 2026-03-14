#!/usr/bin/env python3
"""
Workspace sync script — runs as a background process inside the Daytona sandbox.

Periodically uploads changed files from /home/daytona/workspace to R2 by
calling the app's /api/sandbox/sync endpoint, which returns short-lived
presigned PUT URLs scoped to this user's prefix.

No R2 credentials ever live in this process. The SYNC_TOKEN is a short-lived
HMAC token that can only be used to upload/delete within this user's workspace.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

WORKSPACE = Path("/home/daytona/workspace")
SYNC_API_URL = os.environ.get("SYNC_API_URL", "").rstrip("/")
SYNC_TOKEN = os.environ.get("SYNC_TOKEN", "")
SYNC_INTERVAL = int(os.environ.get("SYNC_INTERVAL", "30"))  # seconds
BATCH_SIZE = 50  # files per presign request


def log(msg: str) -> None:
    print(f"[sync] {msg}", flush=True)


def api_request(method: str, path: str, body: dict | None = None) -> dict:
    url = f"{SYNC_API_URL}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {SYNC_TOKEN}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def put_file(url: str, path: Path) -> None:
    with open(path, "rb") as f:
        data = f.read()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/octet-stream"},
        method="PUT",
    )
    with urllib.request.urlopen(req, timeout=60) as _:
        pass


def restore_workspace() -> None:
    """Download all workspace files from R2 on startup."""
    log("Restoring workspace from R2...")
    try:
        result = api_request("GET", "/api/sandbox/sync")
        files = result.get("files", [])
    except Exception as e:
        log(f"Restore failed (may be a fresh workspace): {e}")
        return

    if not files:
        log("No existing workspace files found — starting fresh.")
        return

    restored = 0
    for item in files:
        rel_path = item["path"].lstrip("/")
        url = item["url"]
        dest = WORKSPACE / rel_path

        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=60) as resp:
                dest.write_bytes(resp.read())
            restored += 1
        except Exception as e:
            log(f"Failed to restore {rel_path}: {e}")

    log(f"Restored {restored}/{len(files)} files.")


def upload_batch(files: list[tuple[str, Path]]) -> int:
    """Upload a batch of (relative_path, abs_path) tuples. Returns count uploaded."""
    if not files:
        return 0

    paths = [rel for rel, _ in files]
    try:
        result = api_request("POST", "/api/sandbox/sync", {"files": paths})
    except Exception as e:
        log(f"Failed to get presigned URLs: {e}")
        return 0

    uploaded = 0
    for item in result.get("uploads") or []:
        rel = item["path"]
        url = item["url"]
        abs_path = WORKSPACE / rel.lstrip("/")
        try:
            put_file(url, abs_path)
            uploaded += 1
        except Exception as e:
            log(f"Failed to upload {rel}: {e}")

    return uploaded


def sync_cycle(last_seen: dict[str, float]) -> dict[str, float]:
    """Detect changed files, upload them, return updated last_seen map."""
    changed: list[tuple[str, Path]] = []

    if not WORKSPACE.exists():
        return last_seen

    for path in WORKSPACE.rglob("*"):
        if not path.is_file():
            continue
        rel = str(path.relative_to(WORKSPACE))
        try:
            mtime = path.stat().st_mtime
        except OSError:
            continue
        if last_seen.get(rel) != mtime:
            changed.append((rel, path))
            last_seen[rel] = mtime

    if not changed:
        return last_seen

    # Upload in batches to keep presign requests small
    total = 0
    for i in range(0, len(changed), BATCH_SIZE):
        batch = changed[i : i + BATCH_SIZE]
        total += upload_batch(batch)

    if total:
        log(f"Synced {total}/{len(changed)} changed files.")

    return last_seen


def main() -> None:
    if not SYNC_API_URL or not SYNC_TOKEN:
        log("SYNC_API_URL or SYNC_TOKEN not set — exiting.")
        sys.exit(1)

    WORKSPACE.mkdir(parents=True, exist_ok=True)

    restore_workspace()

    log(f"Starting sync loop (interval: {SYNC_INTERVAL}s).")
    last_seen: dict[str, float] = {}

    # Do an initial scan immediately after restore so we don't re-upload just-restored files
    for path in WORKSPACE.rglob("*"):
        if path.is_file():
            rel = str(path.relative_to(WORKSPACE))
            try:
                last_seen[rel] = path.stat().st_mtime
            except OSError:
                pass

    while True:
        time.sleep(SYNC_INTERVAL)
        try:
            last_seen = sync_cycle(last_seen)
        except Exception as e:
            log(f"Sync cycle error: {e}")


if __name__ == "__main__":
    main()
