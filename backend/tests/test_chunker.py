"""Tests for content chunking traceability (SRS Content Chunking requirement)."""
from document_processing.chunker import chunk_document
from document_processing.parser import ParsedDocument, ParsedSection


def _doc(sections):
    return ParsedDocument(
        title="Test Doc",
        file_type="txt",
        content_hash="x",
        full_text="\n\n".join(s.content for s in sections),
        sections=sections,
        page_count=1,
    )


def test_chunk_retains_full_traceability():
    section = ParsedSection(section_id="4.2", heading="Escalation Procedure", content="Short body.", page_ref="Page 7")
    chunks = chunk_document(_doc([section]), "DOC-07")
    assert len(chunks) == 1
    c = chunks[0]
    assert c.document_id == "DOC-07"
    assert c.id == "DOC-07-C001"
    assert c.section_id == "4.2"
    assert c.heading == "Escalation Procedure"
    assert c.source_location == "Page 7"
    assert c.content == "Short body."
    assert c.token_count >= 1


def test_large_section_is_split_into_manageable_chunks():
    big_paragraph = "Employees must escalate high-risk complaints. " * 120  # > max_chars
    section = ParsedSection(section_id="4", heading="Complaints", content=big_paragraph, page_ref="Page 3")
    chunks = chunk_document(_doc([section]), "DOC-07", max_chars=500)
    assert len(chunks) > 1, "large section must be divided into multiple chunks"
    for c in chunks:
        assert len(c.content) <= 700  # <= max_chars (small overflow only from merging tiny tail)
        assert c.document_id == "DOC-07"
        assert c.section_id == "4"
        assert c.heading == "Complaints"
        assert c.source_location == "Page 3"
    # chunk ids are sequential and unique
    ids = [c.id for c in chunks]
    assert len(ids) == len(set(ids))
    assert ids[0].endswith("C001") and ids[1].endswith("C002")


def test_multiple_sections_keep_their_own_metadata():
    s1 = ParsedSection(section_id="1", heading="Intro", content="Intro text.", page_ref="Page 1")
    s2 = ParsedSection(section_id="2", heading="Policy", content="Policy text.", page_ref="Page 2")
    chunks = chunk_document(_doc([s1, s2]), "DOC-09")
    assert [c.section_id for c in chunks] == ["1", "2"]
    assert [c.heading for c in chunks] == ["Intro", "Policy"]
    assert [c.source_location for c in chunks] == ["Page 1", "Page 2"]
    assert [c.chunk_index for c in chunks] == [1, 2]


def test_source_location_falls_back_to_section_when_no_page():
    section = ParsedSection(section_id="5", heading="Tools", content="Tooling notes.", page_ref="")
    chunks = chunk_document(_doc([section]), "DOC-11")
    assert chunks[0].source_location == "Section 5"
