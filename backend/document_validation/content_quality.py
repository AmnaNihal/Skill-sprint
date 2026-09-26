"""Content-quality gate for uploaded documents (SRS document validation).

Rejects documents that contain no usable company content so that nothing empty,
placeholder, or junk is ever ingested or sent to the AI pipeline.
"""
from __future__ import annotations

import re

from document_processing.parser import DocumentValidationError

_LOREM = re.compile(
    r"\blorem ipsum\b|\bdolor sit amet\b|\bconsectetur (adipiscing|adipisicing)\b|\but enim ad\b",
    re.IGNORECASE,
)
_PLACEHOLDER = re.compile(
    r"\b(?:tbd|to be determined|placeholder|sample text|dummy text|insert (?:text|content) here|xxx+)\b",
    re.IGNORECASE,
)
_MEANINGFUL_WORD = re.compile(r"[A-Za-z][A-Za-z'\-]{2,}")

MIN_MEANINGFUL_WORDS = 20


def find_quality_issues(text: str) -> list[str]:
    """Return a list of human-readable reasons the content is not acceptable."""
    stripped = (text or "").strip()
    if not stripped:
        return ["document is empty (no extractable text)"]

    words = _MEANINGFUL_WORD.findall(stripped)
    issues: list[str] = []
    if len(words) < MIN_MEANINGFUL_WORDS:
        issues.append(
            f"document has insufficient content ({len(words)} words, minimum {MIN_MEANINGFUL_WORDS})"
        )
    if _LOREM.search(stripped):
        issues.append("document contains lorem ipsum placeholder text")
    if _PLACEHOLDER.search(stripped):
        issues.append("document contains placeholder text (e.g. TBD/XXX/sample text)")

    # If placeholder boilerplate dominates the document, reject even if long.
    lorem_matches = len(_LOREM.findall(stripped)) + len(_PLACEHOLDER.findall(stripped))
    if words and lorem_matches and lorem_matches >= max(3, len(words) // 30):
        issues.append("document is dominated by placeholder content")

    return issues


def ensure_content_quality(text: str) -> None:
    """Raise DocumentValidationError if the document has no usable company content."""
    issues = find_quality_issues(text)
    if issues:
        raise DocumentValidationError("Rejected: " + "; ".join(issues))
