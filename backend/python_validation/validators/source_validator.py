"""Source traceability + validity validation (SRS §11/§12)."""
from __future__ import annotations


def validate_sources(items: list[dict], active_document_ids: set[str] | None) -> tuple[int, list[dict], list[str], list[str]]:
    """Return (valid_items, findings, hallucinations, unsupported_requirement_ids)."""
    active_document_ids = active_document_ids or set()
    valid_items = 0
    findings: list[dict] = []
    hallucinations: list[str] = []
    unsupported: list[str] = []

    for item in items:
        sid = item["source_document_id"]
        if not sid:
            findings.append(
                {
                    "requirement_id": str(item.get("requirement_ids") or "-"),
                    "field_name": "source_traceability",
                    "genai_value": "(none)",
                    "python_value": "source_document_id required",
                    "result": "Unsupported",
                    "validation_status": "Source Support Missing",
                    "detail": f"{item['kind']} has no source: {item.get('title')}",
                }
            )
            hallucinations.append(f"{item['kind']}: {item.get('title')} (no source)")
        elif active_document_ids and sid not in active_document_ids:
            findings.append(
                {
                    "requirement_id": str(item.get("requirement_ids") or "-"),
                    "field_name": "source_validity",
                    "genai_value": sid,
                    "python_value": "active document required",
                    "result": "Mismatch",
                    "validation_status": "Outdated Source",
                    "detail": f"{item['kind']} cites unknown/inactive doc {sid}",
                }
            )
            unsupported.append(str(item.get("requirement_ids") or item.get("title")))
        else:
            valid_items += 1

    return valid_items, findings, hallucinations, unsupported
