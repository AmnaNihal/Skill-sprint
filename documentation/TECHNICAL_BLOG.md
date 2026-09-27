# SkillSprint AI — Technical Blog

*Building a source-grounded, role-specific Generative-AI onboarding platform with an independent Python validation pipeline.*

## The business problem

Every company accumulates onboarding knowledge in a sprawl of documents: the employee handbook,
HR and leave policies, information-security and data-privacy policies, role descriptions, department
SOPs, process manuals, compliance instructions, escalation procedures, and FAQs. When a new employee
joins, someone has to read across all of that, work out which parts apply to this specific role and
department, and turn it into a training plan with modules, tasks, checklists, quizzes, and
assessments. It is slow, inconsistent, and hard to audit — and when a policy changes, nobody knows
which onboarding content just became wrong.

SkillSprint AI automates that process while keeping every generated item traceable to an approved
company document. The hard part is not generating text with an LLM; the hard part is *trusting* it.
An LLM will happily invent a company rule that does not exist. So the project's central design rule
is this: **generation and verification are two separate pipelines, and the verifier never asks an AI
for permission.**

## The two-pipeline architecture

**Pipeline 1 — GenAI generation.** Given an employee (role, department, experience, joining date)
and the applicable requirements plus their source document chunks, a Generative-AI model returns a
*structured JSON* onboarding plan: modules with objectives and key concepts, tasks, checklists,
quizzes (multiple choice, multiple response, true/false, scenario), assessments with rubrics, due
stages, prerequisites, and source citations. Nothing free-form — everything is JSON validated with
Pydantic. A provider abstraction supports DeepSeek, Google Gemini, and OpenAI, and a deterministic
fallback builder guarantees a plan even when the provider is rate-limited.

**Pipeline 2 — independent deterministic validation.** This pipeline is pure Python. It receives the
generated JSON, the approved Role Requirement Matrix, approved document metadata and versions,
source sections, precedence rules, and business rules, then independently decides whether the plan
is complete, role-relevant, source-grounded, current, and contradiction-free. No Generative-AI model
is used to approve Pipeline 1's output. The expected answer is never derived from the generated
answer — it comes from the matrix and the documents.

Keeping these separate is what turns "an AI chatbot that writes training text" into an auditable
system.

## Document processing and source grounding

Documents arrive as PDF or DOCX. A validation gate rejects unsupported types, empty files, duplicates
(by content hash), and — importantly — placeholder content such as lorem ipsum or "TBD/sample text".
Then a Python parser extracts text and sections, and a chunker splits it into traceable chunks that
retain document ID, section ID, heading, page/location, and version. Every downstream artifact can
therefore point back to an exact source.

We added an **AI intake gate**: after the deterministic checks pass, a model classifies whether the
document is genuinely a company internal document and suggests its type, category, department, and
version. This feeds a pre-flight *inspect* view in the UI, so selecting a file immediately shows
Python extraction results, the AI classification, and a requirement preview, and auto-fills the
upload form. Only verified company documents can be ingested.

## The Role Requirement Matrix — the ground truth

The matrix is the independent reference that makes validation meaningful. Each row carries a
requirement ID, role, department, requirement text, competency, requirement type, mandatory/optional
status, priority, source document and section and version, due stage, assessment topic, and
prerequisites. Requirements are extracted from documents with AI assistance, but the matrix is
*approved data* — the validator reads it, not the generated plan. A plan cannot validate itself into
correctness.

## What Pipeline 2 actually checks

Pipeline 2 runs an ordered set of deterministic validators:

- **Schema** — required fields, types, enums, duplicate IDs, malformed nesting.
- **Requirement coverage** — every applicable mandatory requirement must appear in the plan.
  `Coverage = covered mandatory / total mandatory × 100`.
- **Missing and unsupported** — omitted requirements and generated requirement IDs that are not in
  the matrix are both reported individually.
- **Source traceability** — `Traceability = mandatory items with valid source / total × 100`; items
  with missing or invalid sources are never counted as valid.
- **Source validity** — referenced documents must exist, be active, and not be quarantined.
- **Document version** — content that references a superseded version is flagged `Outdated Source`.
- **Role relevance** — content that is valid company information but belongs to another role is
  flagged unless the matrix marks it applicable.
- **Duplicates** — normalized-title and similarity checks across modules, tasks, checklists, quizzes.
- **Sequence and prerequisites** — invalid stages, advanced content on Day 1, assessment before
  learning content, and prerequisite ordering.
- **Contradictions** — matrix-mandatory vs module-optional, due-stage conflicts, prohibitions vs
  generated tasks, and cross-document conflicts resolved by precedence.
- **Hallucination / unsupported content** — items with absent or unknown sources.
- **Structural checks** — checklist, task, assessment (including practical rubrics), and quiz
  (options, answer ranges, source mapping).

Scores and the final status are computed here, never supplied by the model or the client. In fact,
any `validation_status` or `coverage_score` field coming from the AI or a client is dropped and
recomputed — a small but crucial security detail.

