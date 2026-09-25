"""Configurable document precedence + effective-source resolution (SRS policy precedence).

Lower rank = higher authority. This is the single source of truth for precedence and is
exposed through the API so the hierarchy is documented and configurable.
"""
from __future__ import annotations

from typing import Any

PRECEDENCE_RULES: list[dict[str, Any]] = [
    {"rank": 1, "label": "Latest approved policy", "match": ["policy", "compliance", "privacy", "security"]},
    {"rank": 2, "label": "Department SOP", "match": ["sop", "process", "procedure", "manual"]},
    {"rank": 3, "label": "FAQ", "match": ["faq"]},
    {"rank": 4, "label": "Informal guidance", "match": ["notes", "guideline", "handbook"]},
]


def document_rank(category: str | None) -> int:
    text = (category or "").lower()
    for rule in PRECEDENCE_RULES:
        if any(token in text for token in rule["match"]):
            return int(rule["rank"])
    return 4


def _version_key(version: str | None) -> tuple[int, ...]:
    parts: list[int] = []
    for piece in str(version or "0").split("."):
        try:
            parts.append(int(piece))
        except ValueError:
            parts.append(0)
    return tuple(parts) or (0,)


def resolve_effective_document(documents: list[dict], document_id: str) -> dict | None:
    """Return the highest-precedence, highest-version active document for ``document_id``."""
    candidates = [d for d in documents if str(d.get("document_id")) == str(document_id)]
    if not candidates:
        return None
    active = [d for d in candidates if d.get("is_active", True) and not d.get("is_quarantined", False)]
    pool = active or candidates

    def sort_key(doc: dict) -> tuple[int, tuple[int, ...]]:
        # rank ascending (1 first); version descending (negated)
        return (document_rank(doc.get("category")), tuple(-x for x in _version_key(doc.get("version"))))

    return sorted(pool, key=sort_key)[0]


def is_superseded(documents: list[dict], document_id: str, version: str | None) -> bool:
    """True when a newer active version exists for the same document_id."""
    effective = resolve_effective_document(documents, document_id)
    if not effective:
        return False
    return _version_key(effective.get("version")) > _version_key(version)
