from dataclasses import dataclass

from document_processing.parser import ParsedDocument, ParsedSection


@dataclass
class Chunk:
    id: str
    document_id: str
    chunk_index: int
    section_id: str
    heading: str
    page_ref: str
    content: str
    token_count: int


def _approx_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def chunk_document(parsed: ParsedDocument, document_id: str, max_chars: int = 1800) -> list[Chunk]:
    """Split into traceable chunks. Each chunk retains document/section/heading/page refs (SRS Step 7)."""
    chunks: list[Chunk] = []
    idx = 1

    for section in parsed.sections:
        text = section.content
        if len(text) <= max_chars:
            pieces = [text]
        else:
            pieces = []
            buf = ""
            for para in text.split("\n\n"):
                if len(buf) + len(para) + 2 <= max_chars:
                    buf = (buf + "\n\n" + para).strip()
                else:
                    if buf:
                        pieces.append(buf)
                    if len(para) > max_chars:
                        for i in range(0, len(para), max_chars):
                            pieces.append(para[i : i + max_chars])
                        buf = ""
                    else:
                        buf = para
            if buf:
                pieces.append(buf)

        for piece in pieces:
            if not piece.strip():
                continue
            chunks.append(
                Chunk(
                    id=f"{document_id}-C{idx:03d}",
                    document_id=document_id,
                    chunk_index=idx,
                    section_id=section.section_id,
                    heading=section.heading,
                    page_ref=section.page_ref,
                    content=piece.strip(),
                    token_count=_approx_tokens(piece),
                )
            )
            idx += 1

    if not chunks and parsed.full_text.strip():
        chunks.append(
            Chunk(
                id=f"{document_id}-C001",
                document_id=document_id,
                chunk_index=1,
                section_id="1",
                heading="Full Document",
                page_ref="",
                content=parsed.full_text[:max_chars],
                token_count=_approx_tokens(parsed.full_text[:max_chars]),
            )
        )
    return chunks
