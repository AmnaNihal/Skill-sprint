"""Pipeline 2: Deterministic Python Ground-Truth Validation (NO GenAI)."""
from dataclasses import dataclass, field, asdict
from typing import Any

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
) -> ValidationReport:
    """Independent deterministic validation of GenAI plan against Role Requirement Matrix."""
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
        and (
            _norm(_req_role(r)) == _norm(role)
            or _norm(_req_role(r)) in ("all roles", "general", "")
            or (_norm(role) and _norm(role) in _norm(_req_role(r)))
        )
    ]
    mandatory_reqs = [r for r in applicable if r.get("mandatory")]
    report.mandatory_total = len(mandatory_reqs)

    items = _plan_items(plan)
    report.total_generated_items = len(items)

    covered_req_ids: set[str] = set()
    used_sources: set[str] = set()
    for it in items:
        covered_req_ids |= it["requirement_ids"]
        if it["source_document_id"]:
            used_sources.add(it["source_document_id"])
    report.source_ids_used = sorted(used_sources)

    # 1) Mandatory coverage
    for r in mandatory_reqs:
        rid = r.get("id") or r.get("requirement_id")
        if rid in covered_req_ids:
            report.mandatory_covered += 1
            report.findings.append(
                ValidationFinding(
                    requirement_id=rid,
                    field_name="mandatory_coverage",
                    genai_value="Covered",
                    python_value="Required",
                    result="Match",
                    validation_status="Verified",
                    detail=f"Mandatory requirement covered: {r.get('title','')}",
                )
            )
        else:
            report.missing_requirements.append(rid)
            report.findings.append(
                ValidationFinding(
                    requirement_id=rid,
                    field_name="mandatory_coverage",
                    genai_value="Missing",
                    python_value="Required",
                    result="Missing",
                    validation_status="Requirement Missing",
                    detail=f"Mandatory requirement not found in plan: {r.get('title','')}",
                )
            )

    # Optional/non-mandatory requirements for consistency score
    for r in applicable:
        if r.get("mandatory"):
            continue
        rid = r.get("id") or r.get("requirement_id")
        present = rid in covered_req_ids
        report.findings.append(
            ValidationFinding(
                requirement_id=rid,
                field_name="optional_coverage",
                genai_value="Covered" if present else "Not covered",
                python_value="Optional",
                result="Match",
                validation_status="Verified",
                detail="Optional requirement status recorded",
            )
        )

    # 2) Source traceability
    valid_items = 0
    for it in items:
        sid = it["source_document_id"]
        if not sid:
            report.findings.append(
                ValidationFinding(
                    requirement_id=str(it.get("requirement_ids") or "-"),
                    field_name="source_traceability",
                    genai_value="(none)",
                    python_value="source_document_id required",
                    result="Unsupported",
                    validation_status="Source Support Missing",
                    detail=f"{it['kind']} has no source: {it.get('title')}",
                )
            )
            report.hallucinations.append(f"{it['kind']}: {it.get('title')} (no source)")
        elif active_document_ids and sid not in active_document_ids:
            report.findings.append(
                ValidationFinding(
                    requirement_id=str(it.get("requirement_ids") or "-"),
                    field_name="source_validity",
                    genai_value=sid,
                    python_value="active document required",
                    result="Mismatch",
                    validation_status="Outdated Source",
                    detail=f"{it['kind']} cites unknown/inactive doc {sid}",
                )
            )
            report.unsupported_requirements.append(str(it.get("requirement_ids") or it.get("title")))
        else:
            valid_items += 1
    report.traceable_items = valid_items
    report.total_generated_items = max(1, len(items))

    # 3) Unsupported generated requirements (items claiming req ids not in matrix)
    matrix_ids = {
        (r.get("requirement_id") or r.get("id"))
        for r in ground_truth_requirements
    }
    for it in items:
        for rid in it["requirement_ids"]:
            if rid and matrix_ids and rid not in matrix_ids:
                report.unsupported_requirements.append(rid)
                report.findings.append(
                    ValidationFinding(
                        requirement_id=rid,
                        field_name="requirement_id",
                        genai_value=rid,
                        python_value="Not in Role Requirement Matrix",
                        result="Unsupported",
                        validation_status="Unsupported Requirement",
                        detail=f"Generated req id not in matrix: {rid}",
                    )
                )

    # 4) Role relevance
    for it in items:
        if it.get("role") and role and _norm(it["role"]) != _norm(role):
            report.findings.append(
                ValidationFinding(
                    requirement_id=str(it.get("requirement_ids") or "-"),
                    field_name="role_relevance",
                    genai_value=it["role"],
                    python_value=role,
                    result="Mismatch",
                    validation_status="Manual Review Required",
                    detail=f"Role mismatch on {it['kind']}: {it.get('title')}",
                )
            )

    # 5) Duplicate detection
    seen_titles: dict[str, str] = {}
    for it in items:
        key = _norm(it.get("title") or "")
        if not key:
            continue
        if key in seen_titles:
            dup = f"{it['kind']}: {it.get('title')}"
            report.duplicates.append(dup)
            report.findings.append(
                ValidationFinding(
                    requirement_id="-",
                    field_name="duplicate",
                    genai_value=it.get("title") or "",
                    python_value="unique content required",
                    result="Mismatch",
                    validation_status="Duplicate Detected",
                    detail=dup,
                )
            )
        else:
            seen_titles[key] = it["kind"]

    # 6) Sequence validation: Day-1 items should not be advanced-only; assessments after learning modules
    stages_order = ["Day 1", "Week 1", "Week 2", "First 30 Days", "First 60 Days", "First 90 Days"]
    modules = plan.get("modules") or []
    assessment_before_learning = False
    for i, m in enumerate(modules):
        has_assessment = bool(m.get("assessment_topic") or m.get("assessments"))
        has_tasks = bool(m.get("tasks"))
        if has_assessment and not has_tasks and i == 0:
            assessment_before_learning = True
        stage = m.get("due_stage") or ""
        if stage and stage not in stages_order:
            report.sequence_issues.append(f"Module {m.get('module_id')} invalid stage: {stage}")
        # advanced content on Day 1
        if stage == "Day 1" and str(m.get("difficulty", "")).lower() == "advanced":
            report.sequence_issues.append(f"Module {m.get('module_id')} advanced content scheduled Day 1")
        # prerequisites: if module has prerequisites, they should appear earlier
        prereqs = set(m.get("prerequisites") or [])
        titles_so_far = {_norm(x.get("module_title")) for x in modules[:i]}
        titles_so_far |= {_norm(x.get("module_id")) for x in modules[:i]}
        for p in prereqs:
            if _norm(p) not in titles_so_far and p not in titles_so_far:
                report.sequence_issues.append(
                    f"Module {m.get('module_id')} prerequisite missing/out of order: {p}"
                )

    if assessment_before_learning:
        report.sequence_issues.append("Assessment scheduled before learning content")

    for issue in report.sequence_issues:
        report.findings.append(
            ValidationFinding(
                requirement_id="-",
                field_name="learning_sequence",
                genai_value=issue,
                python_value="valid sequence required",
                result="Mismatch",
                validation_status="Sequence Error",
                detail=issue,
            )
        )

    # 7) Contradictions via contradiction_checks module
    from contradiction_checks.detector import detect_contradictions

    for c in detect_contradictions(plan, ground_truth_requirements, applicable):
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

    # Scores
    report.coverage_score = round(
        (report.mandatory_covered / report.mandatory_total * 100) if report.mandatory_total else 100.0, 2
    )
    report.traceability_score = round((valid_items / report.total_generated_items) * 100, 2)

    # Requirement consistency: matched findings / total requirement findings
    req_findings = [f for f in report.findings if f.field_name in ("mandatory_coverage", "optional_coverage", "requirement_id")]
    if req_findings:
        matches = sum(1 for f in req_findings if f.result == "Match")
        report.consistency_score = round(matches / len(req_findings) * 100, 2)
    else:
        report.consistency_score = 100.0

    # Final verification status (SRS Step 47)
    if report.contradictions:
        report.verification_status = "Contradiction Detected"
    elif report.missing_requirements:
        report.verification_status = "Incomplete" if report.coverage_score < 100 else "Partially Verified"
    elif report.unsupported_requirements or report.hallucinations:
        report.verification_status = "Unsupported"
    elif report.duplicates or report.sequence_issues:
        report.verification_status = "Verified with Warning"
    elif report.coverage_score >= 100 and report.traceability_score >= 100:
        report.verification_status = "Verified"
    elif report.coverage_score >= 100 and report.traceability_score >= 90:
        report.verification_status = "Verified with Warning"
    else:
        report.verification_status = "Manual Review Required"

    # Map Incomplete to allowed label for DB check constraint if needed
    if report.verification_status == "Incomplete":
        report.verification_status = "Partially Verified"

    return report
