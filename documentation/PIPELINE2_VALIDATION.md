# Pipeline 2 — Validation Evidence & Logic

Supplementary evidence for the independent Python validation pipeline (SRS §61/§64).
No Generative AI is used in this pipeline.

## Inputs
Generated plan JSON (Pipeline 1) · Role Requirement Matrix (`role_requirements`) ·
approved documents + versions (`documents`) · source sections/chunks (`document_chunks`) ·
precedence configuration (`policy_management/precedence.py`).

## Output
`plans.payload.validation` = `{ findings, comparison, summary, missing, unsupported, contradictions,
duplicates, sequence_issues, hallucinations, outdated_sources, schema_errors, reviews, validated_at }`.

## Checks and formulas

| Check | Rule | Source |
|---|---|---|
| Schema | Pydantic `GenOnboardingPlan` + structural rules | `genai_pipeline/schema_validator.py`, `validators/schema_validator.py` |
| Mandatory coverage | covered mandatory / total mandatory × 100 | `python_validation/scoring.py` |
| Missing | expected applicable mandatory not present | `python_validation/engine.py` |
| Unsupported | generated requirement id not in matrix | `python_validation/engine.py` |
| Source traceability | mandatory items with valid source / total × 100 | `scoring.py` + `engine.py` |
| Source validity | doc exists, active, not quarantined | `engine.py` |
| Document version | generated/requirement version < active → Outdated Source | `validators/version_validator.py` |
| Role relevance | module role ≠ plan role | `validators/role_validator.py` |
| Duplicates | normalized title match across items | `validators/duplicate_validator.py` |
| Sequence / prerequisites | stage order, advanced-on-Day-1, prerequisite order | `validators/sequence_validator.py` |
| Contradictions | matrix-mandatory vs optional; due-stage; prohibitions | `validators/contradiction_validator.py` → `contradiction_checks/` |
| Hallucination / unsupported | items with unknown/absent source | `hallucination_checks/` |
| Checklist / task / assessment / quiz | structure, source, rubric, option ranges | `validators/structure_validators.py` |
| Policy precedence | configurable hierarchy | `policy_management/precedence.py` |
| Final status | deterministic rules | `python_validation/status_engine.py` |

## Final-status rules (single source: `status_engine.determine_final_status`)

```
schema errors      -> Manual Review Required
contradictions     -> Contradiction Detected
missing mandatory  -> Incomplete / Partially Verified
unsupported/halluc -> Unsupported
outdated sources   -> Outdated Source
duplicates/sequence-> Verified with Warning
coverage=100 & traceability=100 -> Verified
coverage=100 & traceability>=90 -> Verified with Warning
else               -> Manual Review Required
```

`Verified` requires: all mandatory covered, valid sources, no unsupported/hallucinated content,
and no unresolved contradictions (SRS §28).

## Superseded-requirement rule (SRS §13)
Both generation (`routers/plans.py`) and validation (`python_validation/engine.py`) exclude
requirements with `approval_status = "Superseded"`, so plans can never rely on obsolete policy.

## CLI evidence
```powershell
cd backend
python -m pytest tests -q                     # 54 tests
python tools\export_validation_report.py      # reports/validation_report.csv/.json
python tools\export_comparison_report.py      # reports/comparison_report.csv/.json
```

## Latest snapshot
- Tests: **54 passing**
- Validation report: 56 plans, 43 Verified
- Comparison report: 4783 requirement-level rows
- 10 role plans revalidate **Verified, 100% coverage, 0 outdated**

## Security
Client/GenAI supplied `validation_status`/`coverage_score`/`approved` are ignored; scores and
statuses are recomputed from stored data (`result_models.build_validation_result`).
