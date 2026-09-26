"""Policy management API: precedence, version updates, impact analysis, selective regeneration."""
from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from database.supabase_client import get_supabase
from document_processing.chunker import chunk_document
from document_processing.parser import DocumentValidationError, parse_document
from document_validation.content_quality import ensure_content_quality
from genai_pipeline.generator import (
    GenerationError,
    _align_due_stages,
    _drop_dangling_prerequisites,
    _enforce_module_mandatory,
    _supplement_missing_requirements,
    detect_injection,
    generate_onboarding_plan,
)
from policy_management.impact import analyze_impact
from policy_management.precedence import PRECEDENCE_RULES
from role_matrix.matrix import extract_requirements, extract_requirements_with_ai
from routers.plans import _fetch_plan_row, _normalize_plan, _normalize_reqs, _run_validation
from schemas.models import RegenerateRequest
from security.auth import require_admin

router = APIRouter(prefix="/policy", tags=["policy"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/precedence")
def get_precedence(user: dict = Depends(require_admin)):
    return {"rules": PRECEDENCE_RULES}


@router.get("/impact/{document_id}")
def get_impact(document_id: str, user: dict = Depends(require_admin)):
    return analyze_impact(document_id)


@router.post("/upload-version")
async def upload_version(
    file: UploadFile = File(...),
    document_id: str = Form(...),
    version: str = Form(...),
    category: str = Form(""),
    department: str = Form(""),
    title: str = Form(""),
    role_hint: str = Form(""),
    user: dict = Depends(require_admin),
):
    """Upload a new version of an existing document; supersede the previous version."""
    sb = get_supabase()
    data = await file.read()
    filename = file.filename or "file"
    try:
        parsed = parse_document(filename, data)
    except DocumentValidationError as e:
        raise HTTPException(400, str(e))

    try:
        ensure_content_quality(parsed.full_text)
    except DocumentValidationError as e:
        raise HTTPException(400, str(e))

    previous = sb.table("documents").select("*").eq("document_id", document_id).execute().data or []
    previous_versions = sorted({str(d.get("version")) for d in previous})

    # Supersede previous rows and their requirements (kept in history for audit).
    sb.table("documents").update({"is_active": False}).eq("document_id", document_id).execute()
    sb.table("role_requirements").update({"approval_status": "Superseded"}).eq(
        "source_document_id", document_id
    ).execute()

    injection_flags = detect_injection(parsed.full_text)
    doc_row = {
        "document_id": document_id,
        "title": title or parsed.title or document_id,
        "category": category or (previous[0].get("category") if previous else "General"),
        "department": department or (previous[0].get("department") if previous else None),
        "version": version,
        "effective_date": date.today().isoformat(),
        "filename": filename,
        "content_hash": parsed.content_hash,
        "is_active": True,
        "is_quarantined": bool(injection_flags),
        "injection_flags": injection_flags,
        "created_at": _now(),
    }
    try:
        created = (sb.table("documents").insert(doc_row).execute().data or [{}])[0]
    except Exception as e:
        raise HTTPException(400, f"DB insert failed: {e}")
    db_id = created.get("id")

    chunks = chunk_document(parsed, document_id)
    chunk_rows = [
        {
            "document_db_id": db_id,
            "document_id": document_id,
            "document_version": version,
            "chunk_id": f"{document_id}-{version}-C{c.chunk_index:03d}",
            "section_id": c.section_id or "Section-1",
            "heading": c.heading or doc_row["title"],
            "source_location": c.page_ref or f"Chunk {c.chunk_index}",
            "text": c.content,
        }
        for c in chunks
    ]
    if chunk_rows:
        try:
            sb.table("document_chunks").insert(chunk_rows).execute()
        except Exception:
            for row in chunk_rows:
                try:
                    sb.table("document_chunks").insert(row).execute()
                except Exception:
                    pass

    role_hints = [r.strip() for r in role_hint.split(",") if r.strip()]
    if not role_hints:
        role_hints = sorted(
            {
                row.get("role")
                for row in (sb.table("role_requirements").select("role").execute().data or [])
                if row.get("role")
            }
        )
    try:
        reqs, extraction_meta = extract_requirements_with_ai(
            document_id, doc_row["title"], parsed.sections, role_hints=role_hints[:15]
        )
    except Exception as e:
        reqs = extract_requirements(document_id, doc_row["title"], parsed.sections, role_hints=role_hints[:15])
        extraction_meta = {"provider": "deterministic-fallback", "reason": str(e)[:300]}

    inserted = 0
    for i, r in enumerate(reqs, 1):
        row = {
            "requirement_id": f"{document_id}-V{version.replace('.', '_')}-R{i:03d}",
            "role": r.get("role_title") or "All Roles",
            "requirement": (r.get("description") or r.get("title") or "")[:1000],
            "competency": r.get("competency") or doc_row["category"],
            "mandatory": bool(r.get("mandatory")),
            "priority": r.get("priority") or "Medium",
            "due_stage": r.get("due_stage") or "Week 1",
            "source_document_id": document_id,
            "source_document_version": version,
            "source_section_id": r.get("source_section_id") or "Section-1",
            "source_chunk_id": chunk_rows[0]["chunk_id"] if chunk_rows else None,
            "assessment_topic": r.get("assessment_topic") or "",
            "prerequisites": [],
            "approval_status": "Approved",
        }
        try:
            sb.table("role_requirements").insert(row).execute()
            inserted += 1
        except Exception:
            pass

    return {
        "document_id": document_id,
        "previous_versions": previous_versions,
        "new_version": version,
        "chunks": len(chunks),
        "requirements_extracted": inserted,
        "requirement_extraction": extraction_meta,
        "injection_flags": injection_flags,
        "impact": analyze_impact(document_id),
    }


@router.post("/regenerate")
def regenerate(payload: RegenerateRequest, user: dict = Depends(require_admin)):
    """Selectively regenerate only the modules that depend on the updated document."""
    sb = get_supabase()
    row = _fetch_plan_row(sb, payload.plan_id)
    role = row.get("role") or ""
    plan_payload = _normalize_plan(row.get("payload") or {})
    modules = plan_payload.get("modules") or []

    all_reqs = _normalize_reqs(sb.table("role_requirements").select("*").execute().data or [])
    applicable_reqs = [
        r
        for r in all_reqs
        if r.get("role") in (role, "All Roles")
        and (r.get("approval_status") or "Approved") != "Superseded"
    ]
    target_reqs = [
        r for r in applicable_reqs if str(r.get("source_document_id")) == str(payload.document_id)
    ]
    if not target_reqs:
        raise HTTPException(400, f"No active requirements reference {payload.document_id} for role {role}")

    target_req_ids = {
        str(r.get("requirement_id") or r.get("id")) for r in target_reqs
    }

    chunks = (
        sb.table("document_chunks")
        .select("chunk_id,section_id,heading,text,document_id")
        .eq("document_id", payload.document_id)
        .order("chunk_id")
        .execute()
        .data
        or []
    )
    source_blocks = [
        {
            "source_document_id": c.get("document_id"),
            "source_section_id": c.get("section_id") or "",
            "source_chunk_id": c.get("chunk_id") or "",
            "heading": c.get("heading") or "",
            "content": c.get("text") or "",
        }
        for c in chunks
    ]

    # Remove only the target document's requirement coverage; keep modules that also
    # cover other documents so regeneration does not silently drop unrelated requirements.
    kept_modules: list[dict] = []
    for m in modules:
        module_req_ids = {str(x) for x in (m.get("requirement_ids") or [])}
        if str(m.get("source_document_id")) == str(payload.document_id):
            remaining = module_req_ids - target_req_ids
            if remaining:
                m["requirement_ids"] = sorted(remaining)
                if str(m.get("requirement_id")) not in remaining:
                    m["requirement_id"] = sorted(remaining)[0]
                kept_modules.append(m)
        else:
            kept_modules.append(m)
    before_count = len(modules) - len(kept_modules)

    try:
        result = generate_onboarding_plan(
            employee_name=plan_payload.get("employee_name") or "",
            role_title=role,
            department=plan_payload.get("department") or "",
            experience_level="Beginner",
            target_completion=plan_payload.get("target_completion") or "30 Days",
            joining_date="",
            requirements=target_reqs,
            source_blocks=source_blocks,
        )
        replacement = result["plan"].get("modules") or []
        regenerated_model = result["meta"].get("model")
    except GenerationError as e:
        raise HTTPException(502, f"Regeneration failed: {e}")

    prefix = f"REGEN-{str(payload.document_id)[:10]}"
    for i, module in enumerate(replacement, 1):
        mid = f"{prefix}-{i:02d}"
        module["module_id"] = mid
        module["id"] = mid
        for ti, task in enumerate(module.get("tasks") or [], 1):
            if isinstance(task, dict):
                task["id"] = f"{mid}-T{ti:02d}"
        for qi, quiz in enumerate(module.get("quiz") or [], 1):
            if isinstance(quiz, dict):
                quiz["id"] = f"{mid}-Q{qi:02d}"

    plan_payload["modules"] = kept_modules + replacement

    # Guarantee full requirement coverage after regeneration.
    missing_ids = _supplement_missing_requirements(
        plan_payload,
        applicable_reqs,
        source_blocks,
        plan_payload.get("employee_name") or "",
        role,
        plan_payload.get("department") or "",
        "Beginner",
        plan_payload.get("target_completion") or "30 Days",
    )
    _align_due_stages(plan_payload, applicable_reqs)
    _enforce_module_mandatory(plan_payload, applicable_reqs)
    _drop_dangling_prerequisites(plan_payload)

    findings, comparison, sumry, report = _run_validation(sb, plan_payload, role)
    plan_payload["validation"] = {
        "findings": findings,
        "comparison": comparison[:200],
        "summary": sumry,
        "missing": report.missing_requirements,
        "unsupported": report.unsupported_requirements,
        "contradictions": report.contradictions,
        "duplicates": report.duplicates,
        "sequence_issues": report.sequence_issues,
        "hallucinations": report.hallucinations,
        "schema_errors": [],
        "validated_at": _now(),
    }
    status = "Approved" if sumry["verification_status"] in ("Verified", "Verified with Warning") else "Pending Review"
    sb.table("plans").update(
        {"payload": plan_payload, "status": status, "updated_at": _now()}
    ).eq("id", row["id"]).execute()

    return {
        "plan_id": str(row["id"]),
        "document_id": payload.document_id,
        "replaced_modules": before_count,
        "regenerated_modules": len(replacement),
        "regenerated_with": regenerated_model,
        "verification_status": sumry["verification_status"],
        "scores": {
            "coverage": sumry["coverage_score"],
            "traceability": sumry["traceability_score"],
            "consistency": sumry["consistency_score"],
        },
    }
