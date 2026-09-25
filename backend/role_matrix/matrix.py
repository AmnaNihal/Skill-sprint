"""Role Requirement Matrix builder + AI-first requirement extraction (SRS Steps 10-11)."""
import json
import re
import uuid
from pathlib import Path

from config.settings import get_settings
from genai_pipeline.generator import _call_deepseek, _call_gemini_with_model_fallback, _extract_json

PROMPT_FILE = Path(__file__).resolve().parent.parent / "prompt_templates" / "requirement_extraction_v1.txt"

MANDATORY_PATTERNS = [
    r"\bmust\b", r"\bshall\b", r"\bis required to\b", r"\bare required to\b",
    r"\bmandatory\b", r"\brequired\b", r"\bonly authorized\b", r"\bforbidden\b",
    r"\bprohibited\b", r"\bbefore accessing\b", r"\bwithin \d+ (days|hours)\b",
]
RECOMMENDED_PATTERNS = [r"\bshould\b", r"\brecommended\b", r"\badvised\b"]
OPTIONAL_PATTERNS = [r"\bmay\b", r"\boptional\b", r"\bconsider\b", r"\bwhere applicable\b"]

REQ_TYPE_MAP = {
    "must know": "Must Know",
    "must complete": "Must Complete",
    "must demonstrate": "Must Demonstrate",
    "must acknowledge": "Must Acknowledge",
    "recommended": "Recommended",
    "optional": "Optional",
}


def classify_requirement(sentence: str) -> tuple[str, bool]:
    low = sentence.lower()
    if any(re.search(p, low) for p in [r"\bmust know\b", r"\baware of\b", r"\bunderstand\b"]):
        return "Must Know", True
    if any(re.search(p, low) for p in [r"\bmust complete\b", r"\bmust finish\b", r"\bcomplete the\b"]):
        return "Must Complete", True
    if any(re.search(p, low) for p in [r"\bmust demonstrate\b", r"\bdemonstrate\b", r"\bshow proficiency\b"]):
        return "Must Demonstrate", True
    if any(re.search(p, low) for p in [r"\bmust acknowledge\b", r"\backnowledge\b", r"\bsign the\b"]):
        return "Must Acknowledge", True
    if any(re.search(p, low) for p in RECOMMENDED_PATTERNS):
        return "Recommended", False
    if any(re.search(p, low) for p in OPTIONAL_PATTERNS):
        return "Optional", False
    if any(re.search(p, low) for p in MANDATORY_PATTERNS):
        return "Must Complete", True
    return "Optional", False


def _priority_for(req_type: str, mandatory: bool) -> str:
    if mandatory and req_type in ("Must Complete", "Must Know", "Must Demonstrate"):
        return "Critical" if "security" in req_type.lower() else "High"
    if mandatory:
        return "High"
    if req_type == "Recommended":
        return "Medium"
    return "Low"


def _due_stage_for(index: int, mandatory: bool) -> str:
    if index < 3 and mandatory:
        return "Day 1"
    if index < 8:
        return "Week 1"
    if index < 15:
        return "Week 2"
    if index < 25:
        return "First 30 Days"
    if index < 35:
        return "First 60 Days"
    return "First 90 Days"


