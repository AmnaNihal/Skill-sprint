"""Pipeline 2 result models (Pydantic) and report conversion (SRS §26).

These models are the structured validation result shape. They are derived ONLY from the
deterministic report — never from Pipeline 1 / client supplied status or score fields.
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class Finding(BaseModel):
    requirement_id: str | None = None
    field_name: str
    genai_value: str = ""
    python_value: str = ""
    result: str = "Match"
    validation_status: str = ""
    detail: str = ""


class RequirementResult(BaseModel):
    requirement_id: str
    expected: bool = False
    generated: bool = False
    source_valid: bool = False
    role_valid: bool = False
    version_valid: bool = False
    mandatory: bool = False
    validation_status: str = ""


class ValidationSummary(BaseModel):
    total_mandatory_requirements: int = 0
    covered_mandatory_requirements: int = 0
    coverage_score: float = 0.0
    traceability_score: float = 0.0
    consistency_score: float = 0.0
    missing_requirement_count: int = 0
    unsupported_requirement_count: int = 0
    contradiction_count: int = 0
    outdated_source_count: int = 0
    duplicate_count: int = 0
    sequence_issue_count: int = 0
    hallucination_count: int = 0
    final_status: str = ""


class ValidationResult(BaseModel):
    employee_id: str = ""
    role: str = ""
    summary: ValidationSummary = Field(default_factory=ValidationSummary)
    requirements: list[RequirementResult] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    comparison: list[dict[str, Any]] = Field(default_factory=list)
    schema_errors: list[str] = Field(default_factory=list)
    final_status: str = ""
    requires_manual_review: bool = False


def _generated_requirement_ids(plan: dict[str, Any]) -> set[str]:
    ids: set[str] = set()
    for module in plan.get("modules") or []:
        for rid in module.get("requirement_ids") or []:
            if rid:
                ids.add(str(rid))
        if module.get("requirement_id"):
            ids.add(str(module["requirement_id"]))
    return ids


def build_validation_result(report: Any, plan: dict[str, Any], role: str = "", employee_id: str = "") -> ValidationResult:
    """Convert the deterministic ValidationReport into the structured ValidationResult."""
    findings = [
        Finding(
            requirement_id=getattr(f, "requirement_id", None),
            field_name=getattr(f, "field_name", ""),
            genai_value=str(getattr(f, "genai_value", "")),
            python_value=str(getattr(f, "python_value", "")),
            result=getattr(f, "result", "Match"),
            validation_status=getattr(f, "validation_status", ""),
            detail=getattr(f, "detail", ""),
        )
        for f in getattr(report, "findings", [])
    ]

    requirements: list[RequirementResult] = []
    seen: set[str] = set()
    for f in getattr(report, "findings", []):
        rid = getattr(f, "requirement_id", None)
        if not rid or rid == "-" or getattr(f, "field_name", "") != "mandatory_coverage" or rid in seen:
            continue
        seen.add(rid)
        requirements.append(
            RequirementResult(
                requirement_id=str(rid),
                expected=True,
                generated=getattr(f, "result", "") == "Match",
                mandatory=True,
                validation_status=getattr(f, "validation_status", ""),
            )
        )

    for rid in getattr(report, "unsupported_requirements", []):
        rid = str(rid)
        if rid in seen:
            continue
        seen.add(rid)
        requirements.append(
            RequirementResult(
                requirement_id=rid,
                expected=False,
                generated=True,
                validation_status="Unsupported Requirement",
            )
        )

    summary = ValidationSummary(
        total_mandatory_requirements=getattr(report, "mandatory_total", 0),
        covered_mandatory_requirements=getattr(report, "mandatory_covered", 0),
        coverage_score=getattr(report, "coverage_score", 0.0),
        traceability_score=getattr(report, "traceability_score", 0.0),
        consistency_score=getattr(report, "consistency_score", 0.0),
        missing_requirement_count=len(getattr(report, "missing_requirements", [])),
        unsupported_requirement_count=len(getattr(report, "unsupported_requirements", [])),
        contradiction_count=len(getattr(report, "contradictions", [])),
        outdated_source_count=len(getattr(report, "outdated_sources", [])),
        duplicate_count=len(getattr(report, "duplicates", [])),
        sequence_issue_count=len(getattr(report, "sequence_issues", [])),
        hallucination_count=len(getattr(report, "hallucinations", [])),
        final_status=getattr(report, "verification_status", ""),
    )

    final_status = getattr(report, "verification_status", "")
    requires_manual_review = final_status in ("Manual Review Required", "Partially Verified", "Incomplete")

    return ValidationResult(
        employee_id=employee_id,
        role=role,
        summary=summary,
        requirements=requirements,
        findings=findings,
        schema_errors=list(getattr(report, "schema_errors", [])),
        final_status=final_status,
        requires_manual_review=requires_manual_review,
    )
