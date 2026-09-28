import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from database.supabase_client import get_supabase
from reporting.pdf import build_pdf
from reporting.tabular import REPORT_TITLES, build_report
from python_validation.validation_context import build_context
from routers.plans import (
    PLAN_LIST_SELECT,
    _alignment_scores,
    _assert_plan_access,
    _fetch_plan_row,
    _flatten_plan_row,
    _match_score,
    _normalize_plan,
    _normalize_reqs,
    _score_finding,
    review_plan,
)
from schemas.models import ReviewDecision
from security.auth import get_current_user, require_admin
from security.tenancy import filter_documents, filter_employees, is_master, owner_key, owns_employee

router = APIRouter(tags=["validation", "reviews", "reports", "dashboard"])


@router.get("/validation/{plan_id}")
def get_validation(plan_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    row = _fetch_plan_row(sb, plan_id)
    _assert_plan_access(user, row)
    flat = _flatten_plan_row(row)
    payload = _normalize_plan(row.get("payload") or {})
    validation = payload.get("validation") or {}
    findings = validation.get("findings") or []

    # Recompute genuine per-finding scores (content alignment for coverage, similarity for mismatches).
    try:
        role = row.get("role") or payload.get("role") or ""
        reqs = _normalize_reqs(list(build_context(role, sb=sb).all_requirements))
        alignment = _alignment_scores(payload.get("modules") or [], reqs)
        findings = [
            {
                **f,
                "match_score": _score_finding(
                    f.get("field_name", ""), f.get("requirement_id"),
                    f.get("genai_value"), f.get("python_value"), f.get("result") or "", alignment,
                ),
            }
            for f in findings
        ]
    except Exception:
        findings = [
            {
                **f,
                "match_score": _match_score(f.get("genai_value"), f.get("python_value"), f.get("result") or ""),
            }
            for f in findings
        ]

    return {
        "plan": flat,
        "findings": findings,
        "summary": validation.get("summary") or {},
        "missing": validation.get("missing") or [],
        "contradictions": validation.get("contradictions") or [],
    }


@router.get("/reviews/queue")
def review_queue(status: str = "Pending Review", user: dict = Depends(require_admin)):
    rows = get_supabase().table("plans").select(PLAN_LIST_SELECT).order("id", desc=True).execute().data or []
    rows = [r for r in rows if owns_employee(user, r.get("employee_id"))]
    mapped = [_flatten_plan_row(r) for r in rows]
    if status in ("Pending", "Pending Review"):
        return [p for p in mapped if p.get("status") in ("Pending Review", "Draft", "Edited")]
    if status and status.lower() != "all":
        return [p for p in mapped if p.get("status") == status]
    return mapped


@router.post("/reviews/decide")
def decide(payload: ReviewDecision, user: dict = Depends(require_admin)):
    return review_plan(payload, user)


def _to_xlsx(title: str, headers: list[str], rows: list[list]) -> bytes:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = (title or "Report")[:31] or "Report"
    ws.append(headers)
    for row in rows:
        ws.append(["" if c is None else c for c in row])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@router.get("/reports/types")
def report_types(user: dict = Depends(require_admin)):
    return [{"key": key, "title": title} for key, title in REPORT_TITLES.items()]


@router.get("/reports/export")
def export_report(
    format: str = "csv",
    report: str = "employee_progress",
    user: dict = Depends(require_admin),
):
    """Export a report type in CSV, Excel (xlsx), PDF, or JSON."""
    title, headers, rows = build_report(report, user)
    fmt = (format or "csv").lower()
    base = f"skillsprint_{report}"

    if fmt in ("xlsx", "excel"):
        data = _to_xlsx(title, headers, rows)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        return StreamingResponse(
            iter([data]),
            media_type=media,
            headers={"Content-Disposition": f"attachment; filename={base}.xlsx"},
        )

    if fmt == "pdf":
        data = build_pdf(title, headers, rows)
        return StreamingResponse(
            iter([data]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={base}.pdf"},
        )

    if fmt == "json":
        payload = {
            "report": report,
            "title": title,
            "headers": headers,
            "rows": [dict(zip(headers, r)) for r in rows],
        }
        return StreamingResponse(
            iter([json.dumps(payload, default=str)]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={base}.json"},
        )

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    w.writerows(rows)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={base}.csv"},
    )


@router.get("/reports/compare")
def compare_plans(
    group_by: str = "role",
    role: str | None = None,
    department: str | None = None,
    experience_level: str | None = None,
    document_version: str | None = None,
    user: dict = Depends(require_admin),
):
    """Compare onboarding plans across roles, departments, employee levels, or document versions."""
    sb = get_supabase()
    select = (
        "id,employee_id,role,status,payload->employee_name,payload->department,"
        "payload->experience_level,payload->progress,payload->validation->summary,"
        "payload->source_document_versions"
    )
    rows = sb.table("plans").select(select).order("id", desc=True).execute().data or []
    rows = [r for r in rows if owns_employee(user, r.get("employee_id"))]

    def match(p: dict) -> bool:
        if role and (p.get("role") or "") != role:
            return False
        if department and (p.get("department") or "") != department:
            return False
        if experience_level and (p.get("experience_level") or "") != experience_level:
            return False
        if document_version:
            versions = p.get("source_document_versions") or {}
            values = versions.values() if isinstance(versions, dict) else versions
            if str(document_version) not in {str(v) for v in values}:
                return False
        return True

    filtered = [p for p in rows if match(p)]

    def flatten(p: dict) -> dict:
        s = p.get("summary") or {}
        return {
            "id": p.get("id"),
            "employee_name": p.get("employee_name") or "",
            "role": p.get("role") or "",
            "department": p.get("department") or "",
            "experience_level": p.get("experience_level") or "",
            "progress": p.get("progress") or 0,
            "coverage_score": s.get("coverage_score") or 0,
            "traceability_score": s.get("traceability_score") or 0,
            "verification_status": s.get("verification_status") or "",
            "source_document_versions": p.get("source_document_versions") or {},
        }

    plans = [flatten(p) for p in filtered]
    key_fn = {
        "role": lambda p: p["role"] or "Unassigned",
        "department": lambda p: p["department"] or "Unassigned",
        "experience_level": lambda p: p["experience_level"] or "Unspecified",
        "document_version": lambda p: ", ".join(
            sorted({str(v) for v in (p["source_document_versions"].values()
                                     if isinstance(p["source_document_versions"], dict)
                                     else p["source_document_versions"])})
        ) or "n/a",
    }.get(group_by, lambda p: p["role"] or "Unassigned")

    groups: dict[str, dict] = {}
    for p in plans:
        key = key_fn(p)
        g = groups.setdefault(key, {"key": key, "plans": 0, "progress": [], "coverage": [], "traceability": [], "verified": 0})
        g["plans"] += 1
        g["progress"].append(p["progress"])
        g["coverage"].append(p["coverage_score"])
        g["traceability"].append(p["traceability_score"])
        if p["verification_status"] in ("Verified", "Verified with Warning"):
            g["verified"] += 1

    out_groups = []
    for g in sorted(groups.values(), key=lambda x: x["key"]):
        n = g["plans"] or 1
        out_groups.append({
            "key": g["key"],
            "plans": g["plans"],
            "avg_progress": round(sum(g["progress"]) / n),
            "avg_coverage": round(sum(g["coverage"]) / n, 1),
            "avg_traceability": round(sum(g["traceability"]) / n, 1),
            "verified_plans": g["verified"],
        })

    return {
        "group_by": group_by,
        "filters": {
            "role": role,
            "department": department,
            "experience_level": experience_level,
            "document_version": document_version,
        },
        "total_plans": len(plans),
        "groups": out_groups,
        "plans": plans,
    }


@router.get("/reports/generation-log")
def generation_log(limit: int = 50, user: dict = Depends(require_admin)):
    """Model & prompt logging: model, provider, prompt version, retries and audit events per plan."""
    sb = get_supabase()
    select = (
        "id,employee_id,role,status,prompt_version,model,created_at,"
        "payload->employee_name,payload->generation,payload->audit,payload->validation->summary"
    )
    rows = sb.table("plans").select(select).order("id", desc=True).limit(limit).execute().data or []
    rows = [r for r in rows if owns_employee(user, r.get("employee_id"))]

    entries = []
    for r in rows:
        gen = r.get("generation") or {}
        entries.append({
            "plan_id": str(r.get("id")),
            "employee_name": r.get("employee_name") or "",
            "role": r.get("role"),
            "status": r.get("status"),
            "model": r.get("model") or gen.get("model"),
            "provider": gen.get("provider"),
            "prompt_version": r.get("prompt_version") or gen.get("prompt_version"),
            "template_name": gen.get("template_name"),
            "generated_at": gen.get("generated_at") or r.get("created_at"),
            "retries": gen.get("retries"),
            "retry_log": gen.get("retry_log") or [],
            "verification_status": (r.get("summary") or {}).get("verification_status"),
            "audit_events": len(r.get("audit") or []),
        })
    return {"count": len(entries), "entries": entries}


@router.get("/dashboard/admin")
def admin_dashboard(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    docs = filter_documents(user, sb.table("documents").select("id,is_active,is_quarantined,document_id").execute().data or [])
    reqs = sb.table("role_requirements").select("id,mandatory,role,source_document_id").execute().data or []
    from security.tenancy import is_master

    if not is_master(user):
        accessible = {d.get("document_id") for d in docs}
        reqs = [r for r in reqs if r.get("source_document_id") in accessible]
    plan_rows = sb.table("plans").select(PLAN_LIST_SELECT).execute().data or []
    plan_rows = [r for r in plan_rows if owns_employee(user, r.get("employee_id"))]
    plans = [_flatten_plan_row(r) for r in plan_rows]
    employees = filter_employees(user, sb.table("employees").select("id,employee_id").execute().data or [])
    roles = {r.get("role") for r in reqs if r.get("role")} | {p.get("role_title") for p in plans if p.get("role_title")}

    pending = sum(1 for p in plans if p.get("status") in ("Pending Review", "Draft", "Edited"))
    flagged = sum(
        1
        for p in plans
        if (p.get("verification_status") or "") not in ("Verified", "Verified with Warning", "")
    )
    approved_docs = sum(1 for d in docs if d.get("is_active") and not d.get("is_quarantined"))

    plans_by_status: dict[str, int] = {}
    for p in plans:
        k = p.get("status") or "unknown"
        plans_by_status[k] = plans_by_status.get(k, 0) + 1

    coverages = [(p.get("coverage_score") or 0) for p in plans]
    return {
        "total_documents": len(docs),
        "approved_documents": approved_docs,
        "total_roles": len(roles),
        "total_plans": len(plans),
        "total_requirements": len(reqs),
        "mandatory_requirements": sum(1 for r in reqs if r.get("mandatory")),
        "pending_reviews": pending,
        "flagged_items": flagged,
        "total_employees": len(employees),
        "avg_coverage": round(sum(coverages) / len(coverages), 1) if coverages else 0,
        "plans_by_status": plans_by_status,
    }


@router.get("/dashboard/roles")
def role_dashboard(user: dict = Depends(get_current_user)):
    """Role dashboard: onboarding requirements + completion statistics grouped by job role."""
    sb = get_supabase()
    plan_rows = sb.table("plans").select(PLAN_LIST_SELECT).execute().data or []
    plans = [_flatten_plan_row(r) for r in plan_rows if owns_employee(user, r.get("employee_id"))]
    reqs = sb.table("role_requirements").select("role,mandatory,source_document_id").execute().data or []
    if not is_master(user):
        accessible = {d.get("document_id") for d in filter_documents(
            user, sb.table("documents").select("document_id").execute().data or []
        )}
        reqs = [r for r in reqs if r.get("source_document_id") in accessible]

    def bucket(role: str) -> dict:
        return by_role.setdefault(role, {
            "role": role, "requirements": 0, "mandatory_requirements": 0, "plans": 0,
            "employees": set(), "progress_sum": 0, "coverage_sum": 0, "verified_plans": 0, "behind_plans": 0,
        })

    by_role: dict[str, dict] = {}
    for r in reqs:
        b = bucket(r.get("role") or "General")
        b["requirements"] += 1
        if r.get("mandatory"):
            b["mandatory_requirements"] += 1
    for p in plans:
        b = bucket(p.get("role_title") or "General")
        b["plans"] += 1
        if p.get("employee_id"):
            b["employees"].add(str(p["employee_id"]))
        b["progress_sum"] += p.get("progress") or 0
        b["coverage_sum"] += p.get("coverage_score") or 0
        if p.get("verification_status") in ("Verified", "Verified with Warning"):
            b["verified_plans"] += 1
        if (p.get("progress") or 0) < 30:
            b["behind_plans"] += 1

    out = []
    for role, b in sorted(by_role.items()):
        n = b["plans"] or 1
        out.append({
            "role": role,
            "requirements": b["requirements"],
            "mandatory_requirements": b["mandatory_requirements"],
            "plans": b["plans"],
            "employees": len(b["employees"]),
            "avg_progress": round(b["progress_sum"] / n),
            "avg_coverage": round(b["coverage_sum"] / n, 1),
            "verified_plans": b["verified_plans"],
            "behind_plans": b["behind_plans"],
        })
    return out


@router.get("/dashboard/learner/{plan_id}")
def learner_dashboard(plan_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    row = _fetch_plan_row(sb, plan_id)
    flat = _flatten_plan_row(row)
    payload = _normalize_plan(row.get("payload") or {})
    modules = payload.get("modules") or []
    tasks = [t for m in modules for t in (m.get("tasks") or [])]
    quizzes = [q for m in modules for q in (m.get("quiz") or [])]
    done = sum(1 for t in tasks if isinstance(t, dict) and t.get("completed"))
    progress = flat.get("progress") or (round(done / len(tasks) * 100) if tasks else 0)

    out_modules = []
    for i, m in enumerate(modules, 1):
        out_modules.append(
            {
                "id": m.get("id") or m.get("module_id") or f"M{i:03d}",
                "title": m.get("module_title") or m.get("title") or f"Module {i}",
                "description": m.get("description") or m.get("purpose") or "",
                "due_stage": m.get("due_stage") or "Week 1",
                "status": m.get("status") or "Not Started",
                "estimated_hours": m.get("estimated_hours") or 1,
                "tasks": m.get("tasks") or [],
            }
        )

    # Checklist + assessment + quiz performance for progress tracking.
    checklists = [c for m in modules for c in (m.get("checklist") or []) if isinstance(c, dict)]
    checklist_done = sum(1 for c in checklists if c.get("completed"))
    quiz_scores = payload.get("quiz_scores") or {}
    assessment_scores = payload.get("assessment_scores") or {}
    quiz_average = round(sum(quiz_scores.values()) / len(quiz_scores), 1) if quiz_scores else 0.0
    assessment_average = round(sum(assessment_scores.values()) / len(assessment_scores), 1) if assessment_scores else 0.0

    # Weak-area identification from quiz/assessment performance and incomplete tasks.
    weak_areas: list[str] = []
    for m in modules:
        title = m.get("module_title") or m.get("title") or "Module"
        for q in (m.get("quiz") or []):
            if not isinstance(q, dict):
                continue
            score = quiz_scores.get(str(q.get("id")))
            if score is not None and score < 70 and title not in weak_areas:
                weak_areas.append(title)
        for a in (m.get("assessments") or []):
            if not isinstance(a, dict):
                continue
            key = str(a.get("id") or a.get("title"))
            score = assessment_scores.get(key)
            if score is not None and score < 70 and title not in weak_areas:
                weak_areas.append(title)
        m_tasks = [t for t in (m.get("tasks") or []) if isinstance(t, dict)]
        if m.get("mandatory") and any(not t.get("completed") for t in m_tasks) and title not in weak_areas:
            weak_areas.append(title)

    # Adaptive recommendations (typed) based on performance.
    recommendations: list[dict] = []
    for area in weak_areas[:4]:
        recommendations.append(
            {
                "type": "Revision module",
                "area": area,
                "reason": "Low quiz/assessment score or incomplete mandatory content",
                "activity": f"Revise '{area}'",
            }
        )
    if quizzes and not quiz_scores:
        recommendations.append(
            {
                "type": "Additional quiz",
                "area": "Assessment",
                "reason": "No quiz attempts recorded",
                "activity": "Attempt the generated quizzes",
            }
        )
    if any(m.get("mandatory") and any(not t.get("completed") for t in (m.get("tasks") or []) if isinstance(t, dict)) for m in modules):
        recommendations.append(
            {
                "type": "Additional task",
                "area": "Mandatory tasks",
                "reason": "Mandatory tasks incomplete",
                "activity": "Complete remaining mandatory tasks",
            }
        )
    if progress >= 80:
        recommendations.append(
            {
                "type": "Advanced module",
                "area": "Stretch learning",
                "reason": "Strong progress",
                "activity": "Assign an advanced module for the role",
            }
        )
    if progress < 30:
        recommendations.append(
            {
                "type": "Manager review",
                "area": "Overall onboarding",
                "reason": "Low overall completion progress",
                "activity": "Schedule a manager check-in",
            }
        )

    mandatory_incomplete = any(
        m.get("mandatory") and any(not t.get("completed") for t in (m.get("tasks") or []) if isinstance(t, dict))
        for m in modules
    )
    if progress >= 100:
        progress_status = "Completed"
    elif quizzes and not quiz_scores:
        progress_status = "Assessment Required"
    elif progress < 30:
        progress_status = "Behind Schedule"
    elif mandatory_incomplete:
        progress_status = "Requires Attention"
    else:
        progress_status = "On Track"

    # Milestones by stage + upcoming activities + quiz scores.
    stage_order = ["Day 1", "Week 1", "Week 2", "First 30 Days", "First 60 Days", "First 90 Days"]
    by_stage: dict[str, dict] = {}
    for m in modules:
        stage = m.get("due_stage") or "Week 1"
        bucket = by_stage.setdefault(stage, {"total": 0, "completed": 0})
        for t in (m.get("tasks") or []):
            if isinstance(t, dict):
                bucket["total"] += 1
                if t.get("completed"):
                    bucket["completed"] += 1
    milestones = []
    for stage in stage_order:
        if stage not in by_stage:
            continue
        bucket = by_stage[stage]
        total = bucket["total"] or 0
        completed = bucket["completed"] or 0
        if total == 0:
            status = "Not Started"
        elif completed >= total:
            status = "Completed"
        elif completed > 0:
            status = "In Progress"
        else:
            status = "Pending"
        milestones.append({"stage": stage, "tasks_total": total, "tasks_completed": completed, "status": status})

    upcoming = []
    for stage in stage_order:
        for m in modules:
            if (m.get("due_stage") or "Week 1") != stage:
                continue
            for t in (m.get("tasks") or []):
                if isinstance(t, dict) and not t.get("completed"):
                    upcoming.append(
                        {
                            "task_id": t.get("id"),
                            "title": t.get("title"),
                            "module_id": m.get("module_id") or m.get("id"),
                            "due_stage": stage,
                            "estimated_minutes": t.get("estimated_minutes") or 30,
                        }
                    )
        if len(upcoming) >= 6:
            break

    quiz_scores_list = [{"quiz_id": k, "score": v} for k, v in quiz_scores.items()]
    assessment_scores_list = [{"assessment_id": k, "score": v} for k, v in assessment_scores.items()]

    return {
        "plan": flat,
        "modules": out_modules,
        "tasks_total": len(tasks),
        "tasks_completed": done,
        "checklists_total": len(checklists),
        "checklists_completed": checklist_done,
        "quizzes_total": len(quizzes),
        "progress": progress,
        "progress_status": progress_status,
        "current_stage": next((m["stage"] for m in milestones if m["status"] in ("In Progress", "Pending", "Not Started")), milestones[-1]["stage"] if milestones else "Day 1"),
        "milestones": milestones,
        "upcoming_activities": upcoming[:6],
        "quiz_scores": quiz_scores_list,
        "quiz_average": quiz_average,
        "assessment_scores": assessment_scores_list,
        "assessment_average": assessment_average,
        "completed_modules": sum(
            1
            for m in modules
            if (m.get("tasks") or []) and all(isinstance(t, dict) and t.get("completed") for t in m.get("tasks"))
        ),
        "recommendations": recommendations[:8],
        "adaptive_recommendations": recommendations[:8],
        "weak_areas": weak_areas[:8],
        "plan_recommendations": payload.get("progress_recommendations") or [],
    }

@router.get("/dashboard/manager")
def manager_dashboard(user: dict = Depends(get_current_user)):
    """Manager view: all learning-manager accounts and every employee's plan/progress for the company."""
    sb = get_supabase()

    # Company key comes from the manager's own employee tag (e.g. U25-OWNER) or their owner key.
    emp = str(user.get("employee_id") or "")
    company = emp.split("-", 1)[0] if "-" in emp else (owner_key(user) or "")
    master = is_master(user)

    employees = sb.table("employees").select(
        "employee_id,name,role,department,training_status,manager"
    ).order("employee_id").execute().data or []

    is_training_manager = str(user.get("role") or "") == "training_manager"
    if is_training_manager:
        # A training manager only sees the employees assigned under them (their team).
        identifiers = {
            str(user.get("email") or "").lower(),
            str(user.get("full_name") or "").lower(),
        }
        identifiers.discard("")
        employees = [
            e for e in employees
            if str(e.get("manager") or "").strip().lower() in identifiers
        ]
    elif not master:
        employees = [
            e for e in employees
            if company and str(e.get("employee_id") or "").startswith(f"{company}-")
        ]

    plan_rows = sb.table("plans").select(PLAN_LIST_SELECT).order("id", desc=True).execute().data or []
    plans = [_flatten_plan_row(r) for r in plan_rows]
    company_emp_ids = {str(e.get("employee_id")) for e in employees}
    if is_training_manager or not master:
        plans = [p for p in plans if str(p.get("employee_id")) in company_emp_ids]
    plan_by_emp = {str(p.get("employee_id")): p for p in plans if p.get("employee_id")}

    employees_out = []
    for e in employees:
        p = plan_by_emp.get(str(e.get("employee_id"))) or {}
        employees_out.append({
            "employee_id": e.get("employee_id"),
            "name": e.get("name"),
            "role": e.get("role"),
            "department": e.get("department"),
            "manager": e.get("manager"),
            "training_status": e.get("training_status"),
            "progress": p.get("progress") or 0,
            "plan_id": p.get("id"),
            "status": p.get("status"),
            "verification_status": p.get("verification_status"),
        })

    users = sb.table("users").select(
        "id,email,display_name,role,employee_id,is_active"
    ).order("id").execute().data or []
    if is_training_manager:
        team = [
            {
                "id": u.get("id"),
                "email": u.get("email"),
                "full_name": u.get("display_name") or u.get("email"),
                "role": u.get("role"),
                "is_active": u.get("is_active", True),
            }
            for u in users
            if str(u.get("employee_id")) in company_emp_ids
        ]
    else:
        team = [
            {
                "id": u.get("id"),
                "email": u.get("email"),
                "full_name": u.get("display_name") or u.get("email"),
                "role": u.get("role"),
                "is_active": u.get("is_active", True),
            }
            for u in users
            if (master or (company and str(u.get("employee_id") or "").startswith(f"{company}-")))
        ]

    progress_values = [e["progress"] for e in employees_out]
    return {
        "company": company or ("ALL" if master else ""),
        "totals": {
            "employees": len(employees_out),
            "plans": sum(1 for e in employees_out if e["plan_id"]),
            "learning_managers": sum(1 for t in team if t["role"] == "training_manager"),
            "managers": sum(1 for t in team if t["role"] == "manager"),
            "on_track": sum(1 for e in employees_out if e["progress"] >= 70),
            "behind": sum(1 for e in employees_out if e["progress"] < 30),
            "avg_progress": round(sum(progress_values) / len(progress_values)) if progress_values else 0,
        },
        "employees": employees_out,
        "team": team,
    }
