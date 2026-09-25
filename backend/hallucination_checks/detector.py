"""Hallucination detection: generated claims without source support (SRS Step 31-32)."""
from typing import Any


def flag_unsupported(plan: dict[str, Any], active_doc_ids: set[str]) -> list[dict]:
    flags: list[dict] = []
    for m in plan.get("modules") or []:
        if not m.get("source_document_id"):
            flags.append({"item": m.get("module_id"), "reason": "module_missing_source", "severity": "High"})
        elif active_doc_ids and m["source_document_id"] not in active_doc_ids:
            flags.append(
                {
                    "item": m.get("module_id"),
                    "reason": f"unknown_source:{m['source_document_id']}",
                    "severity": "High",
                }
            )
        for t in m.get("tasks") or []:
            if isinstance(t, str):
                continue
            if not t.get("source_document_id"):
                flags.append({"item": t.get("title"), "reason": "task_missing_source", "severity": "Medium"})
        for q in m.get("quiz") or []:
            if not isinstance(q, dict):
                continue
            if not q.get("source_document_id"):
                flags.append({"item": q.get("question", "")[:60], "reason": "quiz_missing_source", "severity": "Medium"})
            elif active_doc_ids and q["source_document_id"] not in active_doc_ids:
                flags.append(
                    {
                        "item": q.get("question", "")[:60],
                        "reason": f"unknown_source:{q['source_document_id']}",
                        "severity": "High",
                    }
                )
    return flags


def is_insufficient_source(topic: str, source_texts: list[str]) -> bool:
    """Return True if topic tokens barely appear in provided sources (refuse to invent)."""
    if not source_texts:
        return True
    tokens = [t for t in topic.lower().split() if len(t) > 3]
    if not tokens:
        return False
    blob = " ".join(source_texts).lower()
    hits = sum(1 for t in tokens if t in blob)
    return hits / len(tokens) < 0.34
