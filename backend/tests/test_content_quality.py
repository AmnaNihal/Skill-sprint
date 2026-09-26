"""Tests for the document content-quality gate."""
import pytest

from document_processing.parser import DocumentValidationError
from document_validation.content_quality import ensure_content_quality, find_quality_issues

GOOD = (
    "Nexora Technologies Information Security Policy. All employees must use unique credentials "
    "and must not share passwords. Security incidents must be reported to the security team within "
    "one hour. Access reviews are completed every quarter by system owners."
)


def test_good_document_passes():
    assert find_quality_issues(GOOD) == []
    ensure_content_quality(GOOD)  # must not raise


def test_empty_document_rejected():
    issues = find_quality_issues("   \n  ")
    assert issues and "empty" in issues[0].lower()
    with pytest.raises(DocumentValidationError):
        ensure_content_quality("")


def test_lorem_ipsum_rejected():
    text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore."
    issues = find_quality_issues(text)
    assert any("lorem" in i.lower() for i in issues)
    with pytest.raises(DocumentValidationError):
        ensure_content_quality(text)


def test_placeholder_rejected():
    text = "Company policy placeholder. TBD TBD insert text here xxx placeholder sample text repeated."
    with pytest.raises(DocumentValidationError):
        ensure_content_quality(text)


def test_short_document_rejected():
    with pytest.raises(DocumentValidationError):
        ensure_content_quality("Must read the handbook.")
