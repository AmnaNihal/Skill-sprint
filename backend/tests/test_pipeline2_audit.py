"""Tests for Pipeline 2 audit trail entries."""
from python_validation.audit import audit_events_from_report, build_audit_entry


class _Report:
    def __init__(self, status, missing=None, unsupported=None, contradictions=None, outdated=None):
        self.verification_status = status
        self.missing_requirements = missing or []
        self.unsupported_requirements = unsupported or []
        self.contradictions = contradictions or []
        self.outdated_sources = outdated or []


def test_audit_entry_shape():
    entry = build_audit_entry("validation_started", plan_id=7, actor="tester")
    assert set(entry) == {"event", "plan_id", "actor", "detail", "status", "timestamp"}
    assert entry["plan_id"] == "7"


def test_audit_events_verified_has_no_manual_review():
    events = [e["event"] for e in audit_events_from_report(_Report("Verified"), plan_id=1)]
    assert "validation_started" in events
    assert "validation_completed" in events
    assert "manual_review" not in events


def test_audit_events_flag_missing_unsupported_contradiction_outdated():
    report = _Report(
        "Contradiction Detected",
        missing=["R2"],
        unsupported=["R99"],
        contradictions=["conflict"],
        outdated=["DOC-1 v1 -> v2"],
    )
    events = [e["event"] for e in audit_events_from_report(report, plan_id=5)]
    assert "requirement_missing" in events
    assert "unsupported_requirement" in events
    assert "contradiction" in events
    assert "outdated_source" in events
    assert "manual_review" in events
