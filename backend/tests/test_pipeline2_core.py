"""Tests for Pipeline 2 core: scoring, status engine, result models, context builder."""
from python_validation import scoring
from python_validation.result_models import build_validation_result
from python_validation.status_engine import determine_final_status
from python_validation.validation_context import build_context


# ---------- scoring ----------

def test_coverage_full_and_partial():
    assert scoring.coverage_score(3, 3) == 100.0
    assert scoring.coverage_score(2, 3) == 66.67
    assert scoring.coverage_score(0, 0) == 100.0  # no mandatory requirements


def test_traceability_and_consistency():
    assert scoring.traceability_score(5, 5) == 100.0
    assert scoring.traceability_score(4, 5) == 80.0
    assert scoring.traceability_score(0, 0) == 100.0
    assert scoring.consistency_score(9, 10) == 90.0


# ---------- status engine ----------

def _status(**kwargs):
    base = dict(coverage_score=100.0, traceability_score=100.0)
    base.update(kwargs)
    return determine_final_status(**base)


def test_status_verified_only_when_all_clean():
    assert _status() == "Verified"


def test_status_verified_with_warning_for_duplicates_or_sequence():
    assert _status(duplicates=["dup"]) == "Verified with Warning"
    assert _status(sequence_issues=["seq"]) == "Verified with Warning"


def test_status_warning_when_traceability_below_100_but_above_90():
    assert _status(traceability_score=95.0) == "Verified with Warning"


def test_status_incomplete_when_missing_and_coverage_below_100():
    assert _status(coverage_score=66.67, missing_requirements=["R2"]) == "Incomplete"


def test_status_unsupported_when_unsupported_or_hallucination():
    assert _status(unsupported_requirements=["R99"]) == "Unsupported"
    assert _status(hallucinations=["made up rule"]) == "Unsupported"


def test_status_outdated_source():
    assert _status(outdated_sources=["DOC-1 v1 < v2"]) == "Outdated Source"


def test_status_contradiction_wins():
    assert _status(contradictions=["conflict"]) == "Contradiction Detected"


def test_status_manual_review_on_schema_errors():
    assert _status(schema_errors=["bad field"]) == "Manual Review Required"


def test_status_manual_review_when_low_coverage_and_traceability():
    assert _status(coverage_score=50.0, traceability_score=50.0) == "Manual Review Required"


# ---------- result models (security: ignore plan-supplied status) ----------

class _Finding:
    def __init__(self, **kw):
        self.requirement_id = kw.get("requirement_id")
        self.field_name = kw.get("field_name", "")
        self.genai_value = kw.get("genai_value", "")
        self.python_value = kw.get("python_value", "")
        self.result = kw.get("result", "Match")
        self.validation_status = kw.get("validation_status", "")
        self.detail = kw.get("detail", "")


class _Report:
    def __init__(self):
        self.findings = [
            _Finding(requirement_id="R1", field_name="mandatory_coverage", result="Match", validation_status="Verified"),
            _Finding(requirement_id="R2", field_name="mandatory_coverage", result="Missing", validation_status="Requirement Missing"),
        ]
        self.mandatory_total = 2
        self.mandatory_covered = 1
        self.missing_requirements = ["R2"]
        self.unsupported_requirements = ["R99"]
        self.contradictions = []
        self.duplicates = []
        self.sequence_issues = []
        self.hallucinations = []
        self.outdated_sources = []
        self.schema_errors = []
        self.coverage_score = 50.0
        self.traceability_score = 100.0
        self.consistency_score = 50.0
        self.verification_status = "Partially Verified"


def test_build_validation_result_shape_and_security():
    plan = {
        "role": "Customer Support Executive",
        # malicious fields that must be ignored
        "validation_status": "Verified",
        "coverage_score": 100,
        "modules": [{"module_id": "M1", "requirement_ids": ["R1"]}],
    }
    result = build_validation_result(_Report(), plan, role="Customer Support Executive")
    assert result.final_status == "Partially Verified"
    assert result.summary.coverage_score == 50.0  # from report, not the plan's 100
    assert result.summary.missing_requirement_count == 1
    assert result.summary.unsupported_requirement_count == 1
    assert {r.requirement_id for r in result.requirements} == {"R1", "R2", "R99"}
    r99 = next(r for r in result.requirements if r.requirement_id == "R99")
    assert r99.expected is False and r99.validation_status == "Unsupported Requirement"
    assert result.requires_manual_review is True


# ---------- context builder ----------

class _Res:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, data):
        self._data = data

    def select(self, *a, **k):
        return self

    def execute(self):
        return _Res(self._data)


class _FakeSB:
    def __init__(self, data):
        self._data = data

    def table(self, name):
        return _Query(self._data.get(name, []))


def test_build_context_filters_and_indexes():
    sb = _FakeSB(
        {
            "role_requirements": [
                {"requirement_id": "R1", "role": "Software Engineer", "mandatory": True, "approval_status": "Approved"},
                {"requirement_id": "R2", "role": "Software Engineer", "mandatory": True, "approval_status": "Superseded"},
                {"requirement_id": "R9", "role": "Finance Associate", "mandatory": True, "approval_status": "Approved"},
                {"requirement_id": "R8", "role": "All Roles", "mandatory": True, "approval_status": "Approved"},
            ],
            "documents": [
                {"document_id": "DOC-1", "is_active": True, "is_quarantined": False, "version": "2.0"},
                {"document_id": "DOC-1", "is_active": False, "is_quarantined": False, "version": "1.0"},
                {"document_id": "DOC-2", "is_active": False, "is_quarantined": False, "version": "1.0"},
            ],
            "document_chunks": [
                {"document_id": "DOC-1", "section_id": "S1", "chunk_id": "C1"},
                {"document_id": "DOC-1", "section_id": "S2", "chunk_id": "C2"},
            ],
        }
    )
    ctx = build_context("Software Engineer", sb=sb)
    assert {r["requirement_id"] for r in ctx.applicable_requirements} == {"R1", "R8"}
    assert ctx.active_document_ids == frozenset({"DOC-1"})
    assert ctx.sections_by_doc["DOC-1"] == frozenset({"S1", "S2"})
    assert ctx.active_version_by_doc["DOC-1"] == "2.0"
    assert ctx.chunk_by_doc_section[("DOC-1", "S1")] == "C1"
    assert ctx.precedence_rules, "precedence rules must be loaded from config"
