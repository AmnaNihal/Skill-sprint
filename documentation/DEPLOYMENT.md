# Deployment Guide

Deployment-ready instructions for **SkillSprint AI** (FastAPI backend + React frontend).
Secrets are **never** committed — they are set as environment variables on the host.

## Live deployment (current)

| Part | URL |
|---|---|
| Frontend | https://skills-sprint.vercel.app |
| Backend API | https://skills-sprint-api.vercel.app (`/health`) |

- **Backend** is a Vercel Python function (`backend/vercel.json`, deployed from `backend/`).
- **Frontend** is the built `dist/` uploaded via the Vercel REST API
  (`scripts/deploy_frontend.py`) because the Vercel CLI auto-detects the FastAPI backend as a
  monorepo service and refuses to combine it with the frontend build settings.
- Backend env vars are set on Vercel (Production): Supabase + DeepSeek + `JWT_SECRET` +
  `CORS_ORIGINS=https://skills-sprint.vercel.app`.

Redeploy frontend:

```powershell
$env:VERCEL_TOKEN = "<token>"
$env:VITE_API_BASE = "https://skills-sprint-api.vercel.app"
npm run build
python scripts/deploy_frontend.py
```

Redeploy backend:

```powershell
cd backend
vercel deploy --prod --yes     # uses backend/vercel.json + linked project skills-sprint-api
```

## Components

| Component | Tech | Suggested host |
|---|---|---|
| Backend API | FastAPI (Python 3.12) | Render / Railway (Docker or Python) |
| Frontend | React + Vite (static build) | Vercel |
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
2. Render → **New → Blueprint** → select the repo. `render.yaml` provisions the backend:
   - `skillsprint-api` (Python web service, health check `/health`)
   - Frontend is deployed separately on **Vercel** (see Option D).
3. Set the secret env vars (`sync: false`) in the dashboard: `SUPABASE_URL`, `SUPABASE_KEY`,
   `DEEPSEEK_API_KEY`, `JWT_SECRET`, `CORS_ORIGINS`.
4. Deploy the backend. Then deploy the frontend on Vercel with `VITE_API_BASE` = backend URL,
   and set backend `CORS_ORIGINS` to the Vercel site URL.

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

Frontend (Vercel):

1. Vercel → **Add New → Project** → import the repository.
2. Framework preset **Vite** is auto-detected (`vercel.json` also sets build/output + SPA rewrites).
3. Set env var `VITE_API_BASE` = your deployed backend URL (e.g. `https://skillsprint-api.onrender.com`).
4. Deploy. `vercel.json` handles the SPA catch-all rewrite to `/index.html`, so direct routes
   (`/documents`, `/plans`, `/learner`, …) work on refresh.

## Option D — Vercel frontend (CLI)

```bash
npm i -g vercel
vercel            # preview
vercel --prod     # production
# set VITE_API_BASE when prompted, or: vercel env add VITE_API_BASE
```

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
- The frontend is an SPA — `vercel.json` includes the catch-all rewrite to `/index.html`.
