from fastapi import APIRouter, Depends, HTTPException
from passlib.hash import bcrypt

from database.supabase_client import get_supabase
from schemas.models import LoginRequest, RegisterRequest, UserCreate
from security.auth import create_access_token, get_current_user, require_admin
from security.tenancy import is_master, owns_employee, owns_user

router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_ROLES = {"admin", "manager", "reviewer", "learner", "training_manager"}


def _public_user(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "email": row.get("email"),
        "full_name": row.get("display_name") or "",
        "role": row.get("role") or "learner",
        "employee_id": row.get("employee_id"),
        "is_active": row.get("is_active", True),
        "is_master": is_master({"email": row.get("email")}),
    }


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {**user, "is_master": is_master(user)}


@router.get("/users")
def list_users(user: dict = Depends(require_admin)):
    """List all user accounts (all roles) for administrators."""
    rows = (
        get_supabase()
        .table("users")
        .select("id,email,display_name,role,employee_id,is_active")
        .order("id")
        .execute()
        .data
        or []
    )
    return [_public_user(r) for r in rows]


@router.post("/users")
def create_user(payload: UserCreate, user: dict = Depends(require_admin)):
    """Create a user account. Only the main administrator may create administrators."""
    sb = get_supabase()
    role = payload.role if payload.role in ALLOWED_ROLES else "learner"
    if not is_master(user):
        if role == "admin":
            raise HTTPException(403, "Only the main administrator can create administrators")
        if payload.employee_id and not owns_employee(user, payload.employee_id):
            raise HTTPException(403, "You can only assign your own employees")
    existing = sb.table("users").select("id").eq("email", payload.email.lower()).limit(1).execute().data
    if existing:
        raise HTTPException(409, "Email already registered")
    row = {
        "email": payload.email.lower(),
        "display_name": payload.full_name or payload.email.split("@")[0],
        "password_hash": bcrypt.hash(payload.password),
        "role": role,
        "employee_id": payload.employee_id,
        "is_active": True,
    }
    try:
        created = (sb.table("users").insert(row).execute().data or [{}])[0]
    except Exception as e:
        raise HTTPException(400, f"User creation failed: {e}")
    return _public_user(created)


@router.post("/register")
def register(payload: RegisterRequest):
    sb = get_supabase()
    # Self-registration always creates a learner; elevated roles are assigned by an admin.
    role = "learner"
    try:
        existing = sb.table("users").select("id").eq("email", payload.email.lower()).limit(1).execute()
    except Exception as e:
        raise HTTPException(400, f"Lookup failed: {e}")
    if existing.data:
        raise HTTPException(409, "Email already registered")

    row = {
        "email": payload.email.lower(),
        "display_name": payload.full_name or payload.email.split("@")[0],
        "password_hash": bcrypt.hash(payload.password),
        "role": role,
        "employee_id": payload.employee_id,
        "is_active": True,
    }
    try:
        res = sb.table("users").insert(row).execute()
    except Exception as e:
        raise HTTPException(400, f"Register failed: {e}")
    created = (res.data or [{}])[0]
    token = create_access_token(created)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _public_user(created),
    }


@router.post("/login")
def login(payload: LoginRequest):
    sb = get_supabase()
    try:
        res = sb.table("users").select("*").eq("email", payload.email.lower()).limit(1).execute()
    except Exception as e:
        raise HTTPException(401, "Invalid email or password")
    rows = res.data or []
    if not rows:
        raise HTTPException(401, "Invalid email or password")
    user = rows[0]
    if not user.get("is_active", True):
        raise HTTPException(403, "Account disabled")
    try:
        ok = bcrypt.verify(payload.password, user.get("password_hash") or "")
    except Exception:
        ok = False
    if not ok:
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _public_user(user),
    }


@router.post("/logout")
def logout():
    return {"ok": True}
