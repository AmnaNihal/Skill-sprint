"""Tests for Pipeline 2: deterministic validation + contradiction detection."""
from contradiction_checks.detector import detect_contradictions
from python_validation.engine import validate_plan

REQS = [
    {
        "requirement_id": "R1",
        "role": "Software Engineer",
        "requirement": "Review code before merge",
        "mandatory": True,
        "due_stage": "Day 1",
        "source_document_id": "DOC-1",
        "source_section_id": "S1",
    },
    {
        "requirement_id": "R2",
        "role": "Software Engineer",
        "requirement": "Write automated tests",
        "mandatory": True,
        "due_stage": "Week 1",
        "source_document_id": "DOC-1",
        "source_section_id": "S1",
    },
]


def _module(module_id="M1", req_ids=None, source="DOC-1", mandatory=True, due_stage="Day 1"):
    return {
        "module_id": module_id,
        "module_title": f"Module {module_id}",
        "role": "Software Engineer",
        "mandatory": mandatory,
        "due_stage": due_stage,
        "source_document_id": source,
        "source_section_id": "S1",
        "requirement_ids": req_ids or [],
        "tasks": [{"title": f"Task {module_id}", "source_document_id": source}],
        "quiz": [],
    }


def test_missing_mandatory_reduces_coverage():
    plan = {"role": "Software Engineer", "modules": [_module(req_ids=["R1"])]}
    report = validate_plan(plan, REQS, {"DOC-1"}, role_title="Software Engineer")
    assert report.mandatory_total == 2
    assert report.mandatory_covered == 1
    assert report.coverage_score == 50.0
    assert "R2" in report.missing_requirements


def test_full_coverage_is_verified():
    plan = {"role": "Software Engineer", "modules": [_module("M1", ["R1"], due_stage="Day 1"), _module("M2", ["R2"], due_stage="Week 1")]}
    report = validate_plan(plan, REQS, {"DOC-1"}, role_title="Software Engineer")
    assert report.coverage_score == 100.0
    assert report.verification_status in ("Verified", "Verified with Warning")


def test_missing_source_flags_hallucination():
    plan = {"role": "Software Engineer", "modules": [_module(req_ids=["R1"], source="")]}
    report = validate_plan(plan, REQS, {"DOC-1"}, role_title="Software Engineer")
    assert report.hallucinations


def test_contradiction_ignores_rule_restatement():
    plan = {
        "modules": [
            {
                "module_id": "M1",
                "requirement_ids": ["R1"],
                "due_stage": "Day 1",
                "mandatory": True,
                "tasks": [
                    {
                        "title": "Study password policy",
                        "description": "Employees must use individual passwords and must not share them.",
                    }
                ],
            }
        ]
    }
    requirements = [
        {
            "requirement_id": "R1",
            "requirement": "Employees must use individual passwords and must not share them.",
            "description": "Employees must use individual passwords and must not share them.",
            "mandatory": True,
        }
    ]
    issues = detect_contradictions(plan, requirements, requirements)
    assert issues == [], f"rule restatement should not be a contradiction: {issues}"


def test_contradiction_flags_delayed_day1_requirement():
    plan = {"modules": [{"module_id": "M1", "requirement_ids": ["R1"], "due_stage": "First 30 Days", "mandatory": True, "tasks": []}]}
    requirements = [{"requirement_id": "R1", "requirement": "x", "description": "x", "mandatory": True, "due_stage": "Day 1"}]
    issues = detect_contradictions(plan, requirements, requirements)
    assert any("R1" in i for i in issues)
