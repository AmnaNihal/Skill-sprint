# Deployment Guide

Deployment-ready instructions for **SkillSprint AI** (FastAPI backend + React frontend).
Secrets are **never** committed — they are set as environment variables on the host.

## Components

| Component | Tech | Suggested host |
|---|---|---|
| Backend API | FastAPI (Python 3.12) | Render / Railway (Docker or Python) |
| Frontend | React + Vite (static build) | Netlify / Vercel / Render Static |
| Database | Supabase (PostgreSQL) | Supabase (already provisioned) |
| AI provider | DeepSeek (default) | DeepSeek API |

## Environment variables

Backend (`backend/.env` locally; host env vars in production):

| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_KEY` | Database access |
| `AI_PROVIDER` | `deepseek` \| `gemini` \| `openai` |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` | Provider credentials |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional alternate |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional alternate |
| `JWT_SECRET` | Token signing (change in production) |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `MAX_FILE_SIZE_MB` | Upload limit (default 25) |

Frontend build variable:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE` | Public URL of the backend API |

---

## Option A — Render (Blueprint)

1. Push the repo (already on GitHub).
2. Render → **New → Blueprint** → select the repo. `render.yaml` provisions:
   - `skillsprint-api` (Python web service, health check `/health`)
   - `skillsprint-web` (static site)
3. Set the secret env vars (`sync: false`) in the dashboard: `SUPABASE_URL`, `SUPABASE_KEY`,
   `DEEPSEEK_API_KEY`, `JWT_SECRET`, `CORS_ORIGINS`, and for the static site `VITE_API_BASE`.
4. Deploy. Backend URL → set `CORS_ORIGINS` to the static site URL; static site → rebuild with
   `VITE_API_BASE` = backend URL.

## Option B — Docker (any host)

Backend:

```bash
cd backend
docker build -t skillsprint-api .
docker run -p 8000:8000 --env-file .env skillsprint-api
```

Or run locally without Docker:

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

`backend/Procfile` is included for hosts that use it:
`web: uvicorn main:app --host 0.0.0.0 --port $PORT`.

Frontend:

```bash
npm ci
VITE_API_BASE=https://<backend-url> npm run build   # outputs dist/
```

Deploy `dist/` to Netlify (uses `netlify.toml`, SPA redirect) or Vercel.

## Option C — Railway

1. New Project → Deploy from GitHub → set root directory `backend`.
2. Railway detects Python; start command `uvicorn main:app --host 0.0.0.0 --port $PORT`.
3. Add env vars (same as above).

---

## Post-deploy checklist

- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] `CORS_ORIGINS` includes the deployed frontend URL
- [ ] Frontend `VITE_API_BASE` points to the deployed backend
- [ ] Secrets present in host env (not in repo)
- [ ] Smoke test: login → upload a valid company doc → generate plan → validation `Verified`
- [ ] Evaluator credentials shared: `admin@skillsprint.local` / `admin123` (and other demo roles)

## Notes

- The app falls back to a deterministic plan builder if the AI provider is rate-limited, so the
  demo stays functional without credits.
- `backend/.env` is git-ignored; only `backend/.env.example` is committed.
- The frontend is an SPA — configure a catch-all redirect to `/index.html` (Netlify config included).
