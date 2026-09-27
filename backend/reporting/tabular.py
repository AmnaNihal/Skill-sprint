"""Build tabular report data for each SRS report type.

Every report returns ``(title, headers, rows)`` where ``rows`` is a list of lists.
Data is loaded with lightweight JSON projections so large plan payloads are not
fetched wholesale (Supabase statement timeouts).
"""
from __future__ import annotations

from typing import Any

from database.supabase_client import get_supabase
from security.tenancy import can_view_employee_data, filter_documents, is_master

PLAN_REPORT_SELECT = (
    "id,employee_id,role,status,created_at,"
    "payload->employee_name,payload->department,payload->target_completion,payload->progress,"
    "payload->validation->summary,payload->validation->findings,payload->validation->contradictions,"
    "payload->validation->duplicates,payload->validation->hallucinations,"
    "payload->quiz_scores,payload->assessment_scores,payload->source_document_versions"
)

REPORT_TITLES = {
    "employee_progress": "Employee Progress Report",
    "role_coverage": "Role Coverage Report",
    "mandatory_training": "Mandatory Training Report",
    "assessment_results": "Assessment Results Report",
    "source_traceability": "Source Traceability Report",
    "hallucination_flags": "Hallucination Flags Report",
    "policy_coverage": "Policy Coverage Report",
    "comparison": "GenAI vs Python Comparison Report",
}


def _summary(row: dict) -> dict:
    return row.get("summary") or {}


def _progress(row: dict) -> Any:
    return row.get("progress")


def _load_plans(sb, user: dict, with_modules: bool = False) -> list[dict]:
    select = PLAN_REPORT_SELECT + (",payload->modules" if with_modules else "")
    rows = sb.table("plans").select(select).order("id", desc=True).execute().data or []
    return [r for r in rows if can_view_employee_data(user, r.get("employee_id"))]


def _load_requirements(sb, user: dict) -> list[dict]:
    reqs = sb.table("role_requirements").select(
        "role,mandatory,priority,source_document_id,competency,approval_status"
    ).execute().data or []
    if not is_master(user):
        accessible = {d.get("document_id") for d in filter_documents(
            user, sb.table("documents").select("document_id").execute().data or []
        )}
        reqs = [r for r in reqs if r.get("source_document_id") in accessible]
    return reqs


def _avg(values: list[float]) -> float:
    vals = [v for v in values if isinstance(v, (int, float))]
    return round(sum(vals) / len(vals), 1) if vals else 0.0


def _employee_progress(plans: list[dict]) -> tuple[list[str], list[list[Any]]]:
    headers = ["Plan ID", "Employee", "Role", "Department", "Progress %", "Status", "Verification"]
    rows = [
        [
            p.get("id"),
            p.get("employee_name") or "",
            p.get("role") or "",
            p.get("department") or "",
            _progress(p) or 0,
            p.get("status") or "",
            _summary(p).get("verification_status") or "",
        ]
        for p in plans
    ]
    return headers, rows


def _role_coverage(plans: list[dict], reqs: list[dict]) -> tuple[list[str], list[list[Any]]]:
    by_role: dict[str, dict] = {}

    def bucket(role: str) -> dict:
        return by_role.setdefault(role, {
            "requirements": 0, "mandatory": 0, "plans": 0, "employees": set(),
            "progress": [], "coverage": [], "verified": 0, "behind": 0,
        })

    for r in reqs:
        b = bucket(r.get("role") or "General")
        b["requirements"] += 1
        if r.get("mandatory"):
            b["mandatory"] += 1
    for p in plans:
        b = bucket(p.get("role") or "General")
        b["plans"] += 1
        if p.get("employee_id"):
            b["employees"].add(str(p.get("employee_id")))
        b["progress"].append(_progress(p) or 0)
        b["coverage"].append(_summary(p).get("coverage_score") or 0)
        if _summary(p).get("verification_status") in ("Verified", "Verified with Warning"):
            b["verified"] += 1
        if (_progress(p) or 0) < 30:
            b["behind"] += 1

    headers = [
        "Role", "Requirements", "Mandatory", "Plans", "Employees",
        "Avg Progress %", "Avg Coverage %", "Verified Plans", "Behind Plans",
    ]
    rows = [
        [
            role, b["requirements"], b["mandatory"], b["plans"], len(b["employees"]),
            round(_avg(b["progress"])), _avg(b["coverage"]), b["verified"], b["behind"],
        ]
        for role, b in sorted(by_role.items())
    ]
    return headers, rows


def _mandatory_training(plans: list[dict]) -> tuple[list[str], list[list[Any]]]:
    headers = [
        "Plan ID", "Employee", "Role", "Mandatory Modules",
        "Mandatory Tasks", "Mandatory Completed", "Mandatory Incomplete",
    ]
    rows = []
    for p in plans:
        modules = p.get("modules") or []
        mandatory_modules = [m for m in modules if isinstance(m, dict) and m.get("mandatory")]
        mand_tasks = [t for m in mandatory_modules for t in (m.get("tasks") or []) if isinstance(t, dict)]
        done = sum(1 for t in mand_tasks if t.get("completed"))
        rows.append([
            p.get("id"), p.get("employee_name") or "", p.get("role") or "",
            len(mandatory_modules), len(mand_tasks), done, len(mand_tasks) - done,
        ])
    return headers, rows


