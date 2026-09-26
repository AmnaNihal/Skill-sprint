"""Single source of truth for Pipeline 2 final verification status (SRS §27/§28).

`determine_final_status` is the ONLY place final status is decided. Do not duplicate this
logic elsewhere in the application.
"""
from __future__ import annotations

from typing import Any

# Statuses aligned with the SRS.
STATUS_VERIFIED = "Verified"
STATUS_VERIFIED_WARNING = "Verified with Warning"
STATUS_PARTIALLY_VERIFIED = "Partially Verified"
STATUS_INCOMPLETE = "Incomplete"
STATUS_SOURCE_MISSING = "Source Support Missing"
STATUS_REQUIREMENT_MISSING = "Requirement Missing"
STATUS_UNSUPPORTED_REQUIREMENT = "Unsupported Requirement"
STATUS_OUTDATED_SOURCE = "Outdated Source"
STATUS_CONTRADICTION = "Contradiction Detected"
STATUS_UNSUPPORTED = "Unsupported"
STATUS_CONTRADICTORY = "Contradictory"
STATUS_MANUAL_REVIEW = "Manual Review Required"

# Statuses accepted by the persisted schema (DB check constraint safety).
PERSISTABLE_STATUSES = {
    STATUS_VERIFIED,
    STATUS_VERIFIED_WARNING,
    STATUS_PARTIALLY_VERIFIED,
    STATUS_SOURCE_MISSING,
    STATUS_REQUIREMENT_MISSING,
    STATUS_UNSUPPORTED_REQUIREMENT,
    STATUS_OUTDATED_SOURCE,
    STATUS_CONTRADICTION,
    STATUS_MANUAL_REVIEW,
}


def determine_final_status(
    *,
    coverage_score: float,
    traceability_score: float,
    missing_requirements: list | None = None,
    unsupported_requirements: list | None = None,
    contradictions: list | None = None,
    duplicates: list | None = None,
    sequence_issues: list | None = None,
    hallucinations: list | None = None,
    outdated_sources: list | None = None,
    schema_errors: list | None = None,
) -> str:
    """Deterministic final-status rules (SRS §27/§28).

    A plan is only `Verified` when mandatory coverage and traceability pass and there are no
    unresolved contradictions, unsupported requirements, or outdated sources.
    """
    missing_requirements = missing_requirements or []
    unsupported_requirements = unsupported_requirements or []
    contradictions = contradictions or []
    duplicates = duplicates or []
    sequence_issues = sequence_issues or []
    hallucinations = hallucinations or []
    outdated_sources = outdated_sources or []
    schema_errors = schema_errors or []

    if schema_errors:
        return STATUS_MANUAL_REVIEW
    if contradictions:
        return STATUS_CONTRADICTION
    if missing_requirements:
        return STATUS_INCOMPLETE if coverage_score < 100 else STATUS_PARTIALLY_VERIFIED
    if unsupported_requirements or hallucinations:
        return STATUS_UNSUPPORTED
    if outdated_sources:
        return STATUS_OUTDATED_SOURCE
    if duplicates or sequence_issues:
        return STATUS_VERIFIED_WARNING
    if coverage_score >= 100 and traceability_score >= 100:
        return STATUS_VERIFIED
    if coverage_score >= 100 and traceability_score >= 90:
        return STATUS_VERIFIED_WARNING
    return STATUS_MANUAL_REVIEW


def report_final_status(report: Any) -> str:
    """Adapter for the legacy ValidationReport dataclass."""
    return determine_final_status(
        coverage_score=getattr(report, "coverage_score", 0.0),
        traceability_score=getattr(report, "traceability_score", 0.0),
        missing_requirements=getattr(report, "missing_requirements", []),
        unsupported_requirements=getattr(report, "unsupported_requirements", []),
        contradictions=getattr(report, "contradictions", []),
        duplicates=getattr(report, "duplicates", []),
        sequence_issues=getattr(report, "sequence_issues", []),
        hallucinations=getattr(report, "hallucinations", []),
        outdated_sources=getattr(report, "outdated_sources", []),
        schema_errors=getattr(report, "schema_errors", []),
    )
