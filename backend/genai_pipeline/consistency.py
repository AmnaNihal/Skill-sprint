"""GenAI generation consistency comparison (SRS consistency testing).

Compares two generations of the same plan using structured fields only (requirement IDs,
source documents, assessment topics) rather than natural-language wording.
"""
from __future__ import annotations

from typing import Any

WEIGHTS = {"requirements": 0.5, "sources": 0.3, "topics": 0.2}


def _requirement_ids(plan: dict[str, Any]) -> set[str]:
    ids: set[str] = set()
    for module in plan.get("modules") or []:
        for rid in module.get("requirement_ids") or []:
            if rid:
                ids.add(str(rid))
        if module.get("requirement_id"):
            ids.add(str(module["requirement_id"]))
    return ids


def _sources(plan: dict[str, Any]) -> set[str]:
    return {
        str(m.get("source_document_id"))
        for m in plan.get("modules") or []
        if m.get("source_document_id")
    }


def _topics(plan: dict[str, Any]) -> set[str]:
    return {
        str(m.get("assessment_topic"))
        for m in plan.get("modules") or []
        if m.get("assessment_topic")
    }


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 100.0
    union = a | b
    if not union:
        return 100.0
    return round(len(a & b) / len(union) * 100, 2)


def compare_generations(plan_a: dict[str, Any], plan_b: dict[str, Any]) -> dict[str, Any]:
    req_a, req_b = _requirement_ids(plan_a), _requirement_ids(plan_b)
    src_a, src_b = _sources(plan_a), _sources(plan_b)
    top_a, top_b = _topics(plan_a), _topics(plan_b)

    scores = {
        "requirements": _jaccard(req_a, req_b),
        "sources": _jaccard(src_a, src_b),
        "topics": _jaccard(top_a, top_b),
    }
    consistency_score = round(sum(scores[k] * WEIGHTS[k] for k in WEIGHTS), 2)

    missing = sorted(req_a - req_b)
    extra = sorted(req_b - req_a)
    return {
        "consistency_score": consistency_score,
        "component_scores": scores,
        "weights": WEIGHTS,
        "requirements_a": len(req_a),
        "requirements_b": len(req_b),
        "missing_in_second": missing,
        "extra_in_second": extra,
        "sources_a": sorted(src_a),
        "sources_b": sorted(src_b),
        "is_consistent": consistency_score >= 90.0 and not missing,
    }
