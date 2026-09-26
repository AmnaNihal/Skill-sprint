"""AI intake gate: accept only genuine company documents; auto-reject the rest.

Two layers:
1. Deterministic content-quality checks (empty / lorem / placeholder / too short).
2. A DeepSeek (or configured provider) classification that the text is a real company
   document (policy / SOP / handbook / role description / process / FAQ / compliance).

If the AI provider is unavailable the deterministic result is used so a genuine upload is
never blocked by an outage.
"""
from __future__ import annotations

from config.settings import get_settings
from document_validation.content_quality import find_quality_issues
from genai_pipeline.generator import (
    _call_deepseek,
    _call_gemini_with_model_fallback,
    _extract_json,
)

SYSTEM_PROMPT = (
    "You are a strict document intake validator for a corporate employee-onboarding system. "
    "Decide whether the text is a genuine COMPANY INTERNAL document (policy, SOP, employee "
    "handbook, HR/security/privacy/conduct policy, role description, process/procedure, "
    "compliance instruction, FAQ, escalation procedure, department guideline) that contains "
    "concrete, company-specific requirements or procedures. "
    "REJECT anything that is: lorem ipsum, placeholder/sample/dummy text, a personal note, "
    "sales/marketing fluff, a generic blog article, a random snippet, gibberish, or text with "
    "no real organizational policy/procedure content. "
    "Return ONLY JSON with these keys: "
    '{"is_company_document": true|false, '
    '"document_type": "short type e.g. Information Security Policy", '
    '"title": "concise document title", '
    '"category": "one of: Architecture, Security, DevOps, Data, Company Policy, Human Resources, Compliance, General", '
    '"department": "owning department e.g. Engineering, HR, Finance, Information Security", '
    '"version": "version string like 1.0", '
    '"confidence": 0.0-1.0, '
    '"reason": "short reason"}'
)


def assess_company_document(text: str, title: str = "") -> dict:
    """Return {accepted, reason, provider, document_type, confidence}."""
    issues = find_quality_issues(text)
    if issues:
        return {
            "accepted": False,
            "reason": "; ".join(issues),
            "provider": "deterministic",
            "document_type": "",
            "title": "",
            "category": "",
            "department": "",
            "version": "",
            "confidence": 1.0,
        }

    settings = get_settings()
    provider = (settings.ai_provider or "deepseek").lower()
    user_prompt = f"Document title: {title or '(none)'}\n\nDocument text:\n{text[:6000]}\n\nClassify now."

    try:
        if provider == "gemini" and settings.gemini_api_key:
            raw, model = _call_gemini_with_model_fallback(SYSTEM_PROMPT, user_prompt, settings.gemini_api_key, [])
        elif settings.deepseek_api_key:
            raw = _call_deepseek(SYSTEM_PROMPT, user_prompt, settings.deepseek_model, settings.deepseek_api_key)
            model = settings.deepseek_model
        else:
            return {
                "accepted": True,
                "reason": "AI gate unavailable; deterministic checks passed",
                "provider": "none",
                "document_type": "",
                "title": "",
                "category": "",
                "department": "",
                "version": "",
                "confidence": 0.0,
            }

        data = _extract_json(raw)
        if not isinstance(data, dict):
            raise ValueError("AI gate returned non-object JSON")
        accepted = bool(data.get("is_company_document", True))
        return {
            "accepted": accepted,
            "reason": str(data.get("reason") or ""),
            "provider": provider,
            "model": model,
            "document_type": str(data.get("document_type") or ""),
            "title": str(data.get("title") or ""),
            "category": str(data.get("category") or ""),
            "department": str(data.get("department") or ""),
            "version": str(data.get("version") or ""),
            "confidence": float(data.get("confidence") or 0.0),
        }
    except Exception as exc:  # noqa: BLE001
        # Never block a genuine upload because the AI gate failed.
        return {
            "accepted": True,
            "reason": f"AI gate skipped ({str(exc)[:120]}); deterministic checks passed",
            "provider": "fallback",
            "document_type": "",
            "title": "",
            "category": "",
            "department": "",
            "version": "",
            "confidence": 0.0,
        }
