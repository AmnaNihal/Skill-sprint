"""Contradiction detection between GenAI plan, ground truth, and policies."""
import re
from typing import Any

_PROHIBITION_RE = re.compile(r"\b(?:must|shall|may)\s+not\b|\b(?:prohibited|forbidden)\b", re.IGNORECASE)


def detect_contradictions(
    plan: dict[str, Any],
    all_requirements: list[dict],
    applicable_requirements: list[dict],
) -> list[str]:
    issues: list[str] = []

    # 1) Plan marks something optional/non-mandatory while matrix says mandatory
    matrix_mandatory = {
        (r.get("id") or r.get("requirement_id")): r for r in applicable_requirements if r.get("mandatory")
    }
    modules = plan.get("modules") or []
    for m in modules:
        for rid in m.get("requirement_ids") or []:
            if rid in matrix_mandatory and not m.get("mandatory"):
                issues.append(
                    f"Module {m.get('module_id')} covers mandatory req {rid} but marked optional"
                )

    # 2) Priority conflicts: plan due_stage earlier/contradicts matrix due_stage for same req
    matrix_stage = {
        (r.get("id") or r.get("requirement_id")): (r.get("due_stage") or "")
        for r in applicable_requirements
    }
    stages_order = ["Day 1", "Week 1", "Week 2", "First 30 Days", "First 60 Days", "First 90 Days"]
    for m in modules:
        for rid in m.get("requirement_ids") or []:
            expected = matrix_stage.get(rid)
            actual = m.get("due_stage") or ""
            if expected and actual and expected in stages_order and actual in stages_order:
                # flag only if plan delays a Day-1 requirement significantly? keep as warning if mismatch on Day 1
                if expected == "Day 1" and actual not in ("Day 1", "Week 1"):
                    issues.append(
                        f"Req {rid} due {expected} in matrix but module {m.get('module_id')} schedules {actual}"
                    )

    # 3) Quiz/task text conflicting with mandatory prohibition keywords in source-linked req text
    for m in modules:
        tasks = m.get("tasks") or []
        for t in tasks:
            if isinstance(t, str):
                text = t.lower()
            else:
                text = (t.get("title", "") + " " + t.get("description", "")).lower()
            for r in applicable_requirements:
                if not r.get("mandatory"):
                    continue
                desc = (r.get("description") or r.get("requirement") or "").lower()
                if _PROHIBITION_RE.search(desc):
                    # extract object phrases with word boundaries (avoid "must not" matching "must notify")
                    matches = list(re.finditer(r"\b(?:must|shall)\s+not\b", desc))
                    forbidden = matches[-1].group(0) if matches else ""
                    if matches:
                        forbidden = desc[matches[-1].end():][:60].strip()
                    if forbidden and forbidden[:20] in text:
                        title = t if isinstance(t, str) else t.get("title")
                        issues.append(
                            f"Task '{title}' may violate mandatory rule: "
                            f"{r.get('title') or r.get('requirement')}"
                        )

    # de-dup
    seen = set()
    out = []
    for i in issues:
        if i not in seen:
            seen.add(i)
            out.append(i)
    return out