## Statuses and the final decision

Pipeline 2 assigns deterministic statuses: `Verified`, `Verified with Warning`, `Partially Verified`,
`Incomplete`, `Source Support Missing`, `Requirement Missing`, `Unsupported Requirement`,
`Outdated Source`, `Contradiction Detected`, `Unsupported`, and `Manual Review Required`. A single
function, `determine_final_status`, is the only place that decision is made. `Verified` requires all
mandatory requirements covered, valid source references, no unsupported content, and no unresolved
contradictions. No plan is verified "because the JSON parsed and it looked professional".

## Comparison, consistency, and evidence

A comparison engine produces requirement-level rows comparing the GenAI result with the Python
ground truth across structured fields (requirement ID, role, mandatory status, priority, due stage,
source document and section, competency, assessment topic). The project requires at least 100 such
comparison results; the current data set produces thousands. A separate consistency check regenerates
a plan and compares structured output across repeated generations, so drift is visible. Reports
export to CSV and JSON.

## Policy updates, impact analysis, and selective regeneration

When a policy is replaced, the system doesn't regenerate everyone's plan from scratch. A new version
is uploaded (older rows are deactivated and their requirements marked `Superseded`), an impact
analysis follows the dependency chain *document → section → requirement → module → task/quiz →
plan/employee* to find what is affected, and selective regeneration rebuilds only the affected
modules before revalidating. Both generation and validation exclude superseded requirements, so a
plan can never rely on obsolete policy. This is also a nice demonstration of why structural
traceability matters: without it, you cannot answer "what broke because this policy changed?"

## Security: prompt injection and least trust

Uploaded documents are untrusted data, never instructions. The system detects and neutralizes
instruction-like text ("ignore all previous instructions", "system:", "approve this employee",
"mark as approved"), quarantines flagged documents, and excludes quarantined documents from
requirement extraction. But the deepest defence is architectural: even if a document could influence
generation, Pipeline 2 still rejects content without valid source support. Server-side RBAC (JWT +
roles), learner ownership checks, and secrets kept only in environment variables complete the picture.
We maintain adversarial test documents specifically to demonstrate that injected instructions do not
change application behaviour.

## Testing

The backend has a growing pytest suite (57 tests at the time of writing) covering generation
normalization and fallback, schema validity, scoring formulas, status decisions, contradiction
handling (including the subtle case where a task *restates* a rule and must not be flagged as a
violation), precedence and superseded versions, requirement supplementing, result-model security, and
audit events. A parallel manual testing guide covers authentication and RBAC, document ingestion and
quarantine, traceability, plan generation, validation, comparison, human review, learner progress,
policy updates, hidden-input readiness, and boundary conditions.

## Human review and audit

Flagged or uncertain cases go to a review queue. Reviewers can approve, reject, edit, or regenerate
with a comment. Critically, the original automated result is preserved — overrides are appended, not
overwritten — and a domain audit trail records validation start/completion, missing and unsupported
requirements, contradictions, outdated sources, manual-review routing, and reviewer overrides with
timestamps and object IDs.

## Challenges and lessons learned

**Reproducibility vs richness.** LLMs produce beautifully varied output; downstream logic needs
predictability. We solved this by treating the model as a structured-data producer, normalizing its
shape variation, and giving the validator a single, explicit contract.

**Grouping breaks naive checks.** When a model groups several requirements into one module, a
per-module `due_stage` can conflict with a Day-1 requirement. The fix was to align module stages to
the earliest covered requirement and to mark modules mandatory if they cover any mandatory
requirement — small normalizations that removed a whole class of false contradictions.

**False positives erode trust.** A crude phrase check flagged "must not share passwords" as a
contradiction because "must notify" contains the substring "must not". Word-boundary matching and
negation-aware logic fixed it. A validator that cries wolf is worse than no validator.

**Data changes reveal staleness.** After expanding the dataset, previously "Verified" plans were
correctly re-flagged as incomplete because new company-wide requirements had appeared. That is the
system working as intended, and it is exactly the pain real onboarding teams feel.

## Limitations and future work

Semantic free-text hallucination detection is inherently limited: where deterministic verification
cannot safely confirm a claim, the system flags it for manual review rather than pretending otherwise.
Similarity-based duplicate detection assists but never replaces requirement validation. In this build
the seeded database schema is consumed as-is (nested content is stored as JSON in the plan payload);
with DDL access, the same validators map one-to-one onto normalised tables. Future work includes
stronger entailment checks, richer quiz-attempt analytics for adaptive learning, and a broader
adversarial dataset.

## Conclusion

SkillSprint AI is not "an LLM that writes training plans". It is a document-intelligence system, a
role-requirement ground truth, a Generative-AI generation pipeline, an independent deterministic
validation engine, a comparison and verification layer, and a human-review/audit workflow — combined
into one traceable, role-specific onboarding platform. The core idea is simple and, we think, right:
let the AI generate, let Python decide, and let humans handle what remains uncertain.
