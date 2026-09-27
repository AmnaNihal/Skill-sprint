"""Deploy the built frontend (dist/) to Vercel via the REST API.

Why the REST API instead of the CLI: this repo contains a FastAPI backend with its own
Vercel config, which the modern Vercel CLI auto-detects as a monorepo "service" and refuses to
combine with the frontend's top-level build settings. The REST API deploys the static build
cleanly.

Usage (PowerShell):
    $env:VERCEL_TOKEN = "<token>"
    $env:VITE_API_BASE = "https://skills-sprint-api.vercel.app"
    npm run build
    python scripts/deploy_frontend.py
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
from pathlib import Path

import httpx

API = "https://api.vercel.com"
REPO = Path(__file__).resolve().parents[1]
DIST = Path(os.environ.get("DIST_DIR", REPO / "dist"))
PROJECT = os.environ.get("VERCEL_PROJECT", "skills-sprint")
ALIAS = os.environ.get("VERCEL_ALIAS", "skills-sprint.vercel.app")


def main() -> None:
    token = os.environ.get("VERCEL_TOKEN")
    if not token:
        print("VERCEL_TOKEN is not set")
        sys.exit(1)
    if not DIST.exists():
        print(f"dist not found at {DIST}; run `npm run build` first")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    httpx.post(f"{API}/v11/projects", headers=headers, json={"name": PROJECT, "framework": None}, timeout=60)

    files = []
    for path in DIST.rglob("*"):
        if path.is_file():
            rel = path.relative_to(DIST).as_posix()
            files.append({"file": rel, "data": base64.b64encode(path.read_bytes()).decode()})
    print("files:", [f["file"] for f in files])

    body = {
        "name": PROJECT,
        "target": "production",
        "files": files,
        "routes": [{"handle": "filesystem"}, {"src": "/(.*)", "dest": "/index.html"}],
        "projectSettings": {"framework": None},
    }
    resp = httpx.post(f"{API}/v13/deployments", headers=headers, json=body, timeout=180)
    data = resp.json()
    if resp.status_code >= 400:
        print("deploy failed:", json.dumps(data)[:1000])
        sys.exit(1)

    dep_id = data["id"]
    dep_url = data["url"]
    print("deployment:", dep_url)

    for _ in range(48):
        time.sleep(5)
        state = httpx.get(f"{API}/v13/deployments/{dep_id}", headers=headers, timeout=60).json()
        print("state:", state.get("readyState"))
        if state.get("readyState") in ("READY", "ERROR", "CANCELED"):
            break

    if ALIAS:
        alias = httpx.post(
            f"{API}/v2/deployments/{dep_url}/aliases",
            headers=headers,
            json={"alias": ALIAS},
            timeout=60,
        )
        print("alias:", alias.status_code, ALIAS if alias.status_code < 400 else alias.text[:300])


if __name__ == "__main__":
    main()