def extract_requirements_with_ai(
    document_id: str,
    title: str,
    sections: list,
    role_hints: list[str] | None = None,
) -> tuple[list[dict], dict]:
    """Read every parsed section and return source-cited AI requirement suggestions."""
    settings = get_settings()
    role_hints = role_hints or []
    source_sections = [
        {
            "source_section_id": getattr(section, "section_id", None) or section.get("section_id", ""),
            "heading": getattr(section, "heading", None) or section.get("heading", ""),
            "content": getattr(section, "content", None) or section.get("content", ""),
        }
        for section in sections
    ]
    template = PROMPT_FILE.read_text(encoding="utf-8")
    system = template.split("USER:", 1)[0].replace("SYSTEM:", "").strip()
    user = template.split("USER:", 1)[-1]
    user = user.replace("{{document_id}}", document_id)
    user = user.replace("{{title}}", title)
    user = user.replace("{{role_hints}}", json.dumps(role_hints))
    user = user.replace("{{source_sections}}", json.dumps(source_sections, ensure_ascii=False))

    provider = (settings.ai_provider or "deepseek").lower()
    if provider == "deepseek" and settings.deepseek_api_key:
        raw = _call_deepseek(system, user, settings.deepseek_model, settings.deepseek_api_key)
        model = settings.deepseek_model
    elif provider == "gemini" and settings.gemini_api_key:
        raw, model = _call_gemini_with_model_fallback(system, user, settings.gemini_api_key, [])
    else:
        raise RuntimeError(f"No configured AI provider for requirement extraction ({provider})")

    data = _extract_json(raw)
    if isinstance(data, dict):
        data = data.get("requirements") or data.get("items") or []
    if not isinstance(data, list):
        raise RuntimeError("AI requirement extraction did not return an array")

    section_ids = {str(section["source_section_id"]) for section in source_sections}
    allowed_roles = {"All Roles", *role_hints}
    extracted: list[dict] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        description = str(item.get("description") or item.get("title") or "").strip()
        source_section_id = str(item.get("source_section_id") or "")
        # A single-section document has an unambiguous safe citation even when a
        # provider returns the section heading instead of its stored ID.
        if source_section_id not in section_ids and len(section_ids) == 1:
            source_section_id = next(iter(section_ids))
        if not description or source_section_id not in section_ids:
            continue
        role = str(item.get("role") or "All Roles")
        if role not in allowed_roles:
            role = "All Roles"
        req_type = str(item.get("requirement_type") or "Must Know")
        mandatory = bool(item.get("mandatory", req_type.startswith("Must")))
        extracted.append(
            {
                "id": f"R{len(extracted) + 1:03d}",
                "role_title": role,
                "requirement_type": req_type,
                "mandatory": mandatory,
                "priority": item.get("priority") or _priority_for(req_type, mandatory),
                "due_stage": item.get("due_stage") or _due_stage_for(len(extracted), mandatory),
                "title": str(item.get("title") or description)[:120],
                "description": description[:1000],
                "competency": str(item.get("competency") or "General"),
                "assessment_topic": str(item.get("assessment_topic") or item.get("competency") or ""),
                "source_document_id": document_id,
                "source_section_id": source_section_id,
            }
        )
    if not extracted:
        raise RuntimeError("AI requirement extraction returned no valid source-cited requirements")
    return extracted, {"provider": provider, "model": model, "sections_read": len(source_sections)}


def extract_requirements(
    document_id: str,
    title: str,
    sections: list,  # list[ParsedSection] or dicts with section_id/heading/content
    role_hints: list[str] | None = None,
) -> list[dict]:
    """Extract policy/process requirements from parsed sections into matrix rows."""
    results: list[dict] = []
    counter = 1
    role_hints = role_hints or []

    for sec in sections:
        sec_id = getattr(sec, "section_id", None) or sec.get("section_id", "")
        heading = getattr(sec, "heading", None) or sec.get("heading", "")
        content = getattr(sec, "content", None) or sec.get("content", "")

        # Split into sentences-ish
        sentences = re.split(r"(?<=[.!?])\s+|\n+", content)
        for raw in sentences:
            s = raw.strip()
            if len(s) < 25 or len(s) > 400:
                continue
            if not re.search(r"\b(must|shall|should|required|mandatory|prohibited|only|may|acknowledge|complete|demonstrate)\b", s, re.I):
                continue

            req_type, mandatory = classify_requirement(s)
            if req_type == "Optional" and not re.search(r"\b(must|shall|required|mandatory)\b", s, re.I):
                # keep only clearly requirement-like optional items
                if not re.search(r"\b(should|may|recommended)\b", s, re.I):
                    continue

            role = _match_role(s, role_hints) or "General"
            rid = f"R{counter:03d}"
            counter += 1
            results.append(
                {
                    "id": rid,
                    "role_title": role if role != "General" else (role_hints[0] if role_hints else "All Roles"),
                    "requirement_type": req_type,
                    "mandatory": mandatory,
                    "priority": _priority_for(req_type, mandatory),
                    "due_stage": _due_stage_for(len(results), mandatory),
                    "title": s[:120],
                    "description": s,
                    "competency": heading,
                    "policy_requirement": s if mandatory else "",
                    "process_requirement": "" if mandatory else s,
                    "assessment_topic": heading,
                    "source_document_id": document_id,
                    "source_section_id": sec_id,
                    "category": heading or title,
                }
            )
    return results


def _match_role(text: str, role_hints: list[str]) -> str | None:
    low = text.lower()
    for r in role_hints:
        if r and r.lower() in low:
            return r
    return None


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
