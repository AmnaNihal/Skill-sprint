"""Tests for policy precedence and generation consistency."""
from genai_pipeline.consistency import compare_generations
from policy_management.precedence import document_rank, is_superseded, resolve_effective_document


def test_document_rank_order():
    assert document_rank("Information Security Policy") == 1
    assert document_rank("Engineering SOP") == 2
    assert document_rank("Employee FAQs") == 3
    assert document_rank("Training Notes") == 4
    assert document_rank(None) == 4


def test_resolve_prefers_active_newer_version():
    docs = [
        {"document_id": "DOC-1", "version": "1.0", "is_active": False, "category": "Policy"},
        {"document_id": "DOC-1", "version": "2.0", "is_active": True, "category": "Policy"},
    ]
    effective = resolve_effective_document(docs, "DOC-1")
    assert effective["version"] == "2.0"


def test_is_superseded():
    docs = [
        {"document_id": "DOC-1", "version": "2.0", "is_active": True, "category": "Policy"},
    ]
    assert is_superseded(docs, "DOC-1", "1.0") is True
    assert is_superseded(docs, "DOC-1", "2.0") is False


def _plan(req_ids):
    return {
        "modules": [
            {"module_id": f"M{i}", "requirement_ids": [rid], "source_document_id": "DOC-1", "assessment_topic": "T"}
            for i, rid in enumerate(req_ids, 1)
        ]
    }


def test_identical_generations_score_100():
    plan = _plan(["R1", "R2", "R3"])
    result = compare_generations(plan, plan)
    assert result["consistency_score"] == 100.0
    assert result["is_consistent"] is True


def test_missing_generation_is_detected():
    result = compare_generations(_plan(["R1", "R2", "R3"]), _plan(["R1", "R2"]))
    assert "R3" in result["missing_in_second"]
    assert result["consistency_score"] < 100.0
