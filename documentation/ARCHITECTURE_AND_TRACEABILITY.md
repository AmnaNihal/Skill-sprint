# SkillSprint AI — Architecture, Requirements Traceability & Development Checklist

> First-response deliverable (items A–O + development checklist). This document maps every mandatory
> SRS area to its module, data store, API, UI, and tests, and records implementation status.
> It is grounded in the current codebase and flags deviations/ambiguities explicitly.

---

## A. Concise understanding

SkillSprint AI is a **source-grounded, role-specific employee onboarding & training intelligence
platform**. It ingests company documents (PDF/DOCX), builds a Role Requirement Matrix, generates
personalized onboarding content with a Generative AI pipeline, and **independently verifies** that
content with a deterministic Python pipeline against approved sources and the matrix. It is not a
chatbot and not a dashboard mockup: every mandatory generated item must trace to an approved source,
and a plan is only `Verified` when coverage/traceability pass and no unresolved issues remain.

Two pipelines are the core: **Pipeline 1 (GenAI generation)** and **Pipeline 2 (Python ground-truth
validation, no GenAI)**. Human review handles flagged cases, and policy updates trigger impact
analysis + selective regeneration.

---

## B. Mandatory architecture

```
Documents → Validate → Parse → Chunk → Version/Metadata → Requirement Extraction → Role Matrix
                                                     │
                        ┌────────────────────────────┴────────────────────────────┐
                        ▼                                                          ▼
              Pipeline 1: GenAI Generation                         Pipeline 2: Python Validation
              (provider abstraction; structured JSON)             (rules + matrix; NO GenAI)
                        └────────────────────────────┬────────────────────────────┘
                                                     ▼
                                        Comparison Engine (requirement-level)
                                                     ▼
                                        Verification Status
                                                     ▼
                                        Human Review (audit-preserving)
                                                     ▼
                            Final Approved Plan → Employee Dashboard → Progress → Reports
```

---

## C. Requirements Traceability Matrix

