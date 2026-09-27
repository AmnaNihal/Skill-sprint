"""Content chunking with full source traceability (SRS Step 7 / Section: Content Chunking).

Large documents are divided into manageable chunks. Every chunk retains:
  - Document ID
  - Chunk ID
  - Section
  - Heading
  - Source location (page reference where available)
plus the chunk text and an approximate token count.

Generated content that cites a chunk therefore always resolves back to an approved document.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from document_processing.parser import ParsedDocument, ParsedSection

DEFAULT_MAX_CHARS = 1800
DEFAULT_MIN_CHARS = 200


@dataclass
class Chunk:
    id: str                    # chunk id, e.g. DOC-1-C001
    document_id: str           # source document id
    chunk_index: int           # 1-based order within the document
    section_id: str            # section the chunk belongs to
    heading: str               # section heading
    page_ref: str              # page / location reference from the parser
    source_location: str       # human-readable source location
    content: str               # chunk text
    token_count: int
    requirement_ids: list[str] = field(default_factory=list)


def _approx_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _split_long_paragraph(paragraph: str, max_chars: int) -> list[str]:
    """Split an oversized paragraph by sentence, then hard-split if a sentence is still too long."""
    pieces: list[str] = []
    buf = ""
    for sentence in re.split(r"(?<=[.!?])\s+", paragraph):
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(sentence) > max_chars:
            if buf:
                pieces.append(buf)
                buf = ""
            for i in range(0, len(sentence), max_chars):
                piece = sentence[i : i + max_chars].strip()
                if piece:
                    pieces.append(piece)
            continue
        if len(buf) + len(sentence) + 1 <= max_chars:
            buf = (buf + " " + sentence).strip()
        else:
            if buf:
                pieces.append(buf)
            buf = sentence
    if buf:
        pieces.append(buf)
    return pieces


def _split_section(text: str, max_chars: int) -> list[str]:
    """Split one section's text into pieces each <= max_chars, preferring paragraph boundaries."""
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    pieces: list[str] = []
    buf = ""
    for paragraph in re.split(r"\n\s*\n", text):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if len(paragraph) > max_chars:
            if buf:
                pieces.append(buf)
                buf = ""
            pieces.extend(_split_long_paragraph(paragraph, max_chars))
            continue
        if len(buf) + len(paragraph) + 2 <= max_chars:
            buf = (buf + "\n\n" + paragraph).strip()
        else:
            if buf:
                pieces.append(buf)
            buf = paragraph
    if buf:
        pieces.append(buf)

    # Merge a tiny trailing piece into the previous one so we avoid meaningless fragments.
    if len(pieces) >= 2 and len(pieces[-1]) < DEFAULT_MIN_CHARS:
        pieces[-2] = (pieces[-2] + "\n" + pieces[-1]).strip()
        pieces.pop()
    return pieces


def chunk_document(parsed: ParsedDocument, document_id: str, max_chars: int = DEFAULT_MAX_CHARS) -> list[Chunk]:
    """Split a parsed document into traceable chunks (document / chunk / section / heading / location)."""
    chunks: list[Chunk] = []
    idx = 1

    def add(section: ParsedSection, piece: str) -> None:
        nonlocal idx
        piece = piece.strip()
        if not piece:
            return
        section_id = section.section_id or f"S{idx}"
        location = section.page_ref or f"Section {section_id}"
        chunks.append(
            Chunk(
                id=f"{document_id}-C{idx:03d}",
                document_id=document_id,
                chunk_index=idx,
                section_id=section_id,
                heading=section.heading or "Untitled Section",
                page_ref=section.page_ref or "",
                source_location=location,
                content=piece,
                token_count=_approx_tokens(piece),
            )
        )
        idx += 1

    for section in parsed.sections:
        for piece in _split_section(section.content, max_chars):
            add(section, piece)

    if not chunks and (parsed.full_text or "").strip():
        fallback = ParsedSection(section_id="1", heading="Full Document", content="", page_ref="")
        for piece in _split_section(parsed.full_text, max_chars):
            add(fallback, piece)

    return chunks
