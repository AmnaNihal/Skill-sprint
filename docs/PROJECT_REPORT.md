# SkillSprint AI — Project Report

## 1. Introduction

SkillSprint AI is a Generative AI onboarding and training management platform. It converts a
company's approved documents into personalized, role-specific onboarding plans and independently
verifies every generated requirement against an approved Role Requirement Matrix.

The defining requirement (SRS, pages 4–9) is the **dual-pipeline design**: generation and
validation must be independent, and validation must not use a Generative AI API.

## 2. Objectives

- Automate personalized onboarding plan creation from company documents.
- Guarantee source traceability from plan content back to document sections.
- Independently verify AI output (coverage, traceability, contradictions, hallucinations).
- Support human review, policy updates, dashboards, and reporting.
- Remain robust against adversarial documents and hidden evaluation inputs.

## 3. Architecture

```
Documents ─► Parsing/Chunking ─► Requirement Matrix
                                        │
            ┌───────────────────────────┴───────────────────────────┐
            ▼                                                        ▼
  Pipeline 1: GenAI Generation                       Pipeline 2: Python Validation
  (DeepSeek/Gemini/OpenAI → JSON)                    (coverage, traceability, etc.)
            └───────────────────────────┬───────────────────────────┘
                                        ▼
                              Comparison Engine
                                        ▼
                         Verification Decision ─► Review
                                        ▼
                        Onboarding Plan ─► Dashboards/Reports
```

### 3.1 Pipeline 1 — GenAI Generation

- Providers: DeepSeek (default), Google Gemini, OpenAI (OpenAI-compatible).
- Prompt templates are versioned (`prompt_templates/onboarding_plan_v1.txt`, `requirement_extraction_v1.txt`).
- Output is strict JSON validated with Pydantic; malformed output is repaired (shape normalization)
  and retried; a deterministic fallback builder guarantees delivery if the provider is unavailable.
- Generation metadata (`prompt_version`, `model`, `provider`, `retry_log`) is persisted.

### 3.2 Pipeline 2 — Python Ground-Truth Validation

Deterministic checks (no GenAI):
mandatory coverage, source traceability/validity, unsupported requirements, role relevance,
duplicate detection, learning sequence/prerequisites, contradictions, and hallucination flags.
Produces scores (coverage, traceability, consistency) and a verification status.

### 3.3 Comparison Engine

Emits requirement-level rows (GenAI value vs Python value, result, status, detail) used in the UI
and the export report.

## 4. Data model (logical)

| Entity | Purpose |
|---|---|
| `documents` | Uploaded documents with version, category, effective/expiry dates, quarantine flags |
| `document_chunks` | Traceable sections (document → section → heading → page) |
| `role_requirements` | Role Requirement Matrix (role, mandatory, priority, due stage, source) |
| `employees` | Employee profiles |
| `plans` | Generated plans (`payload` JSON) with status, model, prompt version, source versions |
| `users` | Accounts and roles |

Relationship chain enabling traceability and impact analysis:

```
document → requirement → generated module → task/quiz → employee plan
```

## 5. Role Requirement Matrix

Built from documents via AI extraction (`role_matrix/matrix.py`) with a deterministic fallback,
plus a curated seed matrix. Requirements carry: role, requirement type, mandatory, priority,
due stage, assessment topic, and source document/section/chunk. `All Roles` requirements apply to
every role.

## 6. Verification statuses and scores

Statuses: `Verified`, `Verified with Warning`, `Partially Verified`, `Source Support Missing`,
`Requirement Missing`, `Unsupported Requirement`, `Outdated Source`, `Contradiction Detected`,
`Manual Review Required`, `Duplicate Detected`, `Sequence Error`, `Hallucination Flag`.

Scores: mandatory coverage, source traceability, requirement consistency, plus counts for missing,
unsupported, contradictions, duplicates, sequence issues, and hallucinations.

**A plan is `Verified` only when mandatory coverage and traceability pass and there are no
unresolved contradictions or unsupported requirements.**

## 7. Policy management

- **Precedence rules** (`policy_management/precedence.py`): latest approved policy > department SOP >
  FAQ > informal guidance; the effective document is chosen by precedence then version.
- **Impact analysis** (`policy_management/impact.py`): follows document → module → task/quiz → plan/employee.
- **Version updates** (`POST /policy/upload-version`): previous rows deactivated, requirements marked
  `Superseded`, new version parsed/re-extracted (history retained).
- **Selective regeneration** (`POST /policy/regenerate`): only affected modules are regenerated and
  revalidated; unrelated requirements are preserved.

## 8. Security

JWT auth, role-based access, learner plan ownership, prompt-injection detection/sanitization,
quarantine, untrusted-data handling, output schema validation, and audit retention.
See `docs/SECURITY_TESTING_REPORT.md`.

## 9. Testing

`backend/tests/` (pytest) covers:
generation normalization/fallback/schema validity, validation coverage/traceability/statuses,
contradiction handling (including the "rule restatement" case), precedence/supersede,
requirement supplementing, and generation consistency.

Independent/manual testing additionally covered auth/RBAC, document ingestion/quarantine,
matrix integrity (no broken source links), full-corpus AI generation, revalidation, review,
task progress, dashboards, and report export.

## 10. Results (sample)

- Fictional dataset: **Nexora Technologies** — 28 current documents, 10 role descriptions,
  1 adversarial (quarantined), curated matrix + AI-extracted requirements.
- Full-corpus AI plan for *Software Engineer*: **100% mandatory coverage**, **100% traceability**,
  status `Verified`, with `0` missing/unsupported/contradiction/duplicate/sequence issues.
- AI requirement extraction integrity: all requirements source-linked, `0` quarantined citations.
- Generation consistency: requirement overlap **100%** on repeated generation (source/topic overlap
  reported as the components that vary).

## 11. Design decisions

- Custom PostgREST client to match the provided seeded schema without a service key.
- Validation kept fully deterministic so it cannot share the generator's failure modes.
- AI output never trusted directly; schema validation + normalization + independent checks.
- Deterministic fallback to guarantee availability when AI providers are rate-limited.

## 12. Limitations

- Semantic (free-text) hallucination detection is limited to source-linked structured fields.
- Free-tier AI quotas can trigger deterministic fallback (less rich but still validated).
- No rate limiting / brute-force protection in this academic build.
- Some dataset targets (10 version changes, 10 conflicts, 10 adversarial) are partially met.

## 13. Future work

- Strengthen semantic entailment checks for free-text claims.
- Add richer quiz-attempt analytics for adaptive learning.
- Expand the adversarial/conflict/version dataset to full target counts.
- Add CI (pytest + tsc) and deployment hardening.