| SRS area (prompt §) | Mandatory requirement | Module | Data store | API | UI | Test | Status |
|---|---|---|---|---|---|---|---|
| 6,7,8,9 Document upload/validate/parse/chunk | PDF+DOCX upload, validation, parsing, traceable chunks | `document_processing`, `document_validation` | `documents`, `document_chunks` | `POST /documents/upload`, `GET /documents`, `GET /documents/{id}/chunks` | Documents | `tests/*`, manual D1–D5 | ✅ |
| 10 Version control | Active/superseded/history/effective | `policy_management/precedence`, `routers/policy` | `documents` (version, is_active) + `role_requirements.approval_status=Superseded` | `POST /policy/upload-version` | Policy/Docs | manual P3 | ✅ |
| 11 Employee profiles | ID/name/role/dept/experience/joining/manager/status + training info | `routers/roles` | `employees` | `GET/POST /employees`, `GET/PUT/PATCH/DELETE /employees/{id}` | Employees | test_employees, manual E1–E8 | ✅ |
| 12 Role Requirement Matrix | Ground-truth matrix, types, mandatory, source | `role_matrix` | `role_requirements` | `GET/POST/DELETE /requirements`, `GET /roles` | Matrix | manual M1–M4 | ✅ |
| 13 Personalized onboarding | Role/dept/experience/time stages | `genai_pipeline` | `plans.payload` | `POST /plans/generate` | Generate Plan | manual G1 | ✅ |
| 14 Learning modules | Full module schema | `schemas/models.py`, `genai_pipeline` | `plans.payload.modules` | `GET /plans/{id}` | Plan Details | test_generator | ✅ |
| 15 Source-grounded generation | Mandatory items trace to approved sources | `python_validation`, `hallucination_checks` | findings in `plans.payload.validation` | `GET /validation/{id}` | Validation | test_validation | ✅ |
| 16 Checklist generation | Activity/mandatory/due/status/source | `schemas/models.py` | payload | `GET /plans/{id}` | Plan Details | test_generator | ✅ |
| 17 Practical tasks | Task/outcome/source/criteria/difficulty | `schemas/models.py` | payload | `GET /plans/{id}` | Plan Details | test_generator | ✅ |
| 18 Scenario learning | Data-grounded scenarios | `genai_pipeline` (prompt) | payload | `GET /plans/{id}` | Plan Details | — | 🟡 (schema supports; prompt generates when present) |
| 19 Quiz generation | 4 question types + source/answers/explanations | `schemas/models.py`, `schema_validator` | payload | `GET /plans/{id}` | Plan Details | test_generator | ✅ |
| 20 Assessments + rubrics | Knowledge/practical/scenario + rubric/pass | `schemas/models.py` (`GenAssessment.rubric`) | payload | `GET /plans/{id}` | Plan Details | — | 🟡 (schema supports; coverage depends on generation) |
| 21 Prerequisites | Prereq detection + sequence validation | `python_validation`, `genai_pipeline` | payload | `GET /validation/{id}` | Validation | test_generator, test_validation | ✅ |
| 22 Structured JSON | Pydantic schema + validate + retry | `schemas/models.py`, `schema_validator`, `genai_pipeline` | generation meta | — | Plan Details | test_generator | ✅ |
| 23 Prompt management | Versioned prompt files + generation metadata | `prompt_templates/`, `genai_pipeline` | `plans.prompt_version/model` | — | Validation | manual | ✅ |
| 24 Coverage score | real formula, 100% target | `python_validation/engine` | payload summary | `GET /validation/{id}` | Validation | test_validation | ✅ |
| 25 Traceability score | documented formula | `python_validation/engine` | payload summary | `GET /validation/{id}` | Validation | test_validation | ✅ |
| 26 Hallucination detection | unsupported claims flagged | `hallucination_checks` | payload hallucinations | `GET /validation/{id}` | Validation | test_validation | ✅ |
| 27 Contradiction detection | old/new, FAQ/policy, task/rule | `contradiction_checks` | payload contradictions | `GET /validation/{id}` | Validation | test_validation | ✅ |
| 28 Policy precedence | configurable hierarchy service | `policy_management/precedence` | rules module | `GET /policy/precedence` | Policy | test_policy | ✅ |
| 29 Duplicate detection | modules/tasks/quiz duplication | `python_validation/engine` | payload duplicates | `GET /validation/{id}` | Validation | test_validation | ✅ |
| 30 Role relevance | irrelevant-to-role flag | `python_validation/engine` | payload findings | `GET /validation/{id}` | Validation | test_validation | ✅ |
| 31 Consistency testing | repeated generation compare + score | `genai_pipeline/consistency` | payload consistency | `POST /plans/{id}/consistency` | Validation | test_policy | ✅ |
| 32 Comparison engine | requirement-level GenAI vs Python | `comparison_engine` | payload comparison | `GET /validation/{id}`, `/reports/export` | Validation/Reports | test_validation | ✅ |
| 33 Verification statuses | deterministic status rules | `python_validation/engine` | payload summary | `GET /validation/{id}` | Validation | test_validation | ✅ |
| 34 Human review | approve/reject/edit/regenerate + override, preserve original | `routers/plans`, `routers/reports` | `plans.status`, `payload.validation.reviews` | `POST /plans/review`, `POST /reviews/decide`, `GET /reviews/queue` | Reviews | manual R1–R4 | ✅ |
| 35 Audit trail | significant actions recorded | `routers/*` | `plans.payload.validation.reviews` + plan/req timestamps | multiple | Reviews | manual | 🟡 (domain audit via records; no separate `audit_logs` table — see §O) |
| 36 Employee dashboard | progress/modules/tasks/quiz/recs | `routers/reports` | payload | `GET /dashboard/learner/{id}` | Learner | manual L1–L3 | ✅ |
| 37 Admin dashboard | system-wide management | `routers/reports` | aggregate | `GET /dashboard/admin` | Dashboard | manual | ✅ |
| 38 Role dashboard | per-role onboarding stats | `routers/reports` | aggregate | `GET /dashboard/admin` (`plans_by_status`) | Dashboard | manual | 🟡 (role breakdown limited — see §O) |
| 39 Progress tracking | module/checklist/task/quiz/assessment | `routers/plans` | payload progress | `POST /plans/task/toggle`, `GET /dashboard/learner/{id}` | Learner | manual | ✅ |
| 40 Weak areas + recommendations | from learning data | `routers/reports` | payload | `GET /dashboard/learner/{id}` | Learner | manual | ✅ (task-based; quiz-attempt analytics limited) |
| 41 Policy impact analysis | affected reqs/modules/tasks/quiz/plans/employees | `policy_management/impact` | computed | `GET /policy/impact/{document_id}` | Policy | manual P2 | ✅ |
| 42 Selective regeneration | dependency mapping, regenerate affected only | `routers/policy` | `plans.payload` | `POST /policy/regenerate` | Policy | manual P4 | ✅ |
| 43 Search & filtering | employee/role/doc/status/progress | `src/components/views/*` | — | list endpoints | multiple | manual | ✅ |
| 44 Reports + export | CSV/JSON (Excel-compatible) | `routers/reports`, `tools/export_comparison_report.py` | `reports/` | `GET /reports/export` | Reports | manual | ✅ (PDF export pending) |
| 45 Auth + RBAC | login + server-side roles | `security/auth`, `routers/auth` | `users` | `/auth/*` | Auth | manual A1–A5 | ✅ |
| 46 Prompt injection protection | layered defense + quarantine | `genai_pipeline`, `routers/documents` | `documents.injection_flags/is_quarantined` | `POST /documents/upload` | Documents | test_generator, manual S1–S3 | ✅ |
| 47 Security testing | injection/malformed/unauthorized/quota | tests + report | — | — | — | `documentation/SECURITY_TESTING_REPORT.md` | ✅ |
| 48 Hidden-eval readiness | unseen docs/roles via same architecture | all pipelines | — | all | all | manual H1–H4 | ✅ |
| 49 Live modification readiness | modular, configurable | modular packages | — | — | — | — | ✅ |
| 50 No hard-coded output | no fake plans/scores/answers | enforced by design | — | — | — | — | ✅ |
| 52 Database design | normalized entities/PK/FK/index | Supabase schema | tables + JSONB | — | — | — | 🟡 (see §O deviation) |
| 53 API design | route groups | `routers/*` | — | see §G | — | — | ✅ |
| 54 Non-functional | perf/scale/usability/accuracy/availability | — | — | — | — | — | ✅/🟡 (perf depends on provider) |
| 55 Testing | broad test coverage | `backend/tests` | — | — | — | 19 pytest + manual | ✅ (unit coverage strong; integration E2E manual) |
| 62 Comparison report ≥100 rows | auto-generated report | `tools/export_comparison_report.py` | `reports/comparison_report.csv` | — | Reports | — | ✅ (1666 rows) |
| 63 Plans for ≥10 roles | full plans | `tools/generate_role_plans.py` | `plans` | — | — | — | ✅ (10 roles) |
| 70 Demo scenarios A–I | success/missing/unsupported/outdated/contradiction/injection/update/new role/unsupported topic | all | — | — | — | manual | ✅ (capabilities present; scripted artefacts partial) |

