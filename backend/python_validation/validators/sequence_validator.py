"""Learning sequence + prerequisite validation (SRS §17/§18)."""
from __future__ import annotations

STAGE_ORDER = ["Day 1", "Week 1", "Week 2", "First 30 Days", "First 60 Days", "First 90 Days"]


def _norm(value: object) -> str:
    return str(value or "").strip().lower()


def validate_sequence(plan: dict) -> tuple[list[str], list[dict]]:
    issues: list[str] = []
    modules = plan.get("modules") or []
    assessment_before_learning = False

    for i, module in enumerate(modules):
        has_assessment = bool(module.get("assessment_topic") or module.get("assessments"))
        has_tasks = bool(module.get("tasks"))
        if has_assessment and not has_tasks and i == 0:
            assessment_before_learning = True
        stage = module.get("due_stage") or ""
        if stage and stage not in STAGE_ORDER:
            issues.append(f"Module {module.get('module_id')} invalid stage: {stage}")
        if stage == "Day 1" and str(module.get("difficulty", "")).lower() == "advanced":
            issues.append(f"Module {module.get('module_id')} advanced content scheduled Day 1")

        prerequisites = set(module.get("prerequisites") or [])
        titles_so_far = {_norm(x.get("module_title")) for x in modules[:i]}
        titles_so_far |= {_norm(x.get("module_id")) for x in modules[:i]}
        for prereq in prerequisites:
            if _norm(prereq) not in titles_so_far and prereq not in titles_so_far:
                issues.append(f"Module {module.get('module_id')} prerequisite missing/out of order: {prereq}")

    if assessment_before_learning:
        issues.append("Assessment scheduled before learning content")

    findings = [
        {
            "requirement_id": "-",
            "field_name": "learning_sequence",
            "genai_value": issue,
            "python_value": "valid sequence required",
            "result": "Mismatch",
            "validation_status": "Sequence Error",
            "detail": issue,
        }
        for issue in issues
    ]
    return issues, findings
