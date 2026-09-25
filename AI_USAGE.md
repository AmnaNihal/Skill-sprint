# AI Usage Declaration

This file records how AI tools were used during the development of SkillSprint AI, as required
by the SRS. AI was used as a development assistant only. All generated code was reviewed, adapted,
tested, and is understood by the team. The **application itself** uses a GenAI API at runtime
(DeepSeek/Gemini/OpenAI) — that is a product requirement, separate from development assistance.

| # | AI tool | Purpose | Assistance type | Area / files affected | Modification made | Test performed | Verified by |
|---|---------|---------|-----------------|-----------------------|-------------------|----------------|-------------|
| 1 | AI coding assistant | Design FastAPI backend structure | Code explanation + drafts | `backend/main.py`, `backend/routers/*` | Adapted routing, wired Supabase client | API E2E smoke tests | Team |
| 2 | AI coding assistant | Supabase/PostgREST integration | Draft client | `backend/database/supabase_client.py` | Reworked count/select handling | Live REST calls | Team |
| 3 | AI coding assistant | GenAI pipeline + JSON schema | Draft prompt + parsing | `backend/genai_pipeline/*` | Added provider fallback, compact schema, normalization | `tests/test_generator.py` | Team |
| 4 | AI coding assistant | Python validation engine | Draft checks | `backend/python_validation/engine.py` | Added coverage/traceability/status logic | `tests/test_validation.py` | Team |
| 5 | AI coding assistant | Contradiction detection | Draft heuristics | `backend/contradiction_checks/detector.py` | Fixed `must not` vs `must notify`, added negation handling | `tests/test_validation.py` | Team |
| 6 | AI coding assistant | Policy precedence & impact | Draft functions | `backend/policy_management/*`, `backend/routers/policy.py` | Implemented precedence, supersede, selective regeneration | `tests/test_policy.py` | Team |
| 7 | AI coding assistant | Generation consistency | Draft score | `backend/genai_pipeline/consistency.py` | Jaccard weighting method | `tests/test_policy.py` | Team |
| 8 | AI coding assistant | React frontend integration | Draft components | `src/components/**`, `src/context/AuthContext.tsx` | Wired backend JWT + bulk upload | `tsc --noEmit`, manual UI test | Team |
| 9 | AI coding assistant | Documentation | Draft text | `README.md`, `documentation/*` | Reviewed and corrected for accuracy | Manual review | Team |

## Notes

- Prompt templates are versioned (`backend/prompt_templates/`) and logged per generation
  (`prompt_version`, `model`, `generated_at`).
- AI output is never trusted directly: it passes JSON schema validation and the independent
  Python validation pipeline before approval.
- No hard-coded plans, quiz answers, or validation scores are used. The hidden-evaluation
  documents are processed through the same generic pipeline.