def _assessment_results(plans: list[dict]) -> tuple[list[str], list[list[Any]]]:
    headers = ["Plan ID", "Employee", "Role", "Quizzes", "Quiz Avg", "Assessments", "Assessment Avg"]
    rows = []
    for p in plans:
        quizzes = p.get("quiz_scores") or {}
        assessments = p.get("assessment_scores") or {}
        rows.append([
            p.get("id"), p.get("employee_name") or "", p.get("role") or "",
            len(quizzes), _avg(list(quizzes.values())),
            len(assessments), _avg(list(assessments.values())),
        ])
    return headers, rows


def _source_traceability(plans: list[dict]) -> tuple[list[str], list[list[Any]]]:
    headers = ["Plan ID", "Employee", "Role", "Traceability %", "Coverage %", "Source Documents", "Versions"]
    rows = []
    for p in plans:
        versions = p.get("source_document_versions") or {}
        s = _summary(p)
        rows.append([
            p.get("id"), p.get("employee_name") or "", p.get("role") or "",
            s.get("traceability_score") or 0, s.get("coverage_score") or 0,
            len(versions) if isinstance(versions, dict) else 0,
            ", ".join(sorted({str(v) for v in (versions.values() if isinstance(versions, dict) else [])})),
        ])
    return headers, rows


def _hallucination_flags(plans: list[dict]) -> tuple[list[str], list[list[Any]]]:
    headers = ["Plan ID", "Employee", "Role", "Verification", "Hallucinations", "Unsupported", "Contradictions"]
    rows = []
    for p in plans:
        s = _summary(p)
        halls = p.get("hallucinations") or []
        unsupported = s.get("unsupported_count") or len(p.get("findings") or [])
        contradictions = p.get("contradictions") or []
        if not halls and not contradictions and s.get("verification_status") in ("Verified", ""):
            continue
        rows.append([
            p.get("id"), p.get("employee_name") or "", p.get("role") or "",
            s.get("verification_status") or "", len(halls), unsupported, len(contradictions),
        ])
    return headers, rows


def _policy_coverage(sb, user: dict) -> tuple[list[str], list[list[Any]]]:
    docs = filter_documents(
        user,
        sb.table("documents").select("document_id,title,version,is_active,category").execute().data or [],
    )
    reqs = sb.table("role_requirements").select("source_document_id,mandatory").execute().data or []
    counts: dict[str, dict] = {}
    for r in reqs:
        key = str(r.get("source_document_id"))
        c = counts.setdefault(key, {"total": 0, "mandatory": 0})
        c["total"] += 1
        if r.get("mandatory"):
            c["mandatory"] += 1
    headers = ["Document ID", "Title", "Version", "Active", "Requirements", "Mandatory"]
    rows = []
    for d in docs:
        c = counts.get(str(d.get("document_id")), {"total": 0, "mandatory": 0})
        rows.append([
            d.get("document_id"), d.get("title") or "", d.get("version") or "",
            "Yes" if d.get("is_active") else "No", c["total"], c["mandatory"],
        ])
    return headers, rows


def _comparison(plans: list[dict]) -> tuple[list[str], list[list[Any]]]:
    headers = [
        "Plan ID", "Employee", "Role", "Coverage %", "Traceability %", "Consistency %",
        "Verification", "Contradictions", "Duplicates",
    ]
    rows = []
    for p in plans:
        s = _summary(p)
        rows.append([
            p.get("id"), p.get("employee_name") or "", p.get("role") or "",
            s.get("coverage_score") or 0, s.get("traceability_score") or 0, s.get("consistency_score") or 0,
            s.get("verification_status") or "", len(p.get("contradictions") or []), len(p.get("duplicates") or []),
        ])
    return headers, rows


def build_report(report: str, user: dict) -> tuple[str, list[str], list[list[Any]]]:
    """Return ``(title, headers, rows)`` for the requested report type."""
    sb = get_supabase()
    report = report or "employee_progress"
    title = REPORT_TITLES.get(report, REPORT_TITLES["employee_progress"])

    if report == "role_coverage":
        plans = _load_plans(sb, user)
        headers, rows = _role_coverage(plans, _load_requirements(sb, user))
    elif report == "mandatory_training":
        plans = _load_plans(sb, user, with_modules=True)
        headers, rows = _mandatory_training(plans)
    elif report == "assessment_results":
        plans = _load_plans(sb, user)
        headers, rows = _assessment_results(plans)
    elif report == "source_traceability":
        plans = _load_plans(sb, user)
        headers, rows = _source_traceability(plans)
    elif report == "hallucination_flags":
        plans = _load_plans(sb, user)
        headers, rows = _hallucination_flags(plans)
    elif report == "policy_coverage":
        headers, rows = _policy_coverage(sb, user)
    elif report == "comparison":
        plans = _load_plans(sb, user)
        headers, rows = _comparison(plans)
    else:
        plans = _load_plans(sb, user)
        headers, rows = _employee_progress(plans)

    return title, headers, rows
