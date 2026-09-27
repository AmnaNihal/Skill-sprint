"""Tests for onboarding plan structural requirements (SRS: modules, stages, checklists, grounding)."""
from genai_pipeline.generator import fallback_plan
from genai_pipeline.schema_validator import validate_genai_payload


def _req(i, stage=None):
    return {
        "requirement_id": f"R{i:03d}",
        "requirement": f"Requirement {i}",
        "description": f"Requirement {i} details",
        "role": "Software Engineer",
        "mandatory": True,
        "priority": "High",
        "due_stage": stage or "Week 1",
        "assessment_topic": f"Topic {i}",
        "source_document_id": "DOC-1",
        "source_section_id": "S1",
        "source_chunk_id": "C1",
        "competency": "Engineering",
    }


BLOCK = {
    "source_document_id": "DOC-1",
    "source_section_id": "S1",
    "source_chunk_id": "C1",
    "heading": "Engineering",
    "content": "Engineering policy content.",
}


def test_module_has_required_fields():
    res = fallback_plan("A", "Software Engineer", "Eng", "Beginner", "30 Days", [_req(1)], [BLOCK])
    module = res["plan"]["modules"][0]
    for field in (
        "module_title", "purpose", "learning_objectives", "learning_activities",
        "key_concepts", "source_document_id", "source_section_id", "estimated_hours",
        "tasks", "assessments", "assessment_topic", "completion_criteria", "due_stage",
    ):
        assert field in module, f"module missing {field}"
    assert module["learning_objectives"] and module["learning_activities"]


def test_checklist_items_have_all_fields():
    res = fallback_plan("A", "Software Engineer", "Eng", "Beginner", "30 Days", [_req(1)], [BLOCK])
    items = res["plan"]["modules"][0]["checklist"]
    assert items, "module must generate at least one checklist item"
    for item in items:
        for field in ("activity", "mandatory", "due_stage", "source_document_id", "responsible_person", "completed"):
            assert field in item, f"checklist item missing {field}"
        assert item["source_document_id"]


def test_every_module_is_source_grounded():
    res = fallback_plan("A", "Software Engineer", "Eng", "Beginner", "30 Days", [_req(i) for i in range(1, 5)], [BLOCK])
    for module in res["plan"]["modules"]:
        assert module["source_document_id"], "module must cite a source document"
        assert module["source_section_id"], "module must cite a source section"
    assert validate_genai_payload(res["plan"]) == []


def test_stages_are_distributed_not_all_day_one():
    reqs = []
    for i in range(1, 10):
        r = _req(i)
        r.pop("due_stage", None)  # let the planner distribute by sequencing
        reqs.append(r)
    res = fallback_plan("A", "Software Engineer", "Eng", "Beginner", "90 Days", reqs, [BLOCK])
    stages = {m["due_stage"] for m in res["plan"]["modules"]}
    assert len(stages) > 1, f"requirements must be distributed across stages, got {stages}"
    assert "Day 1" in stages


def test_role_specific_module_role():
    res = fallback_plan("A", "Finance Associate", "Finance", "Beginner", "30 Days", [_req(1)], [BLOCK])
    assert res["plan"]["modules"][0]["role"] == "Finance Associate"


def _procedural_req():
    r = _req(1)
    r["requirement"] = "Follow the approved security incident escalation procedure"
    r["description"] = "Follow the approved security incident escalation procedure"
    r["competency"] = "Security"
    return r


def test_quiz_types_include_choice_and_truefalse_and_scenario():
    res = fallback_plan("A", "Software Engineer", "Eng", "Beginner", "30 Days", [_procedural_req()], [BLOCK])
    types = {q["question_type"] for q in res["plan"]["modules"][0]["quiz"]}
    assert "multiple_choice" in types
    assert "true_false" in types
    assert "scenario" in types
    for q in res["plan"]["modules"][0]["quiz"]:
        assert q["source_document_id"] and q["source_section_id"]
        assert q["correct_answer"] and q["explanation"]


def test_scenario_task_generated_for_procedural_requirement():
    res = fallback_plan("A", "Software Engineer", "Eng", "Beginner", "30 Days", [_procedural_req()], [BLOCK])
    tasks = res["plan"]["modules"][0]["tasks"]
    assert any(t.get("scenario") for t in tasks), "procedural requirement must produce a scenario task"
    for t in tasks:
        for field in ("description", "expected_outcome", "source_document_id", "completion_criteria", "difficulty", "due_stage", "requirement_id"):
            assert field in t


def test_assessments_include_rubric_for_practical():
    res = fallback_plan("A", "Software Engineer", "Eng", "Beginner", "30 Days", [_procedural_req()], [BLOCK])
    assessments = res["plan"]["modules"][0]["assessments"]
    assert any(a["assessment_type"] == "Knowledge" for a in assessments)
    practical = [a for a in assessments if a["assessment_type"] == "Practical"]
    assert practical, "procedural requirement must produce a practical assessment"
    rubric = practical[0]["rubric"]
    assert rubric
    for criterion in rubric:
        for field in ("criterion", "weight", "expected_performance", "pass_condition"):
            assert field in criterion


def test_quiz_answer_source_validation_flags_unsupported_answer():
    from python_validation.validators.structure_validators import validate_quiz_answers

    plan = {"modules": [{
        "module_id": "M1",
        "module_title": "Safety",
        "description": "Lock out equipment before service",
        "source_document_id": "DOC-1",
        "source_section_id": "S1",
        "requirement_id": "R1",
        "quiz": [{
            "question": "What is required?",
            "question_type": "multiple_choice",
            "options": ["Totally unrelated answer about cooking pasta", "Lock out equipment"],
            "correct_answer": [0],
            "requirement_id": "R1",
            "source_document_id": "DOC-1",
        }],
    }]}
    findings = validate_quiz_answers(plan)
    assert findings and findings[0]["field_name"] == "quiz_answer_source"
