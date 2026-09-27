"""Policy impact analysis (SRS Steps 55-58): which content depends on a document.

Follows the dependency chain: document -> requirement -> module -> task/quiz -> plan/employee.
"""
from __future__ import annotations

from typing import Any

from database.supabase_client import get_supabase


def analyze_impact(document_id: str) -> dict[str, Any]:
    """Return every plan module, quiz, plan, and employee affected by a source document."""
    sb = get_supabase()
    # Load lightweight plan metadata, then fetch only the modules projection per plan to
    # avoid selecting the very large full payload for every plan at once.
    plan_meta = sb.table("plans").select("id,employee_id,role,status").execute().data or []

    affected_plans: list[dict[str, Any]] = []
    module_ids: list[str] = []
    employees: set[str] = set()
    task_count = 0
    quiz_count = 0

    for meta in plan_meta:
        rows = (
            sb.table("plans")
            .select("payload->modules")
            .eq("id", meta.get("id"))
            .limit(1)
            .execute()
            .data
            or []
        )
        modules = (rows[0].get("modules") if rows else []) or []
        hit_modules: list[str] = []
        hit_quizzes: list[str] = []
        for module in modules:
            if str(module.get("source_document_id")) != str(document_id):
                continue
            module_ref = module.get("module_id") or module.get("id") or "?"
            hit_modules.append(module_ref)
            task_count += len(module.get("tasks") or [])
            for index, _quiz in enumerate(module.get("quiz") or [], 1):
                hit_quizzes.append(f"{module_ref}-Q{index:02d}")
        if hit_modules:
            quiz_count += len(hit_quizzes)
            module_ids.extend(hit_modules)
            if meta.get("employee_id"):
                employees.add(str(meta.get("employee_id")))
            affected_plans.append(
                {
                    "plan_id": str(meta.get("id")),
                    "employee_id": meta.get("employee_id"),
                    "role": meta.get("role"),
                    "status": meta.get("status"),
                    "modules": hit_modules,
                    "quizzes": hit_quizzes,
                }
            )

    return {
        "document_id": document_id,
        "affected_plans": len(affected_plans),
        "affected_modules": len(module_ids),
        "affected_quizzes": quiz_count,
        "affected_tasks": task_count,
        "affected_employees": len(employees),
        "employees": sorted(employees),
        "module_ids": module_ids,
        "plans": affected_plans,
    }
