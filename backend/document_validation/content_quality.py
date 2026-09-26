"""Content-quality gate for uploaded documents (SRS document validation).

Rejects documents that contain no usable company content so that nothing empty,
placeholder, or junk is ever ingested or sent to the AI pipeline.
"""
from __future__ import annotations

import re

from document_processing.parser import DocumentValidationError

_LOREM = re.compile(
    r"\blorem\s+ipsum\b|\bdolor\s+sit\s+amet\b|\bconsectetur\s+(?:adipiscing|adipisicing)\b|\but\s+enim\s+ad\b",
    re.IGNORECASE,
)
_PLACEHOLDER = re.compile(
    r"\b(?:tbd|to\s+be\s+determined|placeholder|sample\s+text|dummy\s+text|"
    r"insert\s+(?:text|content)\s+here|xxx+)\b",
    re.IGNORECASE,
)
_MEANINGFUL_WORD = re.compile(r"[A-Za-z][A-Za-z'\-]{2,}")

MIN_MEANINGFUL_WORDS = 20


def find_quality_issues(text: str) -> list[str]:
    """Return a list of human-readable reasons the content is not acceptable."""
    stripped = (text or "").strip()
    if not stripped:
        return ["document is empty (no extractable text)"]

    # PDF/DOCX extraction often splits words across newlines/multiple spaces, so
    # normalize whitespace before pattern matching.
    flat = re.sub(r"\s+", " ", stripped)

    words = _MEANINGFUL_WORD.findall(stripped)
    issues: list[str] = []
    if len(words) < MIN_MEANINGFUL_WORDS:
        issues.append(
            f"document has insufficient content ({len(words)} words, minimum {MIN_MEANINGFUL_WORDS})"
        )
    if _LOREM.search(flat):
        issues.append("document contains lorem ipsum placeholder text")
    if _PLACEHOLDER.search(flat):
        issues.append("document contains placeholder text (e.g. TBD/XXX/sample text)")

    # If placeholder boilerplate dominates the document, reject even if long.
    lorem_matches = len(_LOREM.findall(flat)) + len(_PLACEHOLDER.findall(flat))
    if words and lorem_matches and lorem_matches >= max(2, len(words) // 40):
        issues.append("document is dominated by placeholder content")

    return issues


def ensure_content_quality(text: str) -> None:
    """Raise DocumentValidationError if the document has no usable company content."""
    issues = find_quality_issues(text)
    if issues:
        raise DocumentValidationError("Rejected: " + "; ".join(issues))
