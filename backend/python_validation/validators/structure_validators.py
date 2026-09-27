"""Structural validators: checklist, task, assessment, quiz (SRS §§16-23).

These produce explainable findings and are recorded as evidence. They do not by themselves
grant or deny `Verified` — that decision belongs to status_engine (SRS §28 critical conditions).
"""
from __future__ import annotations

from typing import Any

STAGES = ["Day 1", "Week 1", "Week 2", "First 30 Days", "First 60 Days", "First 90 Days"]
DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"]


def _finding(req_id: str, field: str, genai: str, python: str, result: str, status: str, detail: str) -> dict:
    return {
        "requirement_id": req_id or "-",
        "field_name": field,
        "genai_value": str(genai),
        "python_value": str(python),
        "result": result,
        "validation_status": status,
        "detail": detail,
    }


def validate_checklists(plan: dict[str, Any]) -> list[dict]:
    findings: list[dict] = []
    for module in plan.get("modules") or []:
        mid = module.get("module_id") or module.get("id") or "?"
        for item in module.get("checklist") or []:
            if not isinstance(item, dict):
                continue
            activity = str(item.get("activity") or "").strip()
            if not activity:
                findings.append(_finding("-", "checklist_activity", "", "required", "Missing",
                                         "Manual Review Required", f"Module {mid}: checklist item has no activity"))
            stage = item.get("due_stage")
            if stage and stage not in STAGES:
                findings.append(_finding("-", "checklist_due_stage", stage, "valid stage required", "Mismatch",
                                         "Sequence Error", f"Module {mid}: invalid checklist due_stage '{stage}'"))
    return findings


def validate_tasks(plan: dict[str, Any], role: str = "") -> list[dict]:
    findings: list[dict] = []
    for module in plan.get("modules") or []:
        mid = module.get("module_id") or module.get("id") or "?"
        for task in module.get("tasks") or []:
            if not isinstance(task, dict):
                continue
            title = str(task.get("title") or "").strip()
            if not title:
                findings.append(_finding("-", "task_title", "", "required", "Missing",
                                         "Manual Review Required", f"Module {mid}: task has no title"))
            if not task.get("source_document_id"):
                findings.append(_finding(str(task.get("requirement_id") or "-"), "task_source", "(none)",
                                         "source_document_id required", "Unsupported", "Source Support Missing",
                                         f"Module {mid}: task '{title}' has no source document"))
            difficulty = task.get("difficulty")
            if difficulty and difficulty not in DIFFICULTIES:
                findings.append(_finding("-", "task_difficulty", difficulty, "valid difficulty required", "Mismatch",
                                         "Manual Review Required", f"Module {mid}: invalid task difficulty '{difficulty}'"))
    return findings


def validate_assessments(plan: dict[str, Any]) -> list[dict]:
    findings: list[dict] = []
    for module in plan.get("modules") or []:
        mid = module.get("module_id") or module.get("id") or "?"
        for assessment in module.get("assessments") or []:
            if not isinstance(assessment, dict):
                continue
            title = str(assessment.get("title") or "").strip()
            if not title:
                findings.append(_finding("-", "assessment_title", "", "required", "Missing",
                                         "Manual Review Required", f"Module {mid}: assessment has no title"))
            if not assessment.get("source_document_id"):
                findings.append(_finding("-", "assessment_source", "(none)", "source required", "Unsupported",
                                         "Source Support Missing", f"Module {mid}: assessment '{title}' has no source"))
            atype = str(assessment.get("assessment_type") or "").lower()
            if "practical" in atype and not (assessment.get("rubric") or []):
                findings.append(_finding("-", "assessment_rubric", "[]", "rubric required", "Missing",
                                         "Manual Review Required", f"Module {mid}: practical assessment '{title}' has no rubric"))
    return findings


def validate_quizzes(plan: dict[str, Any]) -> list[dict]:
    findings: list[dict] = []
    for module in plan.get("modules") or []:
        mid = module.get("module_id") or module.get("id") or "?"
        for quiz in module.get("quiz") or []:
            if not isinstance(quiz, dict):
                findings.append(_finding("-", "quiz_structure", str(quiz), "object required", "Mismatch",
                                         "Manual Review Required", f"Module {mid}: quiz entry is not an object"))
                continue
            question = str(quiz.get("question") or "").strip()
            if not question:
                findings.append(_finding("-", "quiz_question", "", "required", "Missing",
                                         "Manual Review Required", f"Module {mid}: quiz question missing"))
            if not quiz.get("source_document_id"):
                findings.append(_finding(str(quiz.get("requirement_id") or "-"), "quiz_source", "(none)",
                                         "source_document_id required", "Unsupported", "Source Support Missing",
                                         f"Module {mid}: quiz '{question[:40]}' has no source"))
            qtype = quiz.get("question_type") or "multiple_choice"
            options = quiz.get("options") or []
            if qtype in ("multiple_choice", "multiple_response", "scenario") and len(options) < 2:
                findings.append(_finding("-", "quiz_options", str(len(options)), ">=2 options", "Mismatch",
                                         "Manual Review Required", f"Module {mid}: quiz '{question[:40]}' needs >=2 options"))
            for idx in quiz.get("correct_answer") or []:
                if isinstance(idx, int) and (idx < 0 or idx >= len(options)):
                    findings.append(_finding("-", "quiz_answer", str(idx), "valid option index", "Mismatch",
                                             "Manual Review Required", f"Module {mid}: correct_answer index out of range"))
                    break
    return findings
