"""Multi-tenant document scoping.

The seeded database schema has no owner column, so ownership is encoded in the generated
`document_id` prefix. Master administrators see everything; every other user only sees documents
they uploaded (and the requirements/chunks derived from them).

Owner key format: ``U<user-id>-<base>`` e.g. ``U77-INFOSE``.
"""
from __future__ import annotations

from config.settings import get_settings


def master_emails() -> set[str]:
    raw = get_settings().master_admin_emails or ""
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def is_master(user: dict) -> bool:
    """True when the user may see the shared/seeded dataset."""
    return (user.get("email") or "").lower() in master_emails()


def owner_key(user: dict) -> str | None:
    """Return the owner prefix for a user, or None for a master admin."""
    if is_master(user):
        return None
    uid = str(user.get("id") or user.get("employee_id") or "x").strip().upper()
    safe = "".join(ch for ch in uid if ch.isalnum())[:12] or "X"
    return f"U{safe}"


def scope_id(user: dict, base: str) -> str:
    """Prefix a document id with the user's owner key (master admins keep the id unchanged)."""
    key = owner_key(user)
    return base if key is None else f"{key}-{base}"


def _owner_prefix(value) -> str:
    s = str(value or "").strip()
    return s.split("-", 1)[0] if s else ""


def can_access(user: dict, document_id: str | None) -> bool:
    """True if the user may access the given document id.

    Learners can additionally access documents belonging to the company of their own linked
    employee (so their curriculum/requirements are not hidden).
    """
    if is_master(user):
        return True
    if not document_id:
        return False
    doc = str(document_id)
    key = owner_key(user)
    if key and doc.startswith(f"{key}-"):
        return True
    emp_key = _owner_prefix(user.get("employee_id"))
    if emp_key and doc.startswith(f"{emp_key}-"):
        return True
    return False


def filter_documents(user: dict, documents: list[dict]) -> list[dict]:
    if is_master(user):
        return documents
    return [d for d in documents if can_access(user, d.get("document_id"))]


def scope_employee_id(user: dict, base: str) -> str:
    """Prefix an employee id with the owner key (master admins keep it unchanged)."""
    return scope_id(user, base)


def owns_employee(user: dict, employee_id: str | None) -> bool:
    """True if the user may manage the given employee (master sees all; others only their own)."""
    if is_master(user):
        return True
    key = owner_key(user)
    if not key or not employee_id:
        return False
    return str(employee_id).startswith(f"{key}-")


def filter_employees(user: dict, employees: list[dict]) -> list[dict]:
    if is_master(user):
        return employees
    return [e for e in employees if owns_employee(user, e.get("employee_id"))]


def owns_user(actor: dict, target: dict) -> bool:
    """True if `actor` may see/manage the `target` user account."""
    if is_master(actor):
        return True
    if str(target.get("id")) == str(actor.get("id")):
        return True
    return owns_employee(actor, target.get("employee_id"))


def can_view_employee_data(user: dict, employee_id: str | None) -> bool:
    """True if the user may view data for an employee.

    Covers the user's own linked employee (e.g. a learner viewing the plan an admin generated
    for them) in addition to the normal owner-scoped access.
    """
    if is_master(user):
        return True
    if employee_id and str(user.get("employee_id") or "") == str(employee_id):
        return True
    return owns_employee(user, employee_id)