---

## D. Proposed & actual technology stack

| Layer | SRS recommended | Implemented | Note |
|---|---|---|---|
| Frontend | React + TypeScript | React + TypeScript + Vite + Tailwind | ✅ |
| Backend | Python + FastAPI | FastAPI | ✅ |
| Database | PostgreSQL | Supabase (PostgreSQL) via PostgREST | ✅ (access method differs — §O) |
| ORM | SQLAlchemy | Custom PostgREST client | ⚠️ deviation (§O) |
| Schemas | Pydantic | Pydantic | ✅ |
| Parsing | PyPDF/pdfplumber, python-docx | `pypdf`, `python-docx` | ✅ |
| AI | Provider abstraction (OpenAI/Gemini/Anthropic) | DeepSeek default + Gemini + OpenAI (OpenAI-compatible) | ✅ |
| Testing | pytest | pytest (19 tests) | ✅ |
| Charts | React chart lib | (UI cards/progress bars) | ⚠️ minimal |
| Deployment | Docker/Render/Railway | Not deployed yet | ⏳ |

---

## E. Repository structure (actual)

```
Skill-sprint/
├── backend/                 # FastAPI app
│   ├── config/ database/ security/
│   ├── routers/             # auth, documents, roles, plans, policy, reports
│   ├── document_processing/ document_validation/
│   ├── role_matrix/
│   ├── genai_pipeline/      # pipeline 1 (+ schema_validator, consistency)
│   ├── python_validation/   # pipeline 2
│   ├── comparison_engine/ hallucination_checks/ contradiction_checks/
│   ├── policy_management/
│   ├── prompt_templates/ schemas/ tools/ tests/
│   ├── requirements.txt .env.example
├── sample_documents/nexora/ # fictional dataset (current/historical/metadata)
├── reports/                 # generated comparison/validation reports
├── documentation/           # report, install, execution, security, testing, checklist
├── src/ public/             # React frontend
├── README.md AI_USAGE.md LICENSE
```

