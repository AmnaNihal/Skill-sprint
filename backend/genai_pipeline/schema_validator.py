"""JSON schema validation for GenAI output (SRS Step 38)."""
from typing import Any

from schemas.models import GenOnboardingPlan, QuizQuestion, GenModule, GenTask

REQUIRED_TOP = ["role", "modules"]


def validate_genai_payload(data: dict[str, Any]) -> list[str]:
    """Return list of schema problems. Empty list = valid."""
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["Root must be an object"]

    for key in REQUIRED_TOP:
        if key not in data:
            errors.append(f"Missing field: {key}")

    try:
        plan = GenOnboardingPlan.model_validate(data)
    except Exception as e:
        return [f"Pydantic validation failed: {e}"]

    if not plan.modules:
        errors.append("modules array is empty")

    module_ids = [m.module_id for m in plan.modules]
    if len(module_ids) != len(set(module_ids)):
        errors.append("Duplicate module_id values")

    seen_task_ids: set[str] = set()
    for m in plan.modules:
        if not m.source_document_id:
            errors.append(f"Module {m.module_id}: missing source_document_id")
        if m.mandatory and not m.source_section_id:
            errors.append(f"Module {m.module_id}: mandatory module missing source_section_id")
        if m.role and plan.role and m.role != plan.role and m.role != "All Roles":
            errors.append(f"Module {m.module_id}: role mismatch ({m.role} != {plan.role})")

        for t in m.tasks:
            title = t if isinstance(t, str) else t.title
            source = "" if isinstance(t, str) else (t.source_document_id or "")
            key = f"{m.module_id}:{title}"
            if key in seen_task_ids:
                errors.append(f"Duplicate task title in {m.module_id}: {title}")
            seen_task_ids.add(key)
            if not source:
                errors.append(f"Task '{title}': missing source_document_id")

        for q in m.quiz:
            if not q.source_document_id:
                errors.append(f"Quiz '{q.question[:40]}': missing source_document_id")
            if q.question_type in ("multiple_choice", "multiple_response", "scenario"):
                if len(q.options) < 2:
                    errors.append(f"Quiz '{q.question[:40]}': needs >=2 options")
                for idx in q.correct_answer:
                    if isinstance(idx, int) and (idx < 0 or idx >= len(q.options)):
                        errors.append(f"Quiz '{q.question[:40]}': correct_answer index out of range")
            if q.question_type == "true_false" and not q.correct_answer:
                errors.append(f"Quiz '{q.question[:40]}': true_false needs correct_answer")

    if len(errors) > 50:
        errors = errors[:50] + ["... truncated"]
    return errors


def coerce_to_plan(data: dict[str, Any]) -> GenOnboardingPlan:
    return GenOnboardingPlan.model_validate(data)
