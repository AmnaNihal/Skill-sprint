import uuid

from fastapi import APIRouter, Depends, HTTPException

from database.supabase_client import get_supabase
from schemas.models import EmployeeCreate, EmployeeUpdate, RequirementCreate, RoleCreate
from security.auth import get_current_user, require_admin

router = APIRouter(tags=["roles", "employees", "requirements"])

VALID_PRIORITIES = {"Critical", "High", "Medium", "Low"}
VALID_STAGES = {"Day 1", "Week 1", "Week 2", "First 30 Days", "First 60 Days", "First 90 Days"}


def _req_out(r: dict) -> dict:
    title = (r.get("requirement") or "")[:160]
    return {
        "id": r.get("requirement_id") or str(r.get("id")),
        "db_id": r.get("id"),
        "requirement_id": r.get("requirement_id"),
        "role": r.get("role"),
        "role_title": r.get("role"),
        "category": r.get("competency") or "General",
        "competency": r.get("competency") or "",
        "title": title,
        "description": r.get("requirement") or "",
        "requirement": r.get("requirement") or "",
        "priority": r.get("priority") or "Medium",
        "mandatory": bool(r.get("mandatory")),
        "due_stage": r.get("due_stage") or "Week 1",
        "assessment_topic": r.get("assessment_topic") or "",
        "source_document_id": r.get("source_document_id"),
        "source_document_version": r.get("source_document_version"),
        "source_section_id": r.get("source_section_id"),
        "source_chunk_id": r.get("source_chunk_id"),
        "approval_status": r.get("approval_status") or "Approved",
        "prerequisites": r.get("prerequisites") or [],
    }


