"""Scoring formulas for Pipeline 2 (deterministic, from stored data only)."""
from __future__ import annotations


def _pct(numerator: float, denominator: float, default: float = 100.0) -> float:
    if not denominator:
        return default
    return round(numerator / denominator * 100, 2)


def coverage_score(mandatory_covered: int, mandatory_total: int) -> float:
    """Coverage = Covered Mandatory Requirements / Total Mandatory Requirements x 100 (SRS)."""
    return _pct(mandatory_covered, mandatory_total)


def traceability_score(valid_items: int, total_items: int) -> float:
    """Traceability = Mandatory Generated Items With Valid Source / Total Mandatory Items x 100."""
    return _pct(valid_items, total_items)


def consistency_score(matches: int, total: int) -> float:
    """Requirement-level consistency = matched requirement findings / total x 100."""
    return _pct(matches, total)
