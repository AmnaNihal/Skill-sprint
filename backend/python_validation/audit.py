"""Pipeline 2 audit-trail entries (SRS §31).

Audit entries are append-only domain records stored with the plan under
`payload.validation.audit`. They are never used to override validation results.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

# Significant Pipeline 2 operations (SRS §31).
VALIDATION_STARTED = "validation_started"
VALIDATION_COMPLETED = "validation_completed"
VALIDATION_FAILED = "validation_failed"
REQUIREMENT_MISMATCH = "requirement_mismatch"
REQUIREMENT_MISSING = "requirement_missing"
UNSUPPORTED_REQUIREMENT = "unsupported_requirement"
SOURCE_FAILURE = "source_failure"
CONTRADICTION = "contradiction"
OUTDATED_SOURCE = "outdated_source"
MANUAL_REVIEW = "manual_review"
REVIEWER_OVERRIDE = "reviewer_override"

_MANUAL_REVIEW_STATUSES = {
    "Manual Review Required",
    "Partially Verified",
    "Incomplete",
    "Outdated Source",
    "Contradiction Detected",
    "Unsupported",
    "Source Support Missing",
    "Unsupported Requirement",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_audit_entry(
    event: str,
    *,
    plan_id: str | int | None = None,
    actor: str = "pipeline2",
    detail: str = "",
    status: str = "",
) -> dict[str, Any]:
    return {
        "event": event,
        "plan_id": str(plan_id) if plan_id is not None else None,
        "actor": actor,
        "detail": detail,
        "status": status,
        "timestamp": _now(),
    }


def audit_events_from_report(report: Any, *, plan_id: str | int | None = None, actor: str = "pipeline2") -> list[dict]:
    entries = [build_audit_entry(VALIDATION_STARTED, plan_id=plan_id, actor=actor)]
    for rid in getattr(report, "missing_requirements", []):
        entries.append(build_audit_entry(REQUIREMENT_MISSING, plan_id=plan_id, actor=actor, detail=str(rid)))
    for rid in getattr(report, "unsupported_requirements", []):
        entries.append(build_audit_entry(UNSUPPORTED_REQUIREMENT, plan_id=plan_id, actor=actor, detail=str(rid)))
    for contradiction in getattr(report, "contradictions", []):
        entries.append(build_audit_entry(CONTRADICTION, plan_id=plan_id, actor=actor, detail=str(contradiction)))
    for source in getattr(report, "outdated_sources", []):
        entries.append(build_audit_entry(OUTDATED_SOURCE, plan_id=plan_id, actor=actor, detail=str(source)))
    status = getattr(report, "verification_status", "")
    entries.append(build_audit_entry(VALIDATION_COMPLETED, plan_id=plan_id, actor=actor, status=status))
    if status in _MANUAL_REVIEW_STATUSES:
        entries.append(build_audit_entry(MANUAL_REVIEW, plan_id=plan_id, actor=actor, detail=status))
    return entries
