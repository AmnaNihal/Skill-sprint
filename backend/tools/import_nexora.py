"""Import the Nexora document collection and its curated requirement matrix.

Run from backend:
    python tools/import_nexora.py

Only the current DOCX source is imported. PDF copies are format duplicates, historical
versions are intentionally excluded, and the adversarial document is retained quarantined
to exercise the prompt-injection control.
"""
from __future__ import annotations

import csv
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database.supabase_client import get_supabase
from document_processing.chunker import chunk_document
from document_processing.parser import parse_document
from genai_pipeline.generator import detect_injection

REPO_DIR = BACKEND_DIR.parent
COLLECTION_CANDIDATES = [
    REPO_DIR / "sample_documents" / "nexora",
    BACKEND_DIR.parents[1] / "Nexora_Technologies_Document_Collection",
]
COLLECTION_DIR = next((p for p in COLLECTION_CANDIDATES if p.exists()), COLLECTION_CANDIDATES[0])
CURRENT_DIR = COLLECTION_DIR / "current"
METADATA_FILE = COLLECTION_DIR / "metadata" / "document_metadata.csv"
MATRIX_FILE = COLLECTION_DIR / "metadata" / "role_requirement_matrix_seed.csv"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _heading_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _metadata() -> list[dict[str, str]]:
    with METADATA_FILE.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def _seed_rows() -> list[dict[str, str]]:
    with MATRIX_FILE.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def _source_chunk(chunks_by_doc: dict[str, list[dict]], document_id: str, source_section: str) -> dict:
    chunks = chunks_by_doc.get(document_id) or []
    target = _heading_key(source_section)
    for chunk in chunks:
        if _heading_key(str(chunk.get("heading") or "")) == target:
            return chunk
    return chunks[0] if chunks else {}


def import_collection() -> dict[str, int]:
    sb = get_supabase()
    existing_docs = {
        row.get("document_id"): row
        for row in (sb.table("documents").select("id,document_id").execute().data or [])
        if row.get("document_id")
    }
    chunks_by_doc: dict[str, list[dict]] = {}
    inserted_docs = 0
    skipped_docs = 0
    quarantined_docs = 0

    for meta in _metadata():
        if meta["Folder"] != "current" or meta["Status"] != "Active":
            continue
        document_id = meta["Document ID"]
        files = list(CURRENT_DIR.glob(f"{document_id}_*.docx"))
        if len(files) != 1:
            raise RuntimeError(f"Expected one DOCX for {document_id}, found {len(files)}")

        if document_id in existing_docs:
            skipped_docs += 1
            chunks_by_doc[document_id] = (
                sb.table("document_chunks").select("chunk_id,section_id,heading,text,document_id")
                .eq("document_id", document_id)
                .order("chunk_id")
                .execute()
                .data
                or []
            )
            continue

        source_path = files[0]
        parsed = parse_document(source_path.name, source_path.read_bytes())
        flags = detect_injection(parsed.full_text)
        doc = {
            "document_id": document_id,
            "title": meta["Title"],
            "category": meta["Category"],
            "department": meta["Owner"],
            "version": meta["Version"],
            "effective_date": meta["Effective Date"],
            "filename": source_path.name,
            "content_hash": parsed.content_hash,
            "is_active": True,
            "is_quarantined": bool(flags),
            "injection_flags": flags,
            "created_at": _now(),
        }
        created = (sb.table("documents").insert(doc).execute().data or [{}])[0]
        db_id = created.get("id")
        chunks = chunk_document(parsed, document_id)
        chunk_rows = [
            {
                "document_db_id": db_id,
                "document_id": document_id,
                "document_version": meta["Version"],
                "chunk_id": f"{document_id}-{meta['Version']}-C{chunk.chunk_index:03d}",
                "section_id": chunk.section_id or "Section-1",
                "heading": chunk.heading or meta["Title"],
                "source_location": chunk.page_ref or f"Chunk {chunk.chunk_index}",
                "text": chunk.content,
            }
            for chunk in chunks
        ]
        if chunk_rows:
            sb.table("document_chunks").insert(chunk_rows).execute()
        chunks_by_doc[document_id] = chunk_rows
        inserted_docs += 1
        quarantined_docs += int(bool(flags))

    existing_requirements = {
        row.get("requirement_id")
        for row in (sb.table("role_requirements").select("requirement_id").execute().data or [])
    }
    inserted_requirements = 0
    skipped_requirements = 0
    for seed in _seed_rows():
        requirement_id = seed["Requirement ID"]
        if requirement_id in existing_requirements:
            skipped_requirements += 1
            continue
        source = _source_chunk(chunks_by_doc, seed["Source Document"], seed["Source Section"])
        row = {
            "requirement_id": requirement_id,
            "role": seed["Role"],
            "requirement": seed["Requirement"],
            "competency": seed["Category"],
            "mandatory": seed["Mandatory"].strip().lower() in {"yes", "true", "1"},
            "priority": seed["Priority"],
            "due_stage": "Day 1" if seed["Mandatory"].strip().lower() == "yes" else "Week 1",
            "source_document_id": seed["Source Document"],
            "source_document_version": next(
                (m["Version"] for m in _metadata() if m["Document ID"] == seed["Source Document"] and m["Folder"] == "current"),
                "1.0",
            ),
            "source_section_id": source.get("section_id") or seed["Source Section"],
            "source_chunk_id": source.get("chunk_id") or None,
            "assessment_topic": seed["Source Section"],
            "prerequisites": [],
            "approval_status": "Approved",
        }
        sb.table("role_requirements").insert(row).execute()
        inserted_requirements += 1

    return {
        "documents_inserted": inserted_docs,
        "documents_skipped": skipped_docs,
        "documents_quarantined": quarantined_docs,
        "requirements_inserted": inserted_requirements,
        "requirements_skipped": skipped_requirements,
    }


if __name__ == "__main__":
    print(import_collection())
