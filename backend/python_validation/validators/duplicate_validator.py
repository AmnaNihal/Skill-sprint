"""Duplicate content detection (SRS §16).

Deterministic normalized-title matching across modules, tasks, checklists and quizzes.
Similarity assists only; it never replaces requirement validation.
"""
from __future__ import annotations


def _norm(value: object) -> str:
    return str(value or "").strip().lower()


def detect_duplicates(items: list[dict]) -> tuple[list[str], list[dict]]:
    duplicates: list[str] = []
    findings: list[dict] = []
    seen: dict[str, str] = {}
    for item in items:
        key = _norm(item.get("title"))
        if not key:
            continue
        if key in seen:
            dup = f"{item.get('kind')}: {item.get('title')}"
            duplicates.append(dup)
            findings.append(
                {
                    "requirement_id": "-",
                    "field_name": "duplicate",
                    "genai_value": item.get("title") or "",
                    "python_value": "unique content required",
                    "result": "Mismatch",
                    "validation_status": "Duplicate Detected",
                    "detail": dup,
                }
            )
        else:
            seen[key] = item.get("kind") or ""
    return duplicates, findings
