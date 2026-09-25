"""Run DeepSeek requirement extraction over every safe Nexora document.

Run from backend:
    python tools/extract_nexora_ai.py

The script is idempotent. It never processes quarantined documents and keeps every
AI-generated requirement linked to the original document chunk.
"""
from __future__ import annotations

import sys
import csv
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database.supabase_client import get_supabase
from role_matrix.matrix import extract_requirements_with_ai

ROLE_HINTS = {
    "NEX-ROLE-001": ["Software Engineer"],
    "NEX-ROLE-002": ["QA Engineer"],
    "NEX-ROLE-003": ["DevOps Engineer"],
    "NEX-ROLE-004": ["Customer Support Executive"],
    "NEX-ROLE-005": ["HR Executive"],
    "NEX-ROLE-006": ["Product Manager"],
    "NEX-ROLE-007": ["Data Analyst"],
    "NEX-ROLE-008": ["Information Security Analyst"],
    "NEX-ROLE-009": ["UI/UX Designer"],
    "NEX-ROLE-010": ["Project Coordinator"],
    "NEX-ENG-SOP-001": ["Software Engineer", "QA Engineer", "DevOps Engineer"],
    "NEX-OPS-SOP-001": ["DevOps Engineer"],
    "NEX-CS-SOP-001": ["Customer Support Executive"],
    "NEX-FIN-SOP-001": ["Data Analyst"],
}
COLLECTION_DIR = BACKEND_DIR.parents[1] / "Nexora_Technologies_Document_Collection"
with (COLLECTION_DIR / "metadata" / "document_metadata.csv").open(newline="", encoding="utf-8-sig") as metadata_file:
    COLLECTION_IDS = {
        row["Document ID"]
        for row in csv.DictReader(metadata_file)
        if row["Folder"] == "current" and row["Status"] == "Active"
    }


def extract_collection() -> dict[str, int]:
    sb = get_supabase()
    documents = sb.table("documents").select("document_id,title,version,is_quarantined").execute().data or []
    existing_ids = {
        row.get("requirement_id")
        for row in (sb.table("role_requirements").select("requirement_id").execute().data or [])
    }
    stats = {"processed": 0, "skipped": 0, "quarantined": 0, "requirements": 0, "failed": 0}

    for doc in documents:
        document_id = str(doc.get("document_id") or "")
        if document_id not in COLLECTION_IDS:
            continue
        if doc.get("is_quarantined"):
            stats["quarantined"] += 1
            continue
        if any(str(req_id or "").startswith(f"{document_id}-AI-") for req_id in existing_ids):
            stats["skipped"] += 1
            continue

        chunks = (
            sb.table("document_chunks")
            .select("chunk_id,section_id,heading,text,document_id")
            .eq("document_id", document_id)
            .order("chunk_id")
            .execute()
            .data
            or []
        )
        if not chunks:
            stats["failed"] += 1
            print(f"{document_id}: no chunks")
            continue
        sections = [
            {"section_id": row.get("section_id") or "", "heading": row.get("heading") or "", "content": row.get("text") or ""}
            for row in chunks
        ]
        try:
            extracted, meta = extract_requirements_with_ai(
                document_id, doc.get("title") or document_id, sections, ROLE_HINTS.get(document_id, [])
            )
            chunk_by_section = {str(row.get("section_id") or ""): row.get("chunk_id") for row in chunks}
            rows = []
            for index, requirement in enumerate(extracted, 1):
                requirement_id = f"{document_id}-AI-R{index:03d}"
                rows.append(
                    {
                        "requirement_id": requirement_id,
                        "role": requirement["role_title"],
                        "requirement": requirement["description"],
                        "competency": requirement["competency"],
                        "mandatory": requirement["mandatory"],
                        "priority": requirement["priority"],
                        "due_stage": requirement["due_stage"],
                        "source_document_id": document_id,
                        "source_document_version": doc.get("version") or "1.0",
                        "source_section_id": requirement["source_section_id"],
                        "source_chunk_id": chunk_by_section.get(str(requirement["source_section_id"])) or chunks[0].get("chunk_id"),
                        "assessment_topic": requirement["assessment_topic"],
                        "prerequisites": [],
                        "approval_status": "Approved",
                    }
                )
            if rows:
                sb.table("role_requirements").insert(rows).execute()
                existing_ids.update(row["requirement_id"] for row in rows)
            stats["processed"] += 1
            stats["requirements"] += len(rows)
            print(f"{document_id}: {len(rows)} requirements via {meta['model']}")
        except Exception as exc:
            stats["failed"] += 1
            print(f"{document_id}: failed - {str(exc)[:300]}")
    return stats


if __name__ == "__main__":
    print(extract_collection())
