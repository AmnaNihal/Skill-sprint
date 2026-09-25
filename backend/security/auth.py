from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from config.settings import get_settings
from database.supabase_client import get_supabase

bearer = HTTPBearer(auto_error=False)
ADMIN_ROLES = {"admin", "manager", "reviewer", "training_manager"}


def create_access_token(user: dict) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.get("id")),
        "email": user.get("email") or "",
        "role": user.get("role") or "learner",
        "full_name": user.get("display_name") or "",
        "employee_id": user.get("employee_id") or "",
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid or expired token: {e}")


def _load_user(user_id: str) -> Optional[dict]:
    try:
        res = get_supabase().table("users").select("*").eq("id", user_id).limit(1).execute()
        rows = res.data or []
        return rows[0] if rows else None
    except Exception:
        return None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    claims = decode_token(credentials.credentials)
    user = _load_user(str(claims.get("sub") or ""))
    if not user or not user.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "role": user.get("role") or "learner",
        "full_name": user.get("display_name") or "",
        "employee_id": user.get("employee_id"),
    }


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user