Deviations from prompt §56: frontend lives at repo root (repo already hosted that way); `templates/`,
`static/`, `hidden_test_ready/`, `screenshots/`, `config/` are optional and not all present.

---

## F. Database / entity design

**Prompt §52** proposes ~35 normalized tables. This project uses the **provided seeded Supabase
schema** and stores nested generated content in `plans.payload` (JSONB). Mapping:

| SRS entity | Where implemented |
|---|---|
| users | `users` table |
| employees, roles, departments | `employees` (role, department columns), `roles` derived |
| documents, document_versions | `documents` (document_id, version, is_active, effective/expiry) |
| document_chunks | `document_chunks` |
| requirements, role_requirements | `role_requirements` |
| onboarding_plans, stages, modules, tasks, quizzes, assessments, rubrics, prerequisites | `plans.payload` JSONB |
| validation_results, comparison_results, contradictions, hallucination_flags | `plans.payload.validation` |
| manual_reviews, reviewer_decisions | `plans.payload.validation.reviews` |
| employee_progress | `plans.payload` progress + tasks.completed |
| generation_logs, prompt_versions | `plans.prompt_version/model` + `generation_meta` |
| policy_precedence_rules | `policy_management/precedence.py` (configurable) |
| audit_logs | domain records (see §O) |

Traced in `documentation/PROJECT_REPORT.md` §4.

---

## G. API / module design (actual)

`/auth` (login/register/logout/me) · `/documents`, `/documents/upload`, `/documents/{id}/chunks` ·
`/roles`, `/employees`, `/requirements` · `/plans/generate`, `/plans`, `/plans/{id}`,
`/plans/{id}/revalidate`, `/plans/{id}/consistency`, `/plans/review`, `/plans/task/toggle` ·
`/validation/{id}` · `/reviews/queue`, `/reviews/decide` · `/dashboard/admin`,
`/dashboard/learner/{id}` · `/reports/export` · `/policy/precedence`, `/policy/impact/{id}`,
`/policy/upload-version`, `/policy/regenerate`.

Server-side RBAC via `security/auth.require_admin`; ownership guard on learner task toggles.

---

## H. UI page list (actual)

Landing · Auth · Admin Dashboard · Document Library · Role & Req Matrix · Generate Plan ·
Onboarding Plans/Plan Details · Dual Validation · Review & Sign-Off · Learner Dashboard · Reports.
Modals: Upload, Add Requirement, Plan Review, Quiz, Export. Top workflow bar (moved to top).

---

## I. GenAI pipeline design

`genai_pipeline/generator.py`: provider order from `AI_PROVIDER`; `_call_deepseek/_call_gemini/_call_openai`;
JSON extraction + shape normalization (`_normalize_generated_shape`); `_coerce_plan` (Pydantic);
`_supplement_missing_requirements`; `_align_due_stages`; `_enforce_module_mandatory`;
`_drop_dangling_prerequisites`; deterministic `fallback_plan`; controlled retries + logging;
`generation_meta` persisted. Prompt files versioned in `prompt_templates/`.

## J. Independent Python validation design

`python_validation/engine.py` (no GenAI): mandatory coverage, traceability/validity, unsupported,
role relevance, duplicates, sequence/prerequisites, contradictions (via `contradiction_checks`),
hallucinations (via `hallucination_checks`); scores (coverage/traceability/consistency); deterministic
status. `comparison_engine` emits requirement-level rows.

## K. Security design

JWT + bcrypt; server-side RBAC; learner ownership; injection detection/sanitization + quarantine;
untrusted-data separation; schema validation; source validation; audit via preserved records;
secrets only in `.env` (git-ignored). See `documentation/SECURITY_TESTING_REPORT.md`.

## L. Testing strategy

Unit/deterministic: `backend/tests/` (generator normalization/fallback/schema, validation coverage/
traceability/contradictions, precedence/supersede, consistency, supplementing/mandatory) — **19 passing**.
Functional/E2E, RBAC, upload, policy, security: `documentation/MANUAL_TESTING.md` (13 groups).
Fixtures: `sample_documents/nexora/` + expansion docs (ADV/CONFLICT/VERSION).

## M. Hidden-evaluation strategy

Everything is generic: new documents/roles flow through upload → extraction → matrix → generation →
validation → comparison → review without code changes. Adversarial docs are quarantined. No
hard-coded answers. New policy → `upload-version` → `impact` → `regenerate` → `revalidate`.

