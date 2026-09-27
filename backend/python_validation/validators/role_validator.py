"""Role relevance validation (SRS §9/§30)."""
from __future__ import annotations


def _norm(value: object) -> str:
    return str(value or "").strip().lower()


def validate_roles(items: list[dict], role: str) -> list[dict]:
    findings: list[dict] = []
    if not role:
        return findings
    for item in items:
        item_role = item.get("role")
        if item_role and _norm(item_role) != _norm(role):
            findings.append(
                {
                    "requirement_id": str(item.get("requirement_ids") or "-"),
                    "field_name": "role_relevance",
                    "genai_value": str(item_role),
                    "python_value": role,
                    "result": "Mismatch",
                    "validation_status": "Manual Review Required",
                    "detail": f"Role mismatch on {item.get('kind')}: {item.get('title')}",
                }
            )
    return findings
