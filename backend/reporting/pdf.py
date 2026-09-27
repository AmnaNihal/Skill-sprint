"""Dependency-free minimal PDF writer for tabular reports.

Produces a valid single-font (Helvetica) PDF with a simple table. This avoids
adding a heavy PDF dependency to the serverless bundle.
"""
from __future__ import annotations

from typing import Any

PAGE_W = 842.0
PAGE_H = 595.0
MARGIN = 28.0
FONT_SIZE = 8.0
LINE_H = 12.0
CHAR_W = FONT_SIZE * 0.5


def _escape(value: Any) -> str:
    text = str(value if value is not None else "")
    out = []
    for ch in text:
        if ch in ("(", ")", "\\"):
            out.append("\\" + ch)
        elif 32 <= ord(ch) < 127:
            out.append(ch)
        else:
            out.append("?")
    return "".join(out)


def _truncate(value: Any, max_chars: int) -> str:
    text = str(value if value is not None else "")
    if len(text) <= max_chars:
        return text
    return text[: max(0, max_chars - 1)] + "…".replace("…", "~")


def _content_stream(title: str, headers: list[str], rows: list[list[Any]]) -> bytes:
    ncols = max(1, len(headers))
    usable = PAGE_W - 2 * MARGIN
    col_w = usable / ncols
    chars_per_col = max(6, int(col_w / CHAR_W) - 1)
    lines: list[tuple[float, str]] = []

    y = PAGE_H - MARGIN
    lines.append((y, _escape(title)))
    y -= LINE_H * 1.6
    header_line = "  ".join(_truncate(h, chars_per_col).ljust(chars_per_col) for h in headers)
    lines.append((y, _escape(header_line)))
    y -= LINE_H
    lines.append((y, _escape("-" * int(usable / CHAR_W))))
    y -= LINE_H

    for row in rows:
        if y < MARGIN:
            break
        line = "  ".join(_truncate(c, chars_per_col).ljust(chars_per_col) for c in row[:ncols])
        if len(row) < ncols:
            line += "  " * (ncols - len(row))
        lines.append((y, _escape(line)))
        y -= LINE_H

    parts = ["BT", f"/F1 {FONT_SIZE} Tf"]
    for ly, text in lines:
        parts.append(f"1 0 0 1 {MARGIN:.2f} {ly:.2f} Tm")
        parts.append(f"({text}) Tj")
    parts.append("ET")
    return ("\n".join(parts)).encode("latin-1", "replace")


def _wrap_pages(title: str, headers: list[str], rows: list[list[Any]]) -> list[bytes]:
    per_page = max(1, int((PAGE_H - 2 * MARGIN - 3 * LINE_H) // LINE_H))
    if not rows:
        return [_content_stream(title, headers, [])]
    pages = []
    for i in range(0, len(rows), per_page):
        pages.append(_content_stream(title, headers, rows[i : i + per_page]))
    return pages


def build_pdf(title: str, headers: list[str], rows: list[list[Any]]) -> bytes:
    """Return a valid PDF document as bytes."""
    streams = _wrap_pages(title, headers, rows)
    npages = len(streams)

    def page_obj_id(i: int) -> int:
        return 5 + 2 * i

    def content_obj_id(i: int) -> int:
        return 4 + 2 * i

    max_id = 4 + 2 * npages
    objects: list[bytes | None] = [None] * (max_id + 1)
    objects[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
    kids = " ".join(f"{page_obj_id(i)} 0 R" for i in range(npages))
    objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {npages} >>".encode("latin-1")
    objects[3] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"

    for i, stream in enumerate(streams):
        objects[content_obj_id(i)] = (
            f"<< /Length {len(stream)} >>\nstream\n".encode("latin-1") + stream + b"\nendstream"
        )
        objects[page_obj_id(i)] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W:.0f} {PAGE_H:.0f}] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {content_obj_id(i)} 0 R >>"
        ).encode("latin-1")

    buf = bytearray(b"%PDF-1.4\n")
    offsets = [0] * (max_id + 1)
    for obj_id in range(1, max_id + 1):
        body = objects[obj_id] or b"null"
        offsets[obj_id] = len(buf)
        buf += f"{obj_id} 0 obj\n".encode("latin-1") + body + b"\nendobj\n"

    xref_pos = len(buf)
    buf += f"xref\n0 {max_id + 1}\n".encode("latin-1")
    buf += b"0000000000 65535 f \n"
    for obj_id in range(1, max_id + 1):
        buf += f"{offsets[obj_id]:010d} 00000 n \n".encode("latin-1")
    buf += (
        f"trailer\n<< /Size {max_id + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF"
    ).encode("latin-1")
    return bytes(buf)
