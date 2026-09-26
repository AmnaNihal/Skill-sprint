"""Trusted validation context (SRS §33).

Built once per validation run so every validator reads consistent ground truth and no
validator performs its own database queries.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from policy_management.precedence import PRECEDENCE_RULES


@dataclass(frozen=True)
class ValidationContext:
    role: str
    department: str = ""
    experience_level: str = ""
    all_requirements: tuple[dict, ...] = ()
    applicable_requirements: tuple[dict, ...] = ()
    documents: dict[str, dict] = field(default_factory=dict)
    active_document_ids: frozenset[str] = frozenset()
    sections_by_doc: dict[str, frozenset[str]] = field(default_factory=dict)
    chunk_by_doc_section: dict[tuple[str, str], str] = field(default_factory=dict)
    active_version_by_doc: dict[str, str] = field(default_factory=dict)
    precedence_rules: tuple[dict, ...] = ()


def _active(requirement: dict) -> bool:
    return (requirement.get("approval_status") or "Approved") != "Superseded"


def build_context(
    role: str,
    department: str = "",
    experience_level: str = "",
    sb: Optional[Any] = None,
) -> ValidationContext:
    """Batch-load all ground truth needed for a validation run."""
    if sb is None:
        from database.supabase_client import get_supabase

        sb = get_supabase()

    requirements = sb.table("role_requirements").select("*").execute().data or []
    documents = sb.table("documents").select("*").execute().data or []
    chunks = (
        sb.table("document_chunks")
        .select("document_id,section_id,chunk_id")
        .execute()
        .data
        or []
    )

    documents_by_id = {d["document_id"]: d for d in documents if d.get("document_id")}
    active_ids: set[str] = set()
    active_version: dict[str, str] = {}
    for d in documents:
        did = d.get("document_id")
        if not did:
            continue
        if d.get("is_active", True) and not d.get("is_quarantined", False):
            active_ids.add(did)
            version = str(d.get("version") or "")
            if did not in active_version or version > active_version[did]:
                active_version[did] = version

    sections: dict[str, set[str]] = {}
    chunk_map: dict[tuple[str, str], str] = {}
    for c in chunks:
        did = c.get("document_id")
        sid = c.get("section_id")
        if not did:
            continue
        sections.setdefault(did, set())
        if sid:
            sections[did].add(str(sid))
            if c.get("chunk_id"):
                chunk_map[(did, str(sid))] = c["chunk_id"]

    applicable = [
        r
        for r in requirements
        if r.get("role") in (role, "All Roles") and _active(r)
    ]

    return ValidationContext(
        role=role,
        department=department,
        experience_level=experience_level,
        all_requirements=tuple(requirements),
        applicable_requirements=tuple(applicable),
        documents=documents_by_id,
        active_document_ids=frozenset(active_ids),
        sections_by_doc={k: frozenset(v) for k, v in sections.items()},
        chunk_by_doc_section=chunk_map,
        active_version_by_doc=active_version,
        precedence_rules=tuple(PRECEDENCE_RULES),
    )
