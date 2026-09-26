# Pipeline 2 — Independent Python Ground-Truth Validation (Design)

> Deliverable for the requested design-first review. Covers A–S. Each item is tagged
> **[SRS]** (mandatory per SRS) or **[Rec]** (implementation recommendation).
> No GenAI is used to approve Pipeline 1 output. Ground truth = Role Requirement Matrix +
> approved document metadata + business rules + configuration.

---

## A. Pipeline 2 architecture

```
Pipeline 1 structured JSON ─┐
Role Requirement Matrix ────┤
Approved documents + versions┤──► ValidationContext (trusted, immutable per run)
Source sections/chunks ─────┤
Precedence + prerequisite +
business rules (config) ────┘
                │
                ▼
      ValidationEngine.validate(context)
                │  runs ordered validators, each pure & deterministic
                ▼
        ValidationResult (+ findings, comparison rows, status)
                │
                ▼
        StatusEngine.determine_final_status(result)   ← single source of truth
                │
                ▼
        Manual Review queue (if required) → reviewer decision (audit-preserved)
```

**Hard rules [SRS]**
- No GenAI call inside Pipeline 2.
- Expected result never derived from Pipeline 1 output.
- Client/GenAI-supplied `validation_status`, `coverage_score`, `approved`, etc. are ignored.
- Structural comparison only (IDs, sources, versions, roles, flags), never exact sentences.

---

## B. Validation flow [SRS §34]

1. Schema validation (Pydantic).
2. Build context (batch-load ground truth once).
3. Requirement-ID validation (exists / active / applies to role / mandatory flag).
4. Mandatory coverage + missing-requirement detection.
5. Unsupported-requirement detection.
6. Role relevance.
7. Source reference validation (doc + section + mapping).
8. Document version validation (active vs superseded → Outdated Source).
9. Policy precedence resolution.
10. Contradiction detection.
11. Duplicate detection.
12. Prerequisite validation.
13. Learning-sequence validation.
14. Checklist validation.
15. Task validation (task–role alignment).
16. Assessment-topic coverage.
17. Quiz source validation.
18. Hallucination / unsupported-content check.
19. Scoring (coverage, traceability, consistency).
20. Comparison rows.
21. Final status decision.
22. Manual-review routing.
23. Evidence persistence (findings stored in plan payload; audit entries).

---

## C. ValidationContext design [SRS §33]

Single immutable object built once per run (prevents inconsistent repeated fetches) **[SRS]**.

```python
@dataclass(frozen=True)
class ValidationContext:
    employee_id: str
    role: str
    department: str
    experience_level: str
    generated_plan: dict              # Pipeline 1 output (untrusted)
    applicable_requirements: list[Requirement]   # role + All Roles, active
    all_requirements: list[Requirement]          # for unsupported detection
    documents: dict[str, DocumentMeta]           # id -> meta (active, versions, category)
    sections_by_doc: dict[str, set[str]]         # doc_id -> section_ids
    chunk_by_doc_section: dict[tuple[str,str], str]
    active_version_by_doc: dict[str, str]
    precedence_rules: list[PrecedenceRule]       # [Rec] configurable, not hardcoded
    prerequisites_by_req: dict[str, set[str]]    # [Rec] structural dependency map
    rules: BusinessRules                         # thresholds/enums [Rec]
```

Built by `context_builder.build_context(...)` from one batched load (documents, chunks,
role_requirements, plans) — no per-validator DB access **[SRS §40]**.

---

## D. Database entities [SRS §35]

**Ideal entities (SRS):** requirements, role_requirements, documents, document_versions,
document_chunks, requirement_sources, prerequisites, policy_precedence_rules, onboarding_plans,
learning_modules, checklists, tasks, quiz_questions, assessments, validation_runs,
validation_results, comparison_results, contradiction_records, unsupported_content_flags,
manual_reviews, reviewer_decisions, audit_logs.

**Actual environment (deviation — see note):** the seeded Supabase/PostgreSQL schema exposes
`documents`, `document_chunks`, `role_requirements`, `plans` (payload JSONB), `employees`, `users`.
The target project has **no DDL/service-key access**, so:
- `onboarding_plans` + nested modules/tasks/quizzes/checklists/assessments → `plans.payload` **[Rec]**
- `validation_runs/results`, `comparison_results`, `contradiction_records`,
  `unsupported_content_flags`, `manual_reviews/reviewer_decisions` → `plans.payload.validation` **[Rec]**
- `policy_precedence_rules`, `prerequisites` → configuration modules (`policy_management/precedence.py`,
  requirement `prerequisites` column / config) **[Rec]**
- `audit_logs` → domain records (plan/requirement timestamps, validation history, reviews) **[Rec]**

> If DDL becomes available, these entities map 1:1 to real tables without changing validators.

---

## E. Python module structure [SRS §32]

