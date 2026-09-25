import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from config.settings import get_settings
from database.supabase_client import get_supabase
from document_processing.chunker import chunk_document
from document_processing.parser import DocumentValidationError, parse_document
from document_validation.metadata import validate_metadata
from genai_pipeline.generator import detect_injection
from role_matrix.matrix import extract_requirements, extract_requirements_with_ai
from security.auth import get_current_user, require_admin

router = APIRouter(prefix="/documents", tags=["documents"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today() -> str:
    return date.today().isoformat()


@router.get("")
def list_documents(user: dict = Depends(get_current_user)):
    res = (
        get_supabase()
        .table("documents")
        .select(
            "id,document_id,title,category,department,version,effective_date,expiry_date,"
            "filename,content_hash,is_active,is_quarantined,injection_flags,created_at"
        )
        .order("created_at", desc=True)
        .execute()
    )
    out = []
    for d in res.data or []:
        out.append(
            {
                "id": d.get("document_id") or str(d.get("id")),
                "db_id": d.get("id"),
                "title": d.get("title"),
                "category": d.get("category") or "General",
                "department": d.get("department") or "",
                "version": d.get("version") or "1.0",
                "filename": d.get("filename") or "",
                "uploaded_at": d.get("created_at"),
                "uploadedAt": d.get("created_at"),
                "status": (
                    "Quarantined"
                    if d.get("is_quarantined")
                    else ("Approved" if d.get("is_active", True) else "Inactive")
                ),
                "is_active": d.get("is_active", True),
                "is_quarantined": d.get("is_quarantined", False),
                "effective_date": d.get("effective_date"),
                "expiry_date": d.get("expiry_date"),
                "fileSize": d.get("filename") or "—",
                "file_type": (d.get("filename") or "").rsplit(".", 1)[-1].lower() if d.get("filename") else "",
                "tags": d.get("injection_flags") or [],
                "chunksCount": 0,
                "chunkCount": 0,
                "injection_flags": d.get("injection_flags") or [],
            }
        )
        # chunk counts
        try:
            cnt = (
                get_supabase()
                .table("document_chunks")
                .select("id", count="exact")
                .eq("document_id", d.get("document_id"))
                .execute()
            )
            n = cnt.count if getattr(cnt, "count", None) is not None else 0
            out[-1]["chunksCount"] = n
            out[-1]["chunkCount"] = n
        except Exception:
            pass
    return out


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("General"),
    department: str = Form(""),
    version: str = Form("1.0"),
    effective_date: str = Form(""),
    expiry_date: str = Form(""),
    title: str = Form(""),
    role_hint: str = Form(""),
    user: dict = Depends(require_admin),
):
    sb = get_supabase()
    settings = get_settings()
    data = await file.read()
    filename = file.filename or "file"

    try:
        parsed = parse_document(filename, data, max_mb=settings.max_file_size_mb)
    except DocumentValidationError as e:
        raise HTTPException(400, str(e))

    chash = parsed.content_hash
    dup = sb.table("documents").select("id,document_id").eq("content_hash", chash).limit(1).execute()
    if dup.data:
        raise HTTPException(409, f"Duplicate document (already stored as {dup.data[0].get('document_id')})")

    meta_warnings = validate_metadata(category, department, version, effective_date or None, expiry_date or None)
    injection_flags = detect_injection(parsed.full_text)

    base_id = (filename.rsplit(".", 1)[0].upper()[:6] or "DOC")
    doc_id = base_id
    n = 1
    while sb.table("documents").select("id").eq("document_id", doc_id).limit(1).execute().data:
        n += 1
        doc_id = f"{base_id}-{n}"

    doc_title = title or parsed.title or filename
    doc_row = {
        "document_id": doc_id,
        "title": doc_title,
        "category": category or "General",
        "department": department or None,
        "version": version or "1.0",
        "effective_date": effective_date or _today(),
        "expiry_date": expiry_date or None,
        "filename": filename,
        "content_hash": chash,
        "is_active": True,
        "is_quarantined": bool(injection_flags),
        "injection_flags": injection_flags,
        "created_at": _now(),
    }
    try:
        res = sb.table("documents").insert(doc_row).execute()
        db_id = (res.data or [{}])[0].get("id")
    except Exception as e:
        raise HTTPException(400, f"DB insert failed: {e}")

    chunks = chunk_document(parsed, doc_id)
    chunk_rows = []
    for c in chunks:
        chunk_rows.append(
            {
                "document_db_id": db_id,
                "document_id": doc_id,
                "document_version": version or "1.0",
                "chunk_id": f"{doc_id}-{version or '1.0'}-C{c.chunk_index:03d}",
                "section_id": c.section_id or "Section-1",
                "heading": c.heading or doc_title,
                "source_location": c.page_ref or f"Chunk {c.chunk_index}",
                "text": c.content,
            }
        )
    if chunk_rows:
        try:
            sb.table("document_chunks").insert(chunk_rows).execute()
        except Exception:
            for row in chunk_rows:
                try:
                    sb.table("document_chunks").insert(row).execute()
                except Exception:
                    pass

    # extract requirements
    role_hints = [r.strip() for r in role_hint.split(",") if r.strip()]
    try:
        emp_roles = {x["role"] for x in (sb.table("employees").select("role").execute().data or []) if x.get("role")}
        req_roles = {x["role"] for x in (sb.table("role_requirements").select("role").execute().data or []) if x.get("role")}
        role_hints = list({*(role_hints), *(emp_roles), *(req_roles)})
    except Exception:
        pass

    try:
        reqs, extraction_meta = extract_requirements_with_ai(
            doc_id, doc_title, parsed.sections, role_hints=role_hints[:15]
        )
    except Exception as e:
        reqs = extract_requirements(doc_id, doc_title, parsed.sections, role_hints=role_hints[:15])
        extraction_meta = {"provider": "deterministic-fallback", "reason": str(e)[:300]}
    req_rows = []
    for i, r in enumerate(reqs, 1):
        req_rows.append(
            {
                "requirement_id": f"{doc_id}-R{i:03d}",
                "role": r.get("role_title") or (role_hints[0] if role_hints else "General"),
                "requirement": (r.get("description") or r.get("title") or "")[:1000],
                "competency": r.get("competency") or category or "General",
                "mandatory": bool(r.get("mandatory")),
                "priority": r.get("priority") or "Medium",
                "due_stage": r.get("due_stage") or "Week 1",
                "source_document_id": doc_id,
                "source_document_version": version or "1.0",
                "source_section_id": r.get("source_section_id") or "Section-1",
                "source_chunk_id": f"{doc_id}-{version or '1.0'}-C001",
                "assessment_topic": r.get("assessment_topic") or r.get("competency") or "",
                "prerequisites": [],
                "approval_status": "Approved",
            }
        )
    if req_rows:
        for row in req_rows:
            try:
                sb.table("role_requirements").insert(row).execute()
            except Exception:
                pass

    return {
        "id": doc_id,
        "title": doc_title,
        "chunks": len(chunks),
        "sections": len(parsed.sections),
        "requirements_extracted": len(req_rows),
        "requirement_extraction": extraction_meta,
        "warnings": meta_warnings,
        "injection_flags": injection_flags,
        "status": "Quarantined" if injection_flags else "Approved",
    }


@router.get("/{doc_id}/chunks")
def get_chunks(doc_id: str, user: dict = Depends(get_current_user)):
    res = (
        get_supabase()
        .table("document_chunks")
        .select("*")
        .eq("document_id", doc_id)
        .order("chunk_id")
        .execute()
    )
    return [
        {
            "id": c.get("chunk_id"),
            "chunk_index": c.get("chunk_id"),
            "section_id": c.get("section_id"),
            "heading": c.get("heading"),
            "page_ref": c.get("source_location"),
            "content": c.get("text"),
            "text": c.get("text"),
        }
        for c in (res.data or [])
    ]


@router.delete("/{doc_id}")
def delete_document(doc_id: str, user: dict = Depends(require_admin)):
    sb = get_supabase()
    try:
        sb.table("documents").delete().eq("document_id", doc_id).execute()
    except Exception as e:
        raise HTTPException(400, str(e))
    return {"ok": True}
