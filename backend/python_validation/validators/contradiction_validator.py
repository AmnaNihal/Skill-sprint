"""Pipeline 2 contradiction validation step (wraps contradiction_checks)."""
from __future__ import annotations


def validate_contradictions(plan: dict, all_requirements: list[dict], applicable_requirements: list[dict]) -> list[str]:
    from contradiction_checks.detector import detect_contradictions

    return detect_contradictions(plan, all_requirements, applicable_requirements)