@router.get("/roles")
def list_roles(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    titles: set[str] = set()
    try:
        for row in sb.table("role_requirements").select("role").execute().data or []:
            if row.get("role"):
                titles.add(row["role"])
    except Exception:
        pass
    try:
        for row in sb.table("employees").select("role").execute().data or []:
            if row.get("role"):
                titles.add(row["role"])
    except Exception:
        pass
    return [{"id": f"ROLE-{t[:8]}", "title": t, "department": "", "description": ""} for t in sorted(titles)]


@router.post("/roles")
def create_role(payload: RoleCreate, user: dict = Depends(require_admin)):
    # roles are derived from requirements/employees; create a placeholder requirement so role appears
    sb = get_supabase()
    rid = "ROLE-" + uuid.uuid4().hex[:6].upper()
    try:
        sb.table("role_requirements").insert(
            {
                "requirement_id": rid,
                "role": payload.title,
                "requirement": payload.description or f"Baseline competencies for {payload.title}",
                "competency": payload.department or "General",
                "mandatory": False,
                "priority": "Medium",
                "due_stage": "Week 1",
                "source_document_id": None,
                "source_document_version": None,
                "source_section_id": None,
                "source_chunk_id": None,
                "assessment_topic": payload.title,
                "prerequisites": [],
                "approval_status": "Approved",
            }
        ).execute()
    except Exception as e:
        raise HTTPException(400, str(e))
    return {"id": rid, **payload.model_dump()}


def _required_competencies(sb, role: str) -> list[str]:
    try:
        rows = sb.table("role_requirements").select("competency,role").execute().data or []
    except Exception:
        return []
    comps = {
        r.get("competency")
        for r in rows
        if r.get("competency") and r.get("role") in (role, "All Roles")
    }
    return sorted(comps)


def _training_info(plans: list[dict], employee_id: str) -> dict:
    mine = [p for p in plans if str(p.get("employee_id")) == str(employee_id)]
    infos = []
    for p in mine:
        payload = p.get("payload") or {}
        summary = (payload.get("validation") or {}).get("summary") or {}
        infos.append(
            {
                "plan_id": str(p.get("id")),
                "role": p.get("role"),
                "status": p.get("status"),
                "verification_status": summary.get("verification_status") or "",
                "coverage": summary.get("coverage_score") or 0,
                "traceability": summary.get("traceability_score") or 0,
                "progress": payload.get("progress") or 0,
                "created_at": p.get("created_at"),
            }
        )
    avg = round(sum(i["progress"] for i in infos) / len(infos)) if infos else 0
    return {"plans": infos, "plans_count": len(infos), "avg_progress": avg}


def _employee_out(row: dict, user_email: str = "", training: dict | None = None, competencies: list[str] | None = None) -> dict:
    return {
        **row,
        "id": row.get("employee_id"),
        "name": row.get("name") or "",
        "full_name": row.get("name") or "",
        "job_role": row.get("role"),
        "reporting_manager": row.get("manager"),
        "email": user_email or "",
        "training_status": row.get("training_status") or "Not Started",
        "required_competencies": competencies or [],
        "training": training or {"plans": [], "plans_count": 0, "avg_progress": 0},
    }


@router.get("/employees")
def list_employees(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    rows = sb.table("employees").select("*").order("employee_id").execute().data or []
    try:
        plans = sb.table("plans").select("id,employee_id,role,status,payload,created_at").execute().data or []
    except Exception:
        plans = []
    try:
        users = sb.table("users").select("employee_id,email").execute().data or []
    except Exception:
        users = []
    email_by_emp = {u.get("employee_id"): u.get("email") for u in users if u.get("employee_id")}
    return [
        _employee_out(r, email_by_emp.get(r.get("employee_id"), ""), _training_info(plans, r.get("employee_id")))
        for r in rows
    ]


@router.get("/employees/{employee_id}")
def get_employee(employee_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    rows = sb.table("employees").select("*").eq("employee_id", employee_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(404, "Employee not found")
    row = rows[0]
    try:
        plans = sb.table("plans").select("id,employee_id,role,status,payload,created_at").execute().data or []
    except Exception:
        plans = []
    try:
        users = sb.table("users").select("employee_id,email").eq("employee_id", employee_id).execute().data or []
    except Exception:
        users = []
    email = users[0].get("email") if users else ""
    return _employee_out(row, email, _training_info(plans, employee_id), _required_competencies(sb, row.get("role") or ""))


@router.post("/employees")
def create_employee(payload: EmployeeCreate, user: dict = Depends(require_admin)):
    sb = get_supabase()
    eid = "NSF-E" + uuid.uuid4().hex[:4].upper()
    name = payload.full_name or payload.name or "New Employee"
    role = payload.role or payload.job_role
    if not role:
        raise HTTPException(400, "role/job_role is required")
    row = {
        "employee_id": eid,
        "name": name,
        "role": role,
        "department": payload.department,
        "experience_level": payload.experience_level or "Beginner",
        "joining_date": payload.joining_date,
        "manager": payload.manager or payload.reporting_manager,
        "training_status": payload.training_status or "Not Started",
    }
    try:
        sb.table("employees").insert(row).execute()
    except Exception as e:
        raise HTTPException(400, str(e))
    return {**payload.model_dump(), "id": eid, "name": name, "role": role, "employee_id": eid}


@router.put("/employees/{employee_id}")
@router.patch("/employees/{employee_id}")
def update_employee(employee_id: str, payload: EmployeeUpdate, user: dict = Depends(require_admin)):
    sb = get_supabase()
    existing = sb.table("employees").select("*").eq("employee_id", employee_id).limit(1).execute().data or []
    if not existing:
        raise HTTPException(404, "Employee not found")
    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    updates = {}
    if "full_name" in data or "name" in data:
        updates["name"] = data.get("full_name") or data.get("name")
    if "job_role" in data or "role" in data:
        updates["role"] = data.get("role") or data.get("job_role")
    if "reporting_manager" in data or "manager" in data:
        updates["manager"] = data.get("manager") or data.get("reporting_manager")
    for field in ("department", "experience_level", "joining_date", "training_status"):
        if field in data:
            updates[field] = data[field]
    if not updates:
        return {**existing[0], "updated": False}
    try:
        sb.table("employees").update(updates).eq("employee_id", employee_id).execute()
    except Exception as e:
        raise HTTPException(400, str(e))
    updated = sb.table("employees").select("*").eq("employee_id", employee_id).limit(1).execute().data or [existing[0]]
    return {**updated[0], "updated": True}


@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: str, user: dict = Depends(require_admin)):
    sb = get_supabase()
    existing = sb.table("employees").select("employee_id").eq("employee_id", employee_id).limit(1).execute().data or []
    if not existing:
        raise HTTPException(404, "Employee not found")
    sb.table("employees").delete().eq("employee_id", employee_id).execute()
    return {"ok": True, "employee_id": employee_id}



@router.get("/requirements")
def list_requirements(role: str | None = None, user: dict = Depends(get_current_user)):
    q = get_supabase().table("role_requirements").select("*")
    if role:
        q = q.eq("role", role)
    rows = q.order("id").execute().data or []
    return [_req_out(r) for r in rows]


@router.post("/requirements")
def create_requirement(payload: RequirementCreate, user: dict = Depends(require_admin)):
    sb = get_supabase()
    role = payload.role or payload.role_title
    text = payload.requirement or payload.description or payload.title
    if not role or not text:
        raise HTTPException(400, "role and requirement text are required")
    rid = payload.requirement_id if hasattr(payload, "requirement_id") else None
    rid = rid or "REQ-" + uuid.uuid4().hex[:6].upper()
    priority = payload.priority if payload.priority in VALID_PRIORITIES else "Medium"
    stage = payload.due_stage if payload.due_stage in VALID_STAGES else "Week 1"
    row = {
        "requirement_id": rid,
        "role": role,
        "requirement": text,
        "competency": payload.competency or payload.category or "General",
        "mandatory": payload.mandatory,
        "priority": priority,
        "due_stage": stage,
        "source_document_id": payload.source_document_id,
        "source_document_version": payload.source_document_version,
        "source_section_id": payload.source_section_id,
        "source_chunk_id": payload.source_chunk_id,
        "assessment_topic": payload.assessment_topic or payload.title or text[:80],
        "prerequisites": payload.prerequisites or [],
        "approval_status": payload.approval_status or "Approved",
    }
    try:
        res = sb.table("role_requirements").insert(row).execute()
    except Exception as e:
        raise HTTPException(400, str(e))
    created = (res.data or [row])[0]
    return _req_out(created)


@router.delete("/requirements/{req_id}")
def delete_requirement(req_id: str, user: dict = Depends(require_admin)):
    get_supabase().table("role_requirements").delete().eq("requirement_id", req_id).execute()
    return {"ok": True}
