"""Tests for the AI document intake gate."""
import document_validation.ai_document_gate as gate
from document_validation.ai_document_gate import assess_company_document

GOOD = (
    "Nexora Technologies Information Security Policy. All employees must use unique credentials "
    "and must not share passwords. Security incidents must be reported to the security team within "
    "one hour of discovery. Access reviews are completed quarterly by system owners. Confidential "
    "information must only be shared through approved channels."
)


def test_deterministic_rejection_skips_ai(monkeypatch):
    calls = {"n": 0}

    def fake(*args, **kwargs):
        calls["n"] += 1
        return '{"is_company_document": true}'

    monkeypatch.setattr(gate, "_call_deepseek", fake)
    result = assess_company_document("Lorem ipsum dolor sit amet consectetur adipiscing elit sed.")
    assert result["accepted"] is False
    assert result["provider"] == "deterministic"
    assert calls["n"] == 0, "AI must not be called when deterministic checks already fail"


def test_ai_accepts_company_document(monkeypatch):
    monkeypatch.setattr(
        gate,
        "_call_deepseek",
        lambda *a, **k: '{"is_company_document": true, "document_type": "policy", "confidence": 0.92, "reason": "real policy"}',
    )
    result = assess_company_document(GOOD, "Information Security Policy")
    assert result["accepted"] is True
    assert result["document_type"] == "policy"


def test_ai_rejects_non_company_document(monkeypatch):
    monkeypatch.setattr(
        gate,
        "_call_deepseek",
        lambda *a, **k: '{"is_company_document": false, "confidence": 0.8, "reason": "marketing fluff"}',
    )
    result = assess_company_document(GOOD, "Blog post")
    assert result["accepted"] is False
    assert "marketing" in result["reason"]


def test_ai_failure_falls_back_to_accept(monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("quota exceeded")

    monkeypatch.setattr(gate, "_call_deepseek", boom)
    result = assess_company_document(GOOD, "Policy")
    assert result["accepted"] is True
    assert result["provider"] == "fallback"
