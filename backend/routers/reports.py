import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from database.supabase_client import get_supabase
from routers.plans import _fetch_plan_row, _flatten_plan_row, _normalize_plan, review_plan
from schemas.models import ReviewDecision
from security.auth import get_current_user, require_admin

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
    rows = get_supabase().table("plans").select("*").order("created_at", desc=True).execute().data or []
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
    rows = sb.table("plans").select("*").execute().data or []
    plans = [_flatten_plan_row(r) for r in rows]
    findings = []
    for r in rows:
        v = (r.get("payload") or {}).get("validation") or {}
        for f in v.get("findings") or []:
            findings.append({"plan_id": str(r.get("id")), **f})

    if format == "csv":
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["plan_id", "requirement_id", "field", "genai", "python", "result", "status", "detail"])
        for f in findings:
            w.writerow(
                [
                    f.get("plan_id"),
                    f.get("requirement_id"),
                    f.get("field_name"),
                    f.get("genai_value"),
                    f.get("python_value"),
                    f.get("result"),
                    f.get("validation_status"),
                    f.get("detail"),
                ]
            )
        w.writerow([])
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
    docs = sb.table("documents").select("id,is_active,is_quarantined").execute().data or []
    reqs = sb.table("role_requirements").select("id,mandatory,role").execute().data or []
    plan_rows = sb.table("plans").select("*").execute().data or []
    plans = [_flatten_plan_row(r) for r in plan_rows]
    employees = sb.table("employees").select("id").execute().data or []
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

    # Adaptive recommendations from incomplete mandatory modules and overall progress.
    recommendations: list[dict] = []
    for m in modules:
        m_tasks = [t for t in (m.get("tasks") or []) if isinstance(t, dict)]
        total = len(m_tasks)
        completed = sum(1 for t in m_tasks if t.get("completed"))
        if m.get("mandatory") and (total == 0 or completed < total):
            recommendations.append(
                {
                    "area": m.get("module_title") or m.get("title") or "Module",
                    "reason": "Mandatory module incomplete",
                    "activity": f"Complete '{m.get('module_title') or m.get('title')}'",
                    "due_stage": m.get("due_stage") or "Week 1",
                    "requirement_ids": m.get("requirement_ids") or [],
                }
            )
    if progress < 50:
        recommendations.append(
            {
                "area": "Overall onboarding",
                "reason": "Low overall completion progress",
                "activity": "Prioritise Day-1 and Week-1 mandatory modules",
                "due_stage": "Day 1",
                "requirement_ids": [],
            }
        )

    return {
        "plan": flat,
        "modules": out_modules,
        "tasks_total": len(tasks),
        "tasks_completed": done,
        "quizzes_total": len(quizzes),
        "progress": progress,
        "recommendations": recommendations[:8],
        "adaptive_recommendations": recommendations[:8],
        "weak_areas": [r["area"] for r in recommendations[:8]],
        "plan_recommendations": payload.get("progress_recommendations") or [],
    }
