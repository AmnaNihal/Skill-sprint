"""Pipeline 2: Deterministic Python Ground-Truth Validation (NO GenAI)."""
from dataclasses import dataclass, field, asdict
from typing import Any

from python_validation import scoring
from python_validation.status_engine import report_final_status
from python_validation.validators import requirement_validator, source_validator

VALID_STATUSES = [
    "Verified",
    "Verified with Warning",
    "Partially Verified",
    "Source Support Missing",
    "Requirement Missing",
    "Unsupported Requirement",
    "Outdated Source",
    "Contradiction Detected",
    "Manual Review Required",
    "Duplicate Detected",
    "Sequence Error",
    "Hallucination Flag",
]


@dataclass
class ValidationFinding:
    requirement_id: str
    field_name: str
    genai_value: str
    python_value: str
    result: str  # Match | Mismatch | Missing | Unsupported | Warning
    validation_status: str
    detail: str = ""


@dataclass
class ValidationReport:
    findings: list[ValidationFinding] = field(default_factory=list)
    mandatory_total: int = 0
    mandatory_covered: int = 0
    missing_requirements: list[str] = field(default_factory=list)
    unsupported_requirements: list[str] = field(default_factory=list)
    contradictions: list[str] = field(default_factory=list)
    duplicates: list[str] = field(default_factory=list)
    sequence_issues: list[str] = field(default_factory=list)
    hallucinations: list[str] = field(default_factory=list)
    source_ids_used: list[str] = field(default_factory=list)
    traceable_items: int = 0
    total_generated_items: int = 0
    coverage_score: float = 0.0
    traceability_score: float = 0.0
    consistency_score: float = 0.0
    outdated_sources: list[str] = field(default_factory=list)
    schema_errors: list[str] = field(default_factory=list)
    verification_status: str = "Manual Review Required"

    def dict(self) -> dict[str, Any]:
        d = asdict(self)
        return d


def _norm(s: str) -> str:
    return (s or "").strip().lower()


def _plan_items(plan: dict) -> list[dict]:
    """Flatten plan modules/tasks/quizzes/checklists into comparable items with req ids + sources."""
    items = []
    for m in plan.get("modules", []):
        items.append(
            {
                "kind": "module",
                "id": m.get("module_id"),
                "title": m.get("module_title"),
                "requirement_ids": set(m.get("requirement_ids") or []),
                "source_document_id": m.get("source_document_id") or "",
                "source_section_id": m.get("source_section_id") or "",
                "mandatory": bool(m.get("mandatory")),
                "due_stage": m.get("due_stage") or "",
                "role": m.get("role") or plan.get("role") or "",
                "assessment_topic": m.get("assessment_topic") or "",
            }
        )
        for t in m.get("tasks") or []:
            items.append(
                {
                    "kind": "task",
                    "id": t.get("title"),
                    "title": t.get("title"),
                    "requirement_ids": {t.get("requirement_id")} if t.get("requirement_id") else set(),
                    "source_document_id": t.get("source_document_id") or "",
                    "source_section_id": t.get("source_section_id") or "",
                    "mandatory": bool(t.get("mandatory")),
                    "due_stage": t.get("due_stage") or "",
                    "role": plan.get("role") or "",
                    "assessment_topic": "",
                }
            )
        for q in m.get("quiz") or []:
            items.append(
                {
                    "kind": "quiz",
                    "id": q.get("question"),
                    "title": q.get("question"),
                    "requirement_ids": {q.get("requirement_id")} if q.get("requirement_id") else set(),
                    "source_document_id": q.get("source_document_id") or "",
                    "source_section_id": q.get("source_section_id") or "",
                    "mandatory": False,
                    "due_stage": "",
                    "role": plan.get("role") or "",
                    "assessment_topic": "",
                }
            )
        for c in m.get("checklist") or []:
            items.append(
                {
                    "kind": "checklist",
                    "id": c.get("activity"),
                    "title": c.get("activity"),
                    "requirement_ids": set(),
                    "source_document_id": c.get("source_document_id") or "",
                    "source_section_id": "",
                    "mandatory": bool(c.get("mandatory")),
                    "due_stage": c.get("due_stage") or "",
                    "role": plan.get("role") or "",
                    "assessment_topic": "",
                }
            )
    return items


