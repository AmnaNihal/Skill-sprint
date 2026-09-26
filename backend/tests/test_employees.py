"""Tests for employee profile schemas."""
from schemas.models import EmployeeCreate, EmployeeUpdate


def test_employee_create_defaults():
    emp = EmployeeCreate(full_name="Ahmed Khan", role="Data Analyst")
    assert emp.experience_level == "Beginner"
    assert emp.training_status == "Not Started"
    assert emp.required_competencies == []


def test_employee_create_accepts_profile_fields():
    emp = EmployeeCreate(
        full_name="Sara",
        job_role="HR Executive",
        department="People Operations",
        experience_level="Intermediate",
        joining_date="2026-10-01",
        manager="Lead",
        previous_experience="2 years",
        required_competencies=["Privacy", "Recruiting"],
    )
    assert emp.job_role == "HR Executive"
    assert emp.department == "People Operations"


def test_employee_update_is_partial():
    upd = EmployeeUpdate(experience_level="Advanced")
    data = upd.model_dump(exclude_unset=True, exclude_none=True)
    assert data == {"experience_level": "Advanced"}