Target (splitting today's monolithic `python_validation/engine.py`):

```
python_validation/
├── validation_engine.py         # orchestration (validate_plan)
├── validation_context.py        # ValidationContext + builder
├── result_models.py             # Pydantic dataclasses (result schema)
├── schema_validator.py          # Pydantic schema check
├── requirement_validator.py     # ids / existence / mandatory / unsupported
├── coverage_validator.py        # coverage + missing
├── source_validator.py          # doc/section/mapping + traceability
├── role_validator.py            # role relevance
├── version_validator.py         # active vs superseded
├── precedence_validator.py      # configurable precedence
├── contradiction_validator.py   # wraps contradiction_checks
├── duplicate_validator.py       # normalized + Jaccard
├── prerequisite_validator.py    # structural deps
├── sequence_validator.py        # stage ordering
├── checklist_validator.py
├── task_validator.py            # task–role alignment
├── assessment_validator.py
├── quiz_validator.py
├── unsupported_content_validator.py  # wraps hallucination_checks
├── scoring.py
├── status_engine.py             # determine_final_status (single source)
└── exceptions.py
comparison_engine/
├── comparison_service.py
├── field_comparator.py
└── comparison_models.py
```

---

## F. Pydantic models (core) [SRS §5,§26]

```python
class Finding(BaseModel):
    requirement_id: str | None
    field_name: str
    genai_value: str
    python_value: str
    result: Literal["Match","Mismatch","Missing","Unsupported","Warning"]
    validation_status: str
    detail: str

class RequirementResult(BaseModel):
    requirement_id: str
    expected: bool
    generated: bool
    source_valid: bool = False
    role_valid: bool = False
    version_valid: bool = False
    mandatory: bool = False
    validation_status: str

class ValidationSummary(BaseModel):
    total_mandatory_requirements: int
    covered_mandatory_requirements: int
    coverage_score: float
    traceability_score: float
    missing_requirement_count: int
    unsupported_requirement_count: int
    contradiction_count: int
    outdated_source_count: int

class ValidationResult(BaseModel):
    employee_id: str
    role: str
    summary: ValidationSummary
    requirements: list[RequirementResult]
    findings: list[Finding]
    final_status: str
    schema_errors: list[str] = []
    requires_manual_review: bool = False
```

**Security [SRS §38]:** any incoming `validation_status`/`coverage_score`/`approved` fields are
dropped during normalization and recomputed.

---

## G. Validation result schema [SRS §26]

Matches the SRS example:
```json
{
  "employee_id": "EMP001",
  "role": "Customer Support Executive",
  "summary": { "total_mandatory_requirements": 10, "covered_mandatory_requirements": 9,
               "coverage_score": 90.0, "traceability_score": 100.0,
               "missing_requirement_count": 1, "unsupported_requirement_count": 0,
               "contradiction_count": 0, "outdated_source_count": 0 },
  "requirements": [ {"requirement_id":"R001","expected":true,"generated":true,
                     "source_valid":true,"role_valid":true,"version_valid":true,
                     "validation_status":"Verified"} ],
  "final_status": "Incomplete"
}
```

---

## H. Coverage score design [SRS §6,§24]

```
Coverage = Covered Mandatory Requirements / Total Mandatory Requirements × 100
```
- Applicable mandatory = matrix rows for role + `All Roles`, active, `mandatory = true`.
- Covered = requirement_id appears in any generated module/task/quiz `requirement_ids`.
- Computed from stored data only; never from GenAI fields.
- Target for final approval: **100%** [SRS].

## I. Traceability score design [SRS §12,§25]

```
Traceability = Mandatory Generated Items With Valid Source Reference /
               Total Mandatory Generated Items × 100
```
- "Valid source" = `source_document_id` exists, is approved/active, and `source_section_id`
  belongs to that document (via chunk/section map).
- Items with missing/invalid sources are **not** counted as valid.
- Target: **100%** for mandatory content [SRS].

---

## J. Role relevance logic [SRS §9,§30]

```
applicable(role) = matrix roles where role == selected_role OR role == "All Roles"
```
- A generated requirement whose id maps to a different role's requirement → `Role Relevance Failed`
  (unless the matrix explicitly marks it applicable/All Roles).
- Generated module `role` field mismatching plan role → `Manual Review Required` [Rec severity].
- Company-valid-but-role-irrelevant content (e.g., payroll authorization for support) → flagged.

## K. Source validation logic [SRS §11]

For each item: `source_document_id` exists → approved (`is_active`, not quarantined) →
`source_section_id` present in that document's sections → requirement↔section mapping exists →
version valid. Failures → `Source Support Missing` / `Outdated Source`.

## L. Version validation logic [SRS §13]

- Build `active_version_by_doc` from documents.
- If generated item's `source_version` < active version → `Outdated Source`; record
  generated vs current version + replacement.
- Superseded documents (is_active=false, or version lower) are never treated as current.

## M. Contradiction & precedence logic [SRS §14,§15]

- Precedence config **[Rec]**: `Latest Approved Policy (1) > Department SOP (2) > FAQ (3) > Informal Guidance (4)`
  (`policy_management/precedence.py`; endpoint `/policy/precedence`). Not hardcoded per-validator.
- Deterministic contradiction classes: matrix-mandatory vs module-optional; due-stage conflicts;
  prohibitions vs generated tasks; conflicting statements across documents with precedence resolution.
- Each record: `{conflict_id, source_a, source_b, statement_a, statement_b, precedence_rule,
  resolution, manual_review}`.
- **Limitation [SRS §15]:** semantic NL contradictions cannot be perfectly detected deterministically;
  unresolved/equal-precedence cases → `Manual Review Required`.

## N. Duplicate detection logic [SRS §16]

- Normalize (lowercase, strip punctuation, collapse whitespace).
- Exact normalized match + token **Jaccard** threshold (default 0.85 **[Rec]**) for modules, tasks,
  checklists, quizzes.
- Store `{kind, ids, similarity}`. Similarity assists only; it never replaces requirement validation.

## O. Prerequisite & sequence logic [SRS §17,§18]

- Structural prerequisite map (`R003 requires R001`) — stored, not inferred at runtime.
- Checks: missing prerequisite, prerequisite appearing later (wrong order), advanced task before
  basic learning, assessment before required learning.
- Sequence: validate stage order over `Day 1 → … → First 90 Days`; advanced-on-Day-1 and
  invalid stages flagged.

## P. Final status decision rules [SRS §27,§28]

Single function `determine_final_status(result)` — not duplicated elsewhere **[SRS]**:

```
if unresolved contradictions            -> "Contradiction Detected"
elif missing mandatory                  -> "Incomplete" / "Partially Verified"
elif unsupported requirements/hallucin. -> "Unsupported Requirement"
elif outdated sources                   -> "Outdated Source"
elif false schema                       -> "Schema Invalid"
elif coverage==100 and traceability==100 and no issues -> "Verified"
elif coverage==100 and traceability>=90 and only warnings -> "Verified with Warning"
else                                    -> "Manual Review Required"
```
`Verified` **requires** all: mandatory covered, valid sources, no unsupported, no unresolved
contradictions, role/version checks passed [SRS].

## Q. Manual-review workflow [SRS §29,§30,§31]

- `requires_manual_review` set when any unresolved/uncertain/equal-precedence case exists.
- Queue derived from plan status; reviewer actions: approve / reject / edit / regenerate / comment.
- **Override preserves the original result** and appends `{reviewer, decision, comment, timestamp,
  before/after}` — nothing deleted [SRS].
- Audit entries: validation_started/completed/failed, mismatch, missing, unsupported, source_failure,
  contradiction, outdated_source, manual_review, override (with timestamps + object ids).

## R. Testing strategy [SRS §37]

`backend/tests/` (pytest, deterministic, no network): valid plan; missing mandatory; unsupported;
wrong role; invalid id; missing/wrong source; wrong section; superseded policy; conflicting docs;
precedence resolution; duplicate module/task; missing prerequisite; wrong sequence; missing
assessment; invalid quiz source; unsupported claim; broken JSON; missing field; wrong type;
100% & partial coverage; 100% & partial traceability; manual-review routing; reviewer override;
final Verified / non-Verified decisions. Fixtures use a small fictional matrix + documents.

## S. Example input/output [SRS §36]

Input: role = Customer Support Executive; expected mandatory `R001,R002,R003`; generated `R001,R003,R099`.
Output:
```
R001 Verified | R002 Requirement Missing | R003 Verified | R099 Unsupported Requirement
Coverage = 2/3 = 66.67% ; unsupported = 1 ; missing = 1
final_status = Incomplete (→ Manual Review Required)   # never "Verified"
```

---

## Current state vs this design (honesty)

- **Exists today:** `python_validation/engine.py` (coverage, traceability, unsupported, role, duplicates,
  sequence/prereq, contradictions via `contradiction_checks`, hallucinations via `hallucination_checks`,
  scores, deterministic status) + `comparison_engine/comparator.py` + `policy_management/precedence.py`.
  It already obeys the "no GenAI in Pipeline 2" and "structural comparison" rules.
- **Gap to this design:** monolith → modular validators; explicit `ValidationContext`;
  `RequirementResult` model; dedicated `status_engine`; batch context load; audit constants;
  quiz/assessment/checklist validators as separate units; comparison field-level model.
- **[Rec] migration** happens without changing external behavior (existing endpoints/tests stay green).

## SRS-required vs recommendation summary

- **SRS-required:** independence from GenAI; matrix as ground truth; schema validation; coverage &
  traceability formulas; missing/unsupported/role/source/version; contradictions; precedence;
  duplicates; prerequisites/sequence; checklist/task/assessment/quiz validation; hallucination flags;
  statuses; final Verified conditions; manual review + override + audit; explainability; structural
  (not sentence) comparison; hidden-eval readiness (no hardcoding).
- **Recommendation (mine):** exact precedence hierarchy; Jaccard threshold; module structure split;
  payload/JSON storage given no DDL; severity weights; `Verified with Warning` threshold (traceability ≥90).

---

**Awaiting approval to implement phase-by-phase (Phase 1 → Phase 11).**