def validate_plan(
    plan: dict,
    ground_truth_requirements: list[dict],
    active_document_ids: set[str] | None = None,
    role_title: str = "",
    context: Any = None,
) -> ValidationReport:
    """Independent deterministic validation of GenAI plan against Role Requirement Matrix.

    When a ValidationContext is supplied, document-version (Outdated Source) validation runs
    using the context's active version map.
    """
    report = ValidationReport()
    active_document_ids = active_document_ids or set()
    role = role_title or plan.get("role") or ""

    # Filter ground truth for this role (or All Roles / General)
    def _req_role(r: dict) -> str:
        return str(r.get("role_title") or r.get("role") or "")

    applicable = [
        r
        for r in ground_truth_requirements
        if r.get("is_active", True)
        and (r.get("approval_status") or "Approved") != "Superseded"
        and (
            _norm(_req_role(r)) == _norm(role)
            or _norm(_req_role(r)) in ("all roles", "general", "")
            or (_norm(role) and _norm(role) in _norm(_req_role(r)))
        )
    ]
    mandatory_reqs = [r for r in applicable if r.get("mandatory")]
    report.mandatory_total = len(mandatory_reqs)

    items = requirement_validator.plan_items(plan)
    report.total_generated_items = len(items)

    covered_req_ids, used_sources = requirement_validator.collect_covered_ids(items)
    report.source_ids_used = sorted(used_sources)

    # 1) Mandatory + optional coverage
    total, covered, missing, coverage_findings = requirement_validator.evaluate_mandatory_coverage(
        mandatory_reqs, covered_req_ids
    )
    report.mandatory_total = total
    report.mandatory_covered = covered
    report.missing_requirements.extend(missing)
    for finding in coverage_findings + requirement_validator.evaluate_optional_coverage(applicable, covered_req_ids):
        report.findings.append(ValidationFinding(**finding))

    # 2) Source traceability + validity
    valid_items, source_findings, hallucinations, unsupported_sources = source_validator.validate_sources(
        items, active_document_ids
    )
    report.traceable_items = valid_items
    report.hallucinations.extend(hallucinations)
    report.unsupported_requirements.extend(unsupported_sources)
    for finding in source_findings:
        report.findings.append(ValidationFinding(**finding))
    report.total_generated_items = max(1, len(items))

    # 3) Unsupported generated requirements (items claiming req ids not in matrix)
    matrix_ids = {
        (r.get("requirement_id") or r.get("id"))
        for r in ground_truth_requirements
    }
    unsupported, unsupported_findings = requirement_validator.evaluate_unsupported(items, matrix_ids)
    report.unsupported_requirements.extend(unsupported)
    for finding in unsupported_findings:
        report.findings.append(ValidationFinding(**finding))

    # 4) Role relevance
    from python_validation.validators.role_validator import validate_roles

    for finding in validate_roles(items, role):
        report.findings.append(ValidationFinding(**finding))

    # 5) Duplicate detection
    from python_validation.validators.duplicate_validator import detect_duplicates

    duplicates, duplicate_findings = detect_duplicates(items)
    report.duplicates.extend(duplicates)
    for finding in duplicate_findings:
        report.findings.append(ValidationFinding(**finding))

    # 6) Learning sequence + prerequisites
    from python_validation.validators.sequence_validator import validate_sequence

    sequence_issues, sequence_findings = validate_sequence(plan)
    report.sequence_issues.extend(sequence_issues)
    for finding in sequence_findings:
        report.findings.append(ValidationFinding(**finding))

    # 7) Contradictions via contradiction_checks module
    from python_validation.validators.contradiction_validator import validate_contradictions

    for c in validate_contradictions(plan, ground_truth_requirements, applicable):
        report.contradictions.append(c)
        report.findings.append(
            ValidationFinding(
                requirement_id="-",
                field_name="contradiction",
                genai_value=c,
                python_value="consistent policy required",
                result="Mismatch",
                validation_status="Contradiction Detected",
                detail=c,
            )
        )

    # 8) Document version validation (Outdated Source) — requires trusted context.
    if context is not None:
        from python_validation.validators.version_validator import validate_versions

        outdated, version_findings = validate_versions(plan, context)
        report.outdated_sources.extend(outdated)
        for finding in version_findings:
            report.findings.append(ValidationFinding(**finding))

    # 9) Structural validators (checklist / task / assessment / quiz) — recorded as evidence.
    from python_validation.validators.structure_validators import (
        validate_assessments,
        validate_checklists,
        validate_quiz_answers,
        validate_quizzes,
        validate_tasks,
    )

    for finding in (
        validate_checklists(plan)
        + validate_tasks(plan, role)
        + validate_assessments(plan)
        + validate_quizzes(plan)
        + validate_quiz_answers(plan)
    ):
        report.findings.append(ValidationFinding(**finding))

    # Scores (formulas live in python_validation.scoring — single source)
    report.coverage_score = scoring.coverage_score(report.mandatory_covered, report.mandatory_total)
    report.traceability_score = scoring.traceability_score(valid_items, report.total_generated_items)

    # Requirement consistency: matched findings / total requirement findings
    req_findings = [f for f in report.findings if f.field_name in ("mandatory_coverage", "optional_coverage", "requirement_id")]
    matches = sum(1 for f in req_findings if f.result == "Match")
    report.consistency_score = scoring.consistency_score(matches, len(req_findings))

    # Final verification status — decided ONLY in python_validation.status_engine.
    report.verification_status = report_final_status(report)

    # Persistable label (SRS lists "Partially Verified / Incomplete" as one concept).
    if report.verification_status == "Incomplete":
        report.verification_status = "Partially Verified"

    return report
