"""Tests for multi-tenant document scoping."""
from security.tenancy import can_access, filter_documents, is_master, owner_key, scope_id

MASTER = {"id": 1, "email": "admin@skillsprint.local", "role": "admin"}
USER_A = {"id": 77, "email": "a@test.local", "role": "learner"}
USER_B = {"id": 88, "email": "b@test.local", "role": "learner"}


def test_master_sees_everything():
    assert is_master(MASTER) is True
    assert owner_key(MASTER) is None
    assert scope_id(MASTER, "HANDBK") == "HANDBK"
    assert can_access(MASTER, "NEX-HBK-001") is True
    assert can_access(MASTER, "U77-HANDBK") is True


def test_non_master_is_scoped():
    assert is_master(USER_A) is False
    assert owner_key(USER_A) == "U77"
    assert scope_id(USER_A, "HANDBK") == "U77-HANDBK"
    assert can_access(USER_A, "U77-HANDBK") is True
    assert can_access(USER_A, "HANDBK") is False
    assert can_access(USER_A, "NEX-HBK-001") is False
    assert can_access(USER_A, "U88-DOC") is False
    assert can_access(USER_A, None) is False


def test_filter_documents_isolates_users():
    docs = [
        {"document_id": "NEX-HBK-001"},
        {"document_id": "U77-MINE"},
        {"document_id": "U88-OTHER"},
    ]
    assert len(filter_documents(MASTER, docs)) == 3
    a = filter_documents(USER_A, docs)
    assert [d["document_id"] for d in a] == ["U77-MINE"]
    b = filter_documents(USER_B, docs)
    assert [d["document_id"] for d in b] == ["U88-OTHER"]
