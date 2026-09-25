# SkillSprint AI

**Generative AI onboarding & training platform with an independent Python validation pipeline.**

SkillSprint AI turns a company's approved documents (policies, SOPs, role descriptions, FAQs)
into personalized employee onboarding plans using a Generative AI pipeline, then independently
verifies every generated requirement with a deterministic Python validation pipeline against an
approved Role Requirement Matrix.

> Theme: OnboardVerse · Category: Generative AI PowerPlay · Primary language: Python

---

## 1. Why this project is different

Most AI training tools only *generate* content. SkillSprint AI **generates and independently verifies**
content:

- **Pipeline 1 – GenAI Generation** produces structured JSON onboarding plans (modules, tasks,
  checklists, quizzes, assessments) grounded in approved source documents.
- **Pipeline 2 – Python Ground-Truth Validation** verifies the plan with **no GenAI** using the
  approved Role Requirement Matrix: coverage, traceability, hallucinations, contradictions,
  duplicates, role relevance, and learning sequence.
- A **comparison engine** produces requirement-level results and a **verification status**.

A plan is only marked **Verified** when mandatory coverage and traceability pass and there are no
unresolved contradictions or unsupported requirements.

---

## 2. Architecture

```
Company Documents ─► Document Processing ─► Role Requirement Matrix
                                                  │
                        ┌─────────────────────────┴─────────────────────────┐
                        ▼                                                    ▼
              Pipeline 1: GenAI Generation                     Pipeline 2: Python Validation
          (DeepSeek / Gemini / OpenAI, JSON)                 (coverage, traceability, contradictions)
                        └─────────────────────────┬─────────────────────────┘
                                                  ▼
                                        Comparison Engine
                                                  ▼
                                       Verification Decision ─► Review Workflow
                                                  ▼
                                     Personalized Onboarding Plan
                                                  ▼
                                        Dashboards & Reports
```

Backend modules (see `backend/`):

| Module | Responsibility |
|---|---|
| `document_processing/` | PDF/DOCX/TXT parsing, section detection, chunking |
| `document_validation/` | Metadata validation |
| `role_matrix/` | Requirement extraction (AI + deterministic fallback) |
| `genai_pipeline/` | Provider calls, JSON schema validation, retries, fallback, consistency |
| `python_validation/` | Ground-truth validation engine + scores/statuses |
| `comparison_engine/` | GenAI↔Python comparison rows |
| `hallucination_checks/`, `contradiction_checks/` | Specialized detectors |
| `policy_management/` | Precedence, impact analysis, selective regeneration |
| `routers/` | REST API (auth, documents, roles, plans, policy, reports) |
| `security/` | JWT auth, RBAC |

---

## 3. Tech stack

- **Backend:** FastAPI (Python 3.12)
- **Frontend:** React + TypeScript + Vite + Tailwind
- **Database:** Supabase / PostgreSQL (via a thin PostgREST client)
- **AI providers:** DeepSeek (default), Google Gemini, OpenAI (OpenAI-compatible)
- **Parsing:** `pypdf`, `python-docx`
- **Validation:** Pydantic
- **Tests:** pytest

---

## 4. Installation

See [`docs/INSTALLATION.md`](docs/INSTALLATION.md) for full instructions.

Quick start:

```powershell
# 1. Clone
git clone https://github.com/AmnaNihal/Skill-sprint.git
cd Skill-sprint

# 2. Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env    # then fill in your keys
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# 3. Frontend (new terminal, repo root)
npm install
npm run dev                    # http://localhost:3000
```

Environment variables (`.env`) are required for Supabase and at least one AI provider.
**Never commit the real `.env`** — only `.env.example` is tracked.

---

## 5. Running & demo credentials

- Frontend: <http://localhost:3000>
- API: <http://127.0.0.1:8000> · docs at `/docs`

| Role | Email | Password |
|---|---|---|
| Admin | `admin@skillsprint.local` | `admin123` |
| Reviewer | `reviewer@skillsprint.local` | `reviewer123` |
| Training Manager | `training@skillsprint.local` | `training123` |
| Manager | `manager@skillsprint.local` | `manager123` |
| Learner | `learner@skillsprint.local` | `learner123` |

See [`docs/EXECUTION.md`](docs/EXECUTION.md) for the end-to-end workflow.

---

## 6. Key API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | JWT login |
| GET | `/documents` | List documents |
| POST | `/documents/upload` | Upload + parse + chunk + extract requirements (AI) |
| GET | `/documents/{id}/chunks` | Source chunks (traceability) |
| GET | `/requirements` | Role Requirement Matrix |
| POST | `/plans/generate` | Pipeline 1 generation + Pipeline 2 validation |
| POST | `/plans/{id}/revalidate` | Re-run Python validation |
| POST | `/plans/{id}/consistency` | Repeated-generation consistency check |
| POST | `/plans/review` | Human review decision |
| GET | `/validation/{id}` | Validation findings + summary |
| GET | `/dashboard/admin`, `/dashboard/learner/{id}` | Dashboards |
| GET | `/reports/export` | CSV/JSON validation + comparison report |
| GET | `/policy/precedence` | Document precedence rules |
| GET | `/policy/impact/{document_id}` | Policy impact analysis |
| POST | `/policy/upload-version` | Upload new document version (supersede + re-extract) |
| POST | `/policy/regenerate` | Selective regeneration of affected modules |

---

## 7. Testing

```powershell
cd backend
python -m pytest tests -q
```

Covers generation normalization/fallback, validation scores, contradiction handling,
schema validity, precedence, supplementing, and generation consistency.

---

## 8. Project documentation

- [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md) — technical report
- [`docs/INSTALLATION.md`](docs/INSTALLATION.md) — setup
- [`docs/EXECUTION.md`](docs/EXECUTION.md) — operating the app
- [`docs/SECURITY_TESTING_REPORT.md`](docs/SECURITY_TESTING_REPORT.md) — security & prompt injection
- [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md) — final deliverables
- [`AI_USAGE.md`](AI_USAGE.md) — AI usage declaration

---

## 9. License

For academic/competition use. See the SRS for evaluation terms.
