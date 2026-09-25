# Security Testing Report

## Scope

SkillSprint AI processes untrusted uploaded documents and exposes role-based operations.
This report documents the security controls and the tests performed.

## Controls implemented

| Area | Control | Location |
|---|---|---|
| Authentication | JWT (HS256) issued by backend, bcrypt password hashes | `security/auth.py`, `routers/auth.py` |
| Authorization | Role guards (`require_admin` = admin/manager/reviewer/training_manager) | `security/auth.py` |
| Ownership | Learners can only modify their own plan tasks | `routers/plans.py` |
| Prompt injection | Detection + sanitization of instruction-like text; quarantine | `genai_pipeline/generator.py`, `routers/documents.py` |
| Untrusted data | Source content passed as DATA; system instructions separated | `prompt_templates/*` |
| Output trust | AI output must pass JSON schema validation + Python validation | `genai_pipeline/schema_validator.py` |
| Source integrity | Every generated item must cite an approved document/section | `python_validation/engine.py` |
| Audit | Reviews appended, original results preserved; superseded versions retained | `routers/plans.py`, `routers/policy.py` |
| Secrets | Only `.env.example` committed; `.env` git-ignored | `.gitignore` |

## Prompt injection defence

1. Source text is treated as untrusted DATA and never as instructions.
2. `detect_injection()` flags patterns (`ignore previous instructions`, `system:`,
   `approve this employee`, `extract the API key`, etc.).
3. `sanitize_source_text()` neutralizes matched patterns before they reach the model.
4. Documents with injection flags are stored **quarantined** and excluded from requirement extraction.
5. Even if the model were manipulated, Pipeline 2 independently rejects unsupported content and
   missing source references, so a document cannot force approval.

## Test cases

| # | Test | Method | Expected | Result |
|---|---|---|---|---|
| S1 | Prompt-injection detection | `detect_injection()` unit test | Flags injected patterns | Pass (`tests/test_generator.py`) |
| S2 | Injection sanitization | `sanitize_source_text()` unit test | Neutralizes patterns | Pass |
| S3 | Adversarial document | Upload `NEX-ADV-001` | Quarantined, excluded | Pass |
| S4 | Learner → generate plan | `POST /plans/generate` as learner | `403` | Pass |
| S5 | Learner edits another plan | `POST /plans/task/toggle` | `403` | Pass |
| S6 | Missing source cited | Validation unit test | Flagged as hallucination/unsupported | Pass |
| S7 | AI output without source | Schema/validation | Not marked Verified | Pass |
| S8 | Invalid login | `POST /auth/login` wrong password | `401` | Pass |
| S9 | Secrets in repo | Secret scan + git history | No keys committed | Pass |

## Residual risks / limitations

- Semantic hallucination detection is limited to structured fields and source references;
  natural-language claims that are not source-linked are flagged rather than fully resolved.
- Free-tier AI quota can cause provider fallback; the deterministic fallback is less rich but
  still validated for coverage and traceability.
- Rate limiting / brute-force protection is not implemented in this academic build.