## N. Implementation phases (all delivered)

Phase 1 analysis/arch/DB → 2 auth/RBAC/employees → 3 document pipeline → 4 matrix → 5 GenAI →
6 validation → 7 comparison/status/review → 8 modules/tasks/quizzes → 9 dashboards/progress/recs →
10 policy update/impact/regeneration → 11 reports/security → 12 tests/dataset/docs/deployment-prep.

## O. Conflicts / ambiguities / deviations

1. **ORM**: SRS recommends SQLAlchemy; the seeded environment provides Supabase (PostgreSQL) with a
   publishable key and no DDL. Implemented a PostgREST client + JSONB payload instead of 35 tables.
   *Trade-off*: fewer normalized tables; all mandatory functionality preserved. Documented.
2. **Normalized tables vs JSONB**: validation/comparison/contradiction/review records live in
   `plans.payload.validation` rather than separate tables (no DDL available).
3. **Audit trail**: captured through immutable domain records (reviews, validation history, plan
   timestamps). No dedicated `audit_logs` table (see deviation 1).
4. **Role dashboard**: admin stats include `plans_by_status`; a dedicated per-role completion
   breakdown is limited.
5. **PDF export**: CSV/JSON implemented; PDF export not yet.
6. **Assessments/scenarios**: schema supports them; whether they appear depends on generation.
7. **Performance**: small roles ~12–30s; very large corpora can exceed 30s depending on provider.
8. **Deployment/video/blog**: prepared but not yet produced.

---

## Development checklist

Legend: I = implementation, T = tests, D = documentation.

### Core pipelines
- [x] Two independent pipelines (I) (T) (D)
- [x] Provider abstraction + fallback (I) (T) (D)
- [x] Structured JSON + schema validation + retries (I) (T) (D)
- [x] Deterministic Python validation (no GenAI) (I) (T) (D)

### Documents
- [x] PDF/DOCX/TXT parse (I) (T/manual) (D)
- [x] Validation + duplicates (I) (manual) (D)
- [x] Chunking + traceability (I) (manual) (D)
- [x] Version control + supersede (I) (T) (D)

### Requirements & matrix
- [x] AI + deterministic requirement extraction (I) (T) (D)
- [x] Role Requirement Matrix (I) (manual) (D)

### Generation
- [x] Personalized plans/stages/modules (I) (T) (D)
- [x] Tasks/checklists/scenarios/quizzes/assessments schema (I/🟡) (T) (D)
- [x] Prerequisites/sequence (I) (T) (D)

### Validation & comparison
- [x] Coverage/traceability scores (I) (T) (D)
- [x] Hallucination/contradiction/duplicate/role relevance (I) (T) (D)
- [x] Comparison engine + statuses (I) (T) (D)
- [x] Consistency testing (I) (T) (D)

### Workflow & governance
- [x] Human review + override (preserve original) (I) (manual) (D)
- [🟡] Dedicated audit log table (I) (D)
- [x] Policy precedence (I) (T) (D)
- [x] Impact analysis + selective regeneration (I) (manual) (D)

### Experience
- [x] Employee dashboard + progress + recommendations (I) (manual) (D)
- [x] Admin dashboard (I) (manual) (D)
- [🟡] Role dashboard breakdown (I) (D)
- [x] Reports + CSV/JSON export (I) (manual) (D)
- [ ] PDF export (I)

### Security
- [x] JWT + RBAC + ownership (I) (manual) (D)
- [x] Prompt-injection defense + quarantine (I) (T) (D)
- [ ] Rate limiting / brute-force protection (I)

### Quality & deliverables
- [x] pytest suite (I) (T) (D)
- [x] Fictional dataset (20+ docs, 10+ roles, 150+ reqs, 50+ mandatory, 10 conflicts, 10 versions, 10 adversarial) (I) (D)
- [x] Plans for 10 roles (I) (D)
- [x] Comparison report ≥100 rows (I) (D)
- [x] README, AI_USAGE, project report, security report, install/execution, manual testing, checklist (D)
- [ ] Deployment (URL + evaluator credentials)
- [ ] Demonstration video (MP4)
- [ ] Technical blog (2000+ words)

---

## Requested next step

Architecture above is implemented and verified (services up, 19 tests pass, repo synced). Remaining
work is deployment, demo video, and the technical blog. Awaiting approval to proceed with those, or
to address any deviation in §O.
