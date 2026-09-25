# Execution Instructions

This guide walks through the complete SkillSprint AI workflow.

## 0. Start the services

```powershell
# Terminal 1 — backend
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# Terminal 2 — frontend
npm run dev
```

Open <http://localhost:3000> and log in as admin (`admin@skillsprint.local` / `admin123`).

---

## 1. Upload company documents

`Documents → Upload New Document`.

- Select a **single file** or a **whole folder** (PDF/DOCX/TXT/MD/CSV).
- The pipeline validates, parses, chunks (with source IDs), and runs **AI requirement extraction**.
- Suspicious/prompt-injection documents are automatically **quarantined**.
- Folder uploads prefer `.docx` and skip duplicate PDF copies.

Verify source traceability: `Documents → {doc} → chunks` shows section/heading/page references.

## 2. Requirement Matrix

`Requirement Matrix` shows requirements per role (from documents + curated matrix).

- `All Roles` requirements apply to every role.
- Each requirement links to a source document, section, and chunk.

## 3. Generate an onboarding plan

`Generate Plan`:

1. Choose/enter an employee and role (e.g. *Software Engineer*).
2. Submit.

What happens internally:

1. Applicable requirements (role + `All Roles`) and their full source chunks are gathered.
2. **Pipeline 1** asks the AI provider for structured JSON (modules, tasks, quizzes, assessments).
   - Invalid/partial JSON is repaired via normalization and controlled retries.
   - Missing matrix requirements are covered with source-cited supplement modules.
3. **Pipeline 2** independently validates the plan (no GenAI).
4. Results are stored with verification status and scores.

## 4. Inspect validation

`Validation` shows findings and the summary:

- coverage / traceability / consistency scores
- missing, unsupported, contradictions, duplicates, sequence issues, hallucinations
- per-requirement comparison rows

Statuses include `Verified`, `Verified with Warning`, `Partially Verified`, `Contradiction Detected`,
`Unsupported Requirement`, `Outdated Source`, `Manual Review Required`.

## 5. Selective revalidation & consistency

- `Revalidate` re-runs Pipeline 2 on the stored plan.
- `Consistency` regenerates once and compares structured output (requirement/source/topic overlap).

## 6. Human review

`Reviews` (reviewer/admin):

- Approve / Reject / Edit with a comment.
- The original validation result is preserved and the decision is appended to the audit trail.

## 7. Learner experience

Log in as learner (`learner@skillsprint.local` / `learner123`), open the learner dashboard:

- progress, modules, tasks, quizzes
- **adaptive recommendations** (incomplete mandatory modules, weak areas)

Task completion updates progress via `POST /plans/task/toggle` (learners may only edit their own plan).

## 8. Policy updates (impact analysis + selective regeneration)

Admin API/UI flow:

1. Upload a new document version (`POST /policy/upload-version`): previous rows are deactivated and
   their requirements marked `Superseded`; the new version is parsed and re-extracted.
2. `GET /policy/impact/{document_id}` shows affected modules, quizzes, tasks, plans, and employees.
3. `POST /policy/regenerate` regenerates **only** the affected modules, then revalidates.

## 9. Reports

`Reports → Export` produces a CSV/JSON containing plans, scores, findings, and the
requirement-level comparison rows.

---

## Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@skillsprint.local` | `admin123` |
| Reviewer | `reviewer@skillsprint.local` | `reviewer123` |
| Training Manager | `training@skillsprint.local` | `training123` |
| Manager | `manager@skillsprint.local` | `manager123` |
| Learner | `learner@skillsprint.local` | `learner123` |
