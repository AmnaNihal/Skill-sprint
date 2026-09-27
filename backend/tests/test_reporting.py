"""Tests for report tabular builders and the dependency-free PDF writer."""
from reporting.pdf import build_pdf
from reporting.tabular import _assessment_results, _employee_progress, _role_coverage


def test_employee_progress_headers_and_rows():
    plans = [
        {
            "id": 1,
            "employee_id": "NSF-E001",
            "employee_name": "Asim",
            "role": "Project Coordinator",
            "department": "HR",
            "progress": 40,
            "status": "Approved",
            "summary": {"verification_status": "Verified", "coverage_score": 92},
        }
    ]
    headers, rows = _employee_progress(plans)
    assert headers[0] == "Plan ID"
    assert rows[0][1] == "Asim"
    assert rows[0][4] == 40
    assert rows[0][6] == "Verified"


def test_role_coverage_aggregates():
    plans = [
        {"id": 1, "employee_id": "E1", "role": "Dev", "progress": 20, "summary": {"coverage_score": 80}},
        {"id": 2, "employee_id": "E2", "role": "Dev", "progress": 80, "summary": {"coverage_score": 60}},
    ]
    reqs = [
        {"role": "Dev", "mandatory": True},
        {"role": "Dev", "mandatory": False},
    ]
    headers, rows = _role_coverage(plans, reqs)
    assert headers[0] == "Role"
    dev = next(r for r in rows if r[0] == "Dev")
    assert dev[1] == 2 and dev[2] == 1 and dev[3] == 2
    assert dev[5] == 50 and dev[6] == 70.0


def test_assessment_results_averages():
    plans = [
        {
            "id": 1,
            "employee_name": "X",
            "role": "Dev",
            "quiz_scores": {"q1": 80, "q2": 60},
            "assessment_scores": {"a1": 90},
        }
    ]
    headers, rows = _assessment_results(plans)
    assert rows[0][3] == 2 and rows[0][4] == 70.0
    assert rows[0][5] == 1 and rows[0][6] == 90.0


def test_pdf_writer_produces_valid_document():
    data = build_pdf("Test Report", ["A", "B"], [["1", "2"], ["3", "4"]])
    assert data.startswith(b"%PDF-1.4")
    assert data.rstrip().endswith(b"%%EOF")
    assert b"/Type /Catalog" in data
    assert b"xref" in data
