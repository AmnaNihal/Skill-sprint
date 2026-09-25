# Installation Instructions

## Prerequisites

| Tool | Version |
|---|---|
| Python | 3.11+ (tested 3.12) |
| Node.js | 18+ (tested 24) |
| npm | bundled with Node |
| Git | any recent |

You also need a Supabase/PostgreSQL project (the app uses an existing seeded schema) and at least
one GenAI API key (DeepSeek, Google Gemini, or OpenAI).

---

## 1. Clone the repository

```powershell
git clone https://github.com/AmnaNihal/Skill-sprint.git
cd Skill-sprint
```

## 2. Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create the environment file:

```powershell
Copy-Item .env.example .env
```

Fill `.env`:

```dotenv
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<publishable_key>

AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=<key>
DEEPSEEK_MODEL=deepseek-chat

# Optional alternates
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MAX_FILE_SIZE_MB=25
JWT_SECRET=change-me-in-production
```

> The real `.env` is intentionally **not** committed. Only `.env.example` is tracked.

Run the API:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Health check: <http://127.0.0.1:8000/health>

## 3. Frontend setup

In a new terminal, from the repository root:

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>.

The frontend reads `VITE_API_BASE` (defaults to `http://localhost:8000`).

## 4. Load the company dataset (optional)

The repository ships an importer for the fictional **Nexora Technologies** corpus:

```powershell
cd backend
python tools\import_nexora.py        # import documents + curated matrix (idempotent)
python tools\extract_nexora_ai.py    # AI requirement extraction over safe documents
```

## 5. Production build

```powershell
npm run build      # outputs dist/
```

## 6. Tests

```powershell
cd backend
python -m pytest tests -q
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Supabase REST 401` | Check `SUPABASE_KEY` |
| AI returns 429/quota | Set a different `AI_PROVIDER` or wait for quota reset; the app falls back to a deterministic plan |
| Frontend can't reach API | Confirm `VITE_API_BASE` and CORS origins |
| `.env` not loaded | Ensure you copied it into `backend/` (absolute path is resolved automatically) |
