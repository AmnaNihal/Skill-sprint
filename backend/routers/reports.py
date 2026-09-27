import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from database.supabase_client import get_supabase
from routers.plans import PLAN_LIST_SELECT, _fetch_plan_row, _flatten_plan_row, _normalize_plan, review_plan
from schemas.models import ReviewDecision
from security.auth import get_current_user, require_admin
from security.tenancy import filter_documents, filter_employees, is_master, owns_employee

router = APIRouter(tags=["validation", "reviews", "reports", "dashboard"])


@router.get("/validation/{plan_id}")
def get_validation(plan_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    row = _fetch_plan_row(sb, plan_id)
    flat = _flatten_plan_row(row)
    payload = _normalize_plan(row.get("payload") or {})
    validation = payload.get("validation") or {}
    return {
        "plan": flat,
        "findings": validation.get("findings") or [],
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


@router.get("/reports/export")
def export_report(format: str = "csv", user: dict = Depends(require_admin)):
    sb = get_supabase()
    rows = sb.table("plans").select(PLAN_LIST_SELECT).execute().data or []
    rows = [r for r in rows if owns_employee(user, r.get("employee_id"))]
    plans = [_flatten_plan_row(r) for r in rows]
    findings: list[dict] = []

    if format == "csv":
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["plan_id", "employee", "role", "coverage", "traceability", "verification", "status"])
        for p in plans:
            w.writerow(
                [
                    p.get("id"),
                    p.get("employee_name"),
                    p.get("role_title"),
                    p.get("coverage_score"),
                    p.get("traceability_score"),
                    p.get("verification_status"),
                    p.get("status"),
                ]
            )
        data = buf.getvalue()
        return StreamingResponse(
            iter([data]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=skillsprint_report.csv"},
        )

    import json

    payload = {"plans": plans, "findings": findings}
    return StreamingResponse(
        iter([json.dumps(payload, default=str)]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=skillsprint_report.json"},
    )


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
