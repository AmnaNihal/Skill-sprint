import copy
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from comparison_engine.comparator import compare_results, summary
from database.supabase_client import get_supabase
from genai_pipeline.generator import GenerationError, generate_onboarding_plan
from genai_pipeline.schema_validator import validate_genai_payload
from hallucination_checks.detector import flag_unsupported
from python_validation.engine import validate_plan
from schemas.models import GeneratePlanRequest, ReviewDecision, ToggleTaskRequest
from security.auth import get_current_user, require_admin

router = APIRouter(prefix="/plans", tags=["plans"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _pid(plan_id: str | int) -> int:
    try:
        return int(plan_id)
    except (TypeError, ValueError):
        raise HTTPException(404, "Plan not found")


def _normalize_reqs(reqs: list[dict]) -> list[dict]:
    out = []
    for r in reqs:
        out.append(
            {
                **r,
                "id": r.get("requirement_id") or r.get("id"),
                "role_title": r.get("role") or r.get("role_title") or "",
                "title": (r.get("requirement") or r.get("title") or "")[:160],
                "description": r.get("requirement") or r.get("description") or "",
            }
        )
    return out


def _normalize_plan(plan: dict) -> dict:
    plan = copy.deepcopy(plan)
    modules = plan.get("modules") or []
    for m in modules:
        if m.get("requirement_id") and not m.get("requirement_ids"):
            m["requirement_ids"] = [m["requirement_id"]]
        tasks = m.get("tasks") or []
        norm_tasks = []
        for i, t in enumerate(tasks, 1):
            if isinstance(t, str):
                norm_tasks.append(
                    {
                        "id": f"{m.get('module_id', 'M')}-T{i:02d}",
                        "title": t,
                        "description": "",
                        "task_type": "Reading",
                        "estimated_minutes": 30,
                        "completed": False,
                        "due_stage": m.get("due_stage") or "Week 1",
                        "source_document_id": m.get("source_document_id") or "",
                        "source_section_id": m.get("source_section_id") or "",
                        "requirement_id": m.get("requirement_id") or "",
                    }
                )
            else:
                if "id" not in t:
                    t["id"] = f"{m.get('module_id', 'M')}-T{i:02d}"
                t.setdefault("completed", False)
                t.setdefault("estimated_minutes", 30)
                t.setdefault("description", "")
                norm_tasks.append(t)
        m["tasks"] = norm_tasks
        quizzes = m.get("quiz") or []
        for i, q in enumerate(quizzes, 1):
            if isinstance(q, dict):
                q.setdefault("id", f"{m.get('module_id', 'M')}-Q{i:02d}")
                q.setdefault("options", [])
                q.setdefault("correct_answer", [])
                if isinstance(q.get("correct_answer"), (int, bool)):
                    q["correct_answer"] = [q["correct_answer"]]
                elif q.get("correct_answer") is None:
                    q["correct_answer"] = []
        m["quiz"] = quizzes
        m.setdefault("module_title", m.get("title") or m.get("module_id"))
        m.setdefault("title", m.get("module_title"))
        m.setdefault("id", m.get("module_id"))
        m.setdefault("estimated_hours", 1)
        m.setdefault("status", "Not Started")
    plan["modules"] = modules
    plan.setdefault("role", plan.get("role_title") or "")
    return plan


def _plan_progress(payload: dict) -> int:
    tasks = []
    for m in payload.get("modules") or []:
        tasks.extend(m.get("tasks") or [])
    if not tasks:
        return int(payload.get("progress") or 0)
    done = sum(1 for t in tasks if isinstance(t, dict) and t.get("completed"))
    return round(done / len(tasks) * 100)


def _flatten_plan_row(row: dict) -> dict:
    payload = row.get("payload") or {}
    validation = payload.get("validation") or {}
    summary = validation.get("summary") or {}
    return {
        "id": str(row.get("id")),
        "employee_id": row.get("employee_id"),
        "employee_name": payload.get("employee_name") or "",
        "role_title": row.get("role") or payload.get("role") or "",
        "role": row.get("role") or payload.get("role") or "",
        "department": payload.get("department") or "",
        "target_completion": payload.get("target_completion") or "30 Days",
        "status": row.get("status") or "Draft",
        "progress": _plan_progress(payload),
        "verification_status": summary.get("verification_status") or payload.get("verification_status") or "",
        "coverage_score": summary.get("coverage_score") or payload.get("coverage_score") or 0,
        "traceability_score": summary.get("traceability_score") or payload.get("traceability_score") or 0,
        "consistency_score": summary.get("consistency_score") or payload.get("consistency_score") or 0,
        "missing_count": summary.get("missing_count") or 0,
        "contradiction_count": summary.get("contradiction_count") or 0,
        "prompt_version": row.get("prompt_version") or payload.get("prompt_version") or "",
        "model_used": row.get("model") or payload.get("model") or "",
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "source_versions": row.get("source_versions") or {},
    }


def _fetch_plan_row(sb, plan_id: str | int) -> dict:
    res = sb.table("plans").select("*").eq("id", _pid(plan_id)).limit(1).execute()
    if not res.data:
        raise HTTPException(404, "Plan not found")
    return res.data[0]


def _run_validation(sb, plan: dict, role_title: str):
    reqs = _normalize_reqs(sb.table("role_requirements").select("*").execute().data or [])
    docs = sb.table("documents").select("document_id,is_active,is_quarantined").execute().data or []
    active_ids = {
        d["document_id"]
        for d in docs
        if d.get("is_active", True) and not d.get("is_quarantined", False)
    }

    plan_n = _normalize_plan(plan)
    report = validate_plan(plan_n, reqs, active_ids, role_title=role_title)
    hallucinations = flag_unsupported(plan_n, active_ids)
    for h in hallucinations:
        report.hallucinations.append(f"{h['item']}: {h['reason']}")

    findings = [
        {
            "id": f"F{i+1:04d}",
            "requirement_id": f.requirement_id,
            "field_name": f.field_name,
            "genai_value": f.genai_value[:2000],
            "python_value": f.python_value[:2000],
            "result": f.result,
            "validation_status": f.validation_status,
            "detail": f.detail[:4000],
        }
        for i, f in enumerate(report.findings[:500])
    ]
    sumry = summary(report)
    comparison = compare_results(report, plan_n)
    return findings, comparison, sumry, report


@router.post("/generate")
def generate_plan(payload: GeneratePlanRequest, user: dict = Depends(require_admin)):
    sb = get_supabase()
    role = payload.role_title or payload.role
    if not role:
        raise HTTPException(400, "role_title is required")

    emp_id = payload.employee_id
    emp_name = payload.employee_name
    department = payload.department
    experience = payload.experience_level
    joining = payload.joining_date

    if not emp_id:
        emps = sb.table("employees").select("*").limit(200).execute().data or []
        match = next((e for e in emps if e.get("role") == role), None)
        if match:
            emp_id = match.get("employee_id")
            emp_name = emp_name or match.get("name")
            department = department or match.get("department")
            experience = experience or match.get("experience_level")
            joining = joining or match.get("joining_date")
        else:
            emp_id = emp_id or (emps[0].get("employee_id") if emps else "NSF-E001")

    # Every role inherits the company-wide baseline alongside role-specific requirements.
    all_requirements = sb.table("role_requirements").select("*").execute().data or []
    reqs = _normalize_reqs(
        [r for r in all_requirements if r.get("role") in (role, "All Roles")]
    )
    if not reqs:
        reqs = _normalize_reqs(all_requirements)
    if not reqs:
        raise HTTPException(400, "No role requirements found.")

    source_doc_ids = sorted({r["source_document_id"] for r in reqs if r.get("source_document_id")})
    docs = sb.table("documents").select("document_id,version").eq("is_active", True).execute().data or []
    doc_version = {d["document_id"]: d.get("version") or "1.0" for d in docs}
    if not source_doc_ids:
        source_doc_ids = [d["document_id"] for d in docs[:10]]

    chunks = []
    # Include every chunk from every requirement source document so the AI reads
    # the complete applicable policy/SOP, not an arbitrary first-page excerpt.
    for did in source_doc_ids:
        res = (
            sb.table("document_chunks")
            .select("chunk_id,section_id,heading,text,document_id,document_version,source_location")
            .eq("document_id", did)
            .order("chunk_id")
            .execute()
        )
        for c in res.data or []:
            chunks.append(
                {
                    "source_document_id": c.get("document_id"),
                    "source_section_id": c.get("section_id") or "",
                    "source_chunk_id": c.get("chunk_id") or "",
                    "heading": c.get("heading") or "",
                    "content": c.get("text") or "",
                }
            )

    if not chunks:
        raise HTTPException(400, "No source chunks available for generation")

    try:
        result = generate_onboarding_plan(
            employee_name=emp_name,
            role_title=role,
            department=department,
            experience_level=experience,
            target_completion=payload.target_completion,
            joining_date=joining or "",
            requirements=reqs,
            source_blocks=chunks,
        )
    except GenerationError as e:
        raise HTTPException(502, str(e))

    plan = result["plan"]
    meta = result["meta"]
    plan.setdefault("role", role)
    plan.setdefault("employee_name", emp_name)
    plan.setdefault("department", department)
    plan.setdefault("target_completion", payload.target_completion)

    schema_errors = validate_genai_payload(plan)
    if schema_errors:
        raise HTTPException(502, {"message": "Schema validation failed", "errors": schema_errors})

    findings, comparison, sumry, report = _run_validation(sb, plan, role)
    plan_n = _normalize_plan(plan)
    plan_n["employee_name"] = emp_name
    plan_n["department"] = department
    plan_n["target_completion"] = payload.target_completion
    plan_n["prompt_version"] = meta.get("prompt_version")
    plan_n["model"] = meta.get("model")
    plan_n["validation"] = {
        "findings": findings,
        "comparison": comparison[:200],
        "summary": sumry,
        "missing": report.missing_requirements,
        "unsupported": report.unsupported_requirements,
        "contradictions": report.contradictions,
        "duplicates": report.duplicates,
        "sequence_issues": report.sequence_issues,
        "hallucinations": report.hallucinations,
        "schema_errors": schema_errors,
        "validated_at": _now(),
    }

    source_versions = {**doc_version}
    for did in source_doc_ids:
        source_versions.setdefault(did, "1.0")
    plan_n["source_document_versions"] = source_versions

    now = _now()
    status = "Approved" if sumry["verification_status"] in ("Verified", "Verified with Warning") else "Pending Review"
    row = {
        "employee_id": emp_id,
        "role": role,
        "payload": plan_n,
        "status": status,
        "prompt_version": meta.get("prompt_version") or "v1.2",
        "model": meta.get("model"),
        "source_versions": source_versions,
        "created_at": now,
        "updated_at": now,
    }
    try:
        res = sb.table("plans").insert(row).execute()
        created = (res.data or [{}])[0]
        plan_pk = created.get("id")
    except Exception as e:
        raise HTTPException(400, f"Plan insert failed: {e}")

    if emp_id:
        try:
            emps = sb.table("employees").select("training_status").eq("employee_id", emp_id).limit(1).execute()
            if emps.data:
                sb.table("employees").update({"training_status": "In Progress"}).eq("employee_id", emp_id).execute()
        except Exception:
            pass

    task_count = sum(len(m.get("tasks") or []) for m in plan_n.get("modules") or [])
    quiz_count = sum(len(m.get("quiz") or []) for m in plan_n.get("modules") or [])

    return {
        "plan_id": str(plan_pk),
        "status": status,
        "verification_status": sumry["verification_status"],
        "scores": {
            "coverage": sumry["coverage_score"],
            "traceability": sumry["traceability_score"],
            "consistency": sumry["consistency_score"],
        },
        "missing": report.missing_requirements,
        "unsupported": report.unsupported_requirements,
        "contradictions": report.contradictions,
        "duplicates": report.duplicates,
        "sequence_issues": report.sequence_issues,
        "hallucinations": report.hallucinations,
        "schema_errors": schema_errors,
        "generation_meta": meta,
        "comparison": comparison[:200],
        "summary": sumry,
        "modules": len(plan_n.get("modules") or []),
        "tasks": task_count,
        "quizzes": quiz_count,
    }


@router.get("")
def list_plans(user: dict = Depends(get_current_user)):
    rows = get_supabase().table("plans").select("*").order("created_at", desc=True).execute().data or []
    return [_flatten_plan_row(r) for r in rows]


@router.get("/{plan_id}")
def get_plan(plan_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    row = _fetch_plan_row(sb, plan_id)
    flat = _flatten_plan_row(row)
    payload = _normalize_plan(row.get("payload") or {})
    validation = payload.get("validation") or {}
    findings = validation.get("findings") or []
    modules = payload.get("modules") or []

    all_tasks = []
    all_quizzes = []
    for m in modules:
        for t in m.get("tasks") or []:
            all_tasks.append({**t, "module_id": m.get("id") or m.get("module_id")})
        for q in m.get("quiz") or []:
            all_quizzes.append({**q, "module_id": m.get("id") or m.get("module_id")})

    return {
        **flat,
        "modules": modules,
        "tasks": all_tasks,
        "quizzes": all_quizzes,
        "checklists": [],
        "assessments": [],
        "validations": findings,
        "reviews": validation.get("reviews") or [],
        "raw_payload_keys": list(payload.keys()),
    }


@router.post("/{plan_id}/revalidate")
def revalidate(plan_id: str, user: dict = Depends(require_admin)):
    sb = get_supabase()
    row = _fetch_plan_row(sb, plan_id)
    payload = row.get("payload") or {}
    role = row.get("role") or payload.get("role") or ""
    findings, comparison, sumry, report = _run_validation(sb, payload, role)

    payload = dict(payload)
    payload["validation"] = {
        "findings": findings,
        "comparison": comparison[:200],
        "summary": sumry,
        "missing": report.missing_requirements,
        "unsupported": report.unsupported_requirements,
        "contradictions": report.contradictions,
        "duplicates": report.duplicates,
        "sequence_issues": report.sequence_issues,
        "hallucinations": report.hallucinations,
        "schema_errors": [],
        "validated_at": _now(),
    }
    sb.table("plans").update({"payload": payload, "updated_at": _now()}).eq("id", row["id"]).execute()
    return {
        "summary": sumry,
        "comparison": comparison[:200],
        "missing": report.missing_requirements,
        "contradictions": report.contradictions,
        "duplicates": report.duplicates,
        "sequence_issues": report.sequence_issues,
        "hallucinations": report.hallucinations,
    }


@router.post("/review")
def review_plan(payload: ReviewDecision, user: dict = Depends(require_admin)):
    sb = get_supabase()
    row = _fetch_plan_row(sb, payload.plan_id)
    status_map = {"Approved": "Approved", "Rejected": "Rejected", "Edited": "Edited"}
    new_status = status_map.get(payload.decision, payload.decision)
    pl = dict(row.get("payload") or {})
    validation = dict(pl.get("validation") or {})
    reviews = list(validation.get("reviews") or [])
    reviews.append(
        {
            "status": new_status if new_status != "Edited" else "Approved",
            "comment": payload.comment,
            "override_result": payload.override_result,
            "reviewer": user.get("full_name") or user.get("email") or "",
            "decided_at": _now(),
        }
    )
    validation["reviews"] = reviews
    pl["validation"] = validation
    sb.table("plans").update({"status": new_status if new_status != "Rejected" else "Rejected", "payload": pl, "updated_at": _now()}).eq("id", row["id"]).execute()
    return {"ok": True, "status": new_status if new_status != "Rejected" else "Rejected"}


@router.post("/task/toggle")
def toggle_task(payload: ToggleTaskRequest, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    row = _fetch_plan_row(sb, payload.plan_id)
    if user.get("role") == "learner" and str(user.get("employee_id") or "") != str(row.get("employee_id") or ""):
        raise HTTPException(403, "You can only update tasks in your own plan")
    pl = _normalize_plan(row.get("payload") or {})
    found = False
    for m in pl.get("modules") or []:
        for t in m.get("tasks") or []:
            if str(t.get("id")) == str(payload.task_id):
                t["completed"] = payload.completed
                found = True
                break
        if found:
            break
    if not found:
        raise HTTPException(404, "Task not found")

    progress = _plan_progress(pl)
    pl["progress"] = progress
    status = "Completed" if progress == 100 else ("In Progress" if progress > 0 else (row.get("status") or "Draft"))
    if status == "Completed":
        new_status = "Completed"
    elif progress > 0 and row.get("status") in ("Draft", "Approved", "Pending Review"):
        new_status = "In Progress" if row.get("status") == "Draft" else row.get("status")
    else:
        new_status = row.get("status")

    sb.table("plans").update(
        {"payload": pl, "updated_at": _now()}
    ).eq("id", row["id"]).execute()
    if new_status and new_status != row.get("status") and status in ("In Progress", "Completed"):
        sb.table("plans").update({"status": status}).eq("id", row["id"]).execute()

    return {"progress": progress, "status": status if status == "Completed" else (row.get("status") or status)}
