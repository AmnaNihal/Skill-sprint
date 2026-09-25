"""Compare GenAI output vs Python ground-truth expected results (SRS Step 46)."""
from typing import Any

from python_validation.engine import ValidationReport


def compare_results(report: ValidationReport, plan: dict[str, Any]) -> list[dict]:
    """Requirement-level comparison rows for the UI/report."""
    rows: list[dict] = []
    for f in report.findings:
        rows.append(
            {
                "requirement_id": f.requirement_id,
                "role": plan.get("role", ""),
                "field_name": f.field_name,
                "genai_value": f.genai_value,
                "python_value": f.python_value,
                "match": f.result == "Match",
                "result": f.result,
                "validation_status": f.validation_status,
                "detail": f.detail,
            }
        )
    return rows


def summary(report: ValidationReport) -> dict[str, Any]:
    status_counts: dict[str, int] = {}
    for f in report.findings:
        status_counts[f.validation_status] = status_counts.get(f.validation_status, 0) + 1
    return {
        "coverage_score": report.coverage_score,
        "traceability_score": report.traceability_score,
        "consistency_score": report.consistency_score,
        "missing_count": len(report.missing_requirements),
        "unsupported_count": len(report.unsupported_requirements),
        "contradiction_count": len(report.contradictions),
        "duplicate_count": len(report.duplicates),
        "sequence_issue_count": len(report.sequence_issues),
        "hallucination_count": len(report.hallucinations),
        "verification_status": report.verification_status,
        "status_counts": status_counts,
        "mandatory_total": report.mandatory_total,
        "mandatory_covered": report.mandatory_covered,
    }
