"""Tests for Pipeline 2 version, structure, and comparison validators."""
from types import SimpleNamespace

from comparison_engine.field_comparator import compare_requirement
from python_validation.validators.structure_validators import (
    validate_assessments,
    validate_checklists,
    validate_quizzes,
    validate_tasks,
)
from python_validation.validators.version_validator import validate_versions


# ---------- version validator ----------

def test_outdated_source_detected():
    ctx = SimpleNamespace(
        active_version_by_doc={"DOC-1": "2.0"},
        all_requirements=(
            {"requirement_id": "R1", "source_document_id": "DOC-1", "source_document_version": "1.0"},
        ),
    )
    plan = {"modules": [{"module_id": "M1", "requirement_ids": ["R1"], "requirement_id": "R1"}]}
    outdated, findings = validate_versions(plan, ctx)
    assert outdated, "must flag superseded version"
    assert findings[0]["validation_status"] == "Outdated Source"


def test_current_version_ok():
    ctx = SimpleNamespace(
        active_version_by_doc={"DOC-1": "2.0"},
        all_requirements=(
            {"requirement_id": "R1", "source_document_id": "DOC-1", "source_document_version": "2.0"},
        ),
    )
    plan = {"modules": [{"module_id": "M1", "requirement_ids": ["R1"]}]}
    outdated, findings = validate_versions(plan, ctx)
    assert outdated == [] and findings == []


# ---------- structure validators ----------

def test_checklist_invalid_stage_and_missing_activity():
    plan = {"modules": [{"module_id": "M1", "checklist": [{"activity": "", "due_stage": "Someday"}]}]}
    findings = validate_checklists(plan)
    assert any(f["field_name"] == "checklist_activity" for f in findings)
    assert any(f["validation_status"] == "Sequence Error" for f in findings)


def test_task_missing_source_and_title():
    plan = {"modules": [{"module_id": "M1", "tasks": [{"title": "", "source_document_id": ""}]}]}
    findings = validate_tasks(plan, "Software Engineer")
    assert any(f["field_name"] == "task_title" for f in findings)
    assert any(f["validation_status"] == "Source Support Missing" for f in findings)


def test_practical_assessment_requires_rubric():
    plan = {"modules": [{"module_id": "M1", "assessments": [
        {"title": "Refund handling", "assessment_type": "Practical", "rubric": []}
    ]}]}
    findings = validate_assessments(plan)
    assert any(f["field_name"] == "assessment_rubric" for f in findings)


def test_quiz_answer_out_of_range():
    plan = {"modules": [{"module_id": "M1", "quiz": [
        {"question": "Q?", "options": ["a", "b"], "correct_answer": [5], "source_document_id": "DOC-1"}
    ]}]}
    findings = validate_quizzes(plan)
    assert any(f["field_name"] == "quiz_answer" for f in findings)


def test_clean_structure_has_no_findings():
    plan = {"modules": [{
        "module_id": "M1",
        "checklist": [{"activity": "Read policy", "due_stage": "Week 1"}],
        "tasks": [{"title": "Do task", "source_document_id": "DOC-1", "difficulty": "Beginner"}],
        "assessments": [{"title": "Knowledge check", "assessment_type": "Knowledge", "source_document_id": "DOC-1"}],
        "quiz": [{"question": "Q?", "options": ["a", "b"], "correct_answer": [0], "source_document_id": "DOC-1"}],
    }]}
    assert validate_checklists(plan) == []
    assert validate_tasks(plan) == []
    assert validate_assessments(plan) == []
    assert validate_quizzes(plan) == []


# ---------- comparison field comparator ----------

def test_field_comparator_match_and_mismatch():
    expected = {"requirement_id": "R1", "role": "Software Engineer", "mandatory": True,
                "priority": "High", "source_document_id": "DOC-1", "source_section_id": "4.2"}
    generated = {"requirement_id": "R1", "role": "Software Engineer", "mandatory": True,
                 "priority": "High", "source_document_id": "DOC-1", "source_section_id": "4.3"}
    rows = compare_requirement(expected, generated, role="Software Engineer")
    by_field = {r.field_name: r for r in rows}
    assert by_field["requirement_id"].match is True
    assert by_field["source_section_id"].match is False
    assert by_field["source_section_id"].result == "Mismatch"
