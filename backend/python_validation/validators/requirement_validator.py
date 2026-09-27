"""Requirement coverage / missing / unsupported validation (SRS §6/§7/§8/§10)."""
from __future__ import annotations


def plan_items(plan: dict) -> list[dict]:
    """Flatten plan modules/tasks/quizzes/checklists into comparable items with req ids + sources."""
    items: list[dict] = []
    for module in plan.get("modules", []):
        items.append(
            {
                "kind": "module",
                "id": module.get("module_id"),
                "title": module.get("module_title"),
                "requirement_ids": set(module.get("requirement_ids") or []),
                "source_document_id": module.get("source_document_id") or "",
                "source_section_id": module.get("source_section_id") or "",
                "mandatory": bool(module.get("mandatory")),
                "due_stage": module.get("due_stage") or "",
                "role": module.get("role") or plan.get("role") or "",
                "assessment_topic": module.get("assessment_topic") or "",
            }
        )
        for task in module.get("tasks") or []:
            if not isinstance(task, dict):
                continue
            items.append(
                {
                    "kind": "task",
                    "id": task.get("title"),
                    "title": task.get("title"),
                    "requirement_ids": {task.get("requirement_id")} if task.get("requirement_id") else set(),
                    "source_document_id": task.get("source_document_id") or "",
                    "source_section_id": task.get("source_section_id") or "",
                    "mandatory": bool(task.get("mandatory")),
                    "due_stage": task.get("due_stage") or "",
                    "role": plan.get("role") or "",
                    "assessment_topic": "",
                }
            )
        for quiz in module.get("quiz") or []:
            if not isinstance(quiz, dict):
                continue
            items.append(
                {
                    "kind": "quiz",
                    "id": quiz.get("question"),
                    "title": quiz.get("question"),
                    "requirement_ids": {quiz.get("requirement_id")} if quiz.get("requirement_id") else set(),
                    "source_document_id": quiz.get("source_document_id") or "",
                    "source_section_id": quiz.get("source_section_id") or "",
                    "mandatory": False,
                    "due_stage": "",
                    "role": plan.get("role") or "",
                    "assessment_topic": "",
                }
            )
        for checklist in module.get("checklist") or []:
            if not isinstance(checklist, dict):
                continue
            items.append(
                {
                    "kind": "checklist",
                    "id": checklist.get("activity"),
                    "title": checklist.get("activity"),
                    "requirement_ids": set(),
                    "source_document_id": checklist.get("source_document_id") or "",
                    "source_section_id": "",
                    "mandatory": bool(checklist.get("mandatory")),
                    "due_stage": checklist.get("due_stage") or "",
                    "role": plan.get("role") or "",
                    "assessment_topic": "",
                }
            )
    return items


def collect_covered_ids(items: list[dict]) -> tuple[set[str], set[str]]:
    covered: set[str] = set()
    sources: set[str] = set()
    for item in items:
        covered |= item["requirement_ids"]
        if item["source_document_id"]:
            sources.add(item["source_document_id"])
    return covered, sources


def evaluate_mandatory_coverage(mandatory_reqs: list[dict], covered_req_ids: set[str]) -> tuple[int, int, list[str], list[dict]]:
    covered = 0
    missing: list[str] = []
    findings: list[dict] = []
    for requirement in mandatory_reqs:
        rid = requirement.get("id") or requirement.get("requirement_id")
        if rid in covered_req_ids:
            covered += 1
            findings.append(
                {
                    "requirement_id": rid,
                    "field_name": "mandatory_coverage",
                    "genai_value": "Covered",
                    "python_value": "Required",
                    "result": "Match",
                    "validation_status": "Verified",
                    "detail": f"Mandatory requirement covered: {requirement.get('title', '')}",
                }
            )
        else:
            missing.append(rid)
            findings.append(
                {
                    "requirement_id": rid,
                    "field_name": "mandatory_coverage",
                    "genai_value": "Missing",
                    "python_value": "Required",
                    "result": "Missing",
                    "validation_status": "Requirement Missing",
                    "detail": f"Mandatory requirement not found in plan: {requirement.get('title', '')}",
                }
            )
    return len(mandatory_reqs), covered, missing, findings


def evaluate_optional_coverage(applicable: list[dict], covered_req_ids: set[str]) -> list[dict]:
    findings: list[dict] = []
    for requirement in applicable:
        if requirement.get("mandatory"):
            continue
        rid = requirement.get("id") or requirement.get("requirement_id")
        present = rid in covered_req_ids
        findings.append(
            {
                "requirement_id": rid,
                "field_name": "optional_coverage",
                "genai_value": "Covered" if present else "Not covered",
                "python_value": "Optional",
                "result": "Match",
                "validation_status": "Verified",
                "detail": "Optional requirement status recorded",
            }
        )
    return findings


def evaluate_unsupported(items: list[dict], matrix_ids: set[str]) -> tuple[list[str], list[dict]]:
    unsupported: list[str] = []
    findings: list[dict] = []
    for item in items:
        for rid in item["requirement_ids"]:
            if rid and matrix_ids and rid not in matrix_ids:
                unsupported.append(rid)
                findings.append(
                    {
                        "requirement_id": rid,
                        "field_name": "requirement_id",
                        "genai_value": rid,
                        "python_value": "Not in Role Requirement Matrix",
                        "result": "Unsupported",
                        "validation_status": "Unsupported Requirement",
                        "detail": f"Generated req id not in matrix: {rid}",
                    }
                )
    return unsupported, findings
