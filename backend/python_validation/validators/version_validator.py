"""Document version / outdated-source validator (SRS §13)."""
from __future__ import annotations

from typing import Any


def _version_key(version: Any) -> tuple[int, ...]:
    parts: list[int] = []
    for piece in str(version or "0").split("."):
        try:
            parts.append(int(piece))
        except ValueError:
            parts.append(0)
    return tuple(parts) or (0,)


def validate_versions(plan: dict[str, Any], context: Any) -> tuple[list[str], list[dict]]:
    """Detect generated content that references a superseded document version.

    Returns (outdated_source_messages, findings) where findings are dicts compatible with
    the ValidationFinding dataclass.
    """
    outdated: list[str] = []
    findings: list[dict] = []

    active_version: dict[str, str] = getattr(context, "active_version_by_doc", {}) or {}
    requirements = {str(r.get("requirement_id") or r.get("id")): r for r in getattr(context, "all_requirements", ())}

    def flag(req_id: str, doc_id: str, gen_version: str, current: str, where: str) -> None:
        message = (
            f"{where} references {doc_id} version {gen_version}, "
            f"but version {current} is currently active"
        )
        if message in outdated:
            return
        outdated.append(message)
        findings.append(
            {
                "requirement_id": req_id,
                "field_name": "document_version",
                "genai_value": f"{doc_id} v{gen_version}",
                "python_value": f"{doc_id} v{current}",
                "result": "Mismatch",
                "validation_status": "Outdated Source",
                "detail": message,
            }
        )

    for module in plan.get("modules") or []:
        module_id = module.get("module_id") or module.get("id") or "?"
        # Module-level explicit version.
        doc_id = module.get("source_document_id")
        gen_version = str(module.get("source_document_version") or "")
        if doc_id and gen_version and doc_id in active_version:
            current = active_version[doc_id]
            if _version_key(gen_version) < _version_key(current):
                flag(str(module.get("requirement_id") or "-"), doc_id, gen_version, current, f"Module {module_id}")

        # Requirement-linked versions.
        for rid in module.get("requirement_ids") or ([module.get("requirement_id")] if module.get("requirement_id") else []):
            requirement = requirements.get(str(rid))
            if not requirement:
                continue
            req_doc = str(requirement.get("source_document_id") or "")
            req_version = str(requirement.get("source_document_version") or "")
            if req_doc and req_version and req_doc in active_version:
                current = active_version[req_doc]
                if _version_key(req_version) < _version_key(current):
                    flag(str(rid), req_doc, req_version, current, f"Module {module_id}")

    return outdated, findings
