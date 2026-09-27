"""Field-level GenAI vs Python comparison (SRS §24/§42)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ComparisonRow(BaseModel):
    requirement_id: str
    role: str = ""
    field_name: str
    genai_value: str = ""
    python_value: str = ""
    match: bool = False
    result: str = "Match"
    coverage_status: str = ""
    traceability_status: str = ""
    validation_status: str = ""
    explanation: str = ""


COMPARED_FIELDS = [
    "requirement_id",
    "role",
    "mandatory",
    "priority",
    "due_stage",
    "source_document_id",
    "source_section_id",
    "competency",
    "assessment_topic",
]


def _norm(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value).strip().lower()


def compare_requirement(expected: dict, generated: dict, role: str = "") -> list[ComparisonRow]:
    """Compare one expected (matrix) requirement with one generated module on structured fields."""
    rows: list[ComparisonRow] = []
    rid = str(expected.get("requirement_id") or expected.get("id") or "")
    for field_name in COMPARED_FIELDS:
        exp_val = expected.get(field_name)
        if field_name == "requirement_id":
            gen_val = generated.get("requirement_id")
        elif field_name == "role":
            gen_val = generated.get("role") or role
        else:
            gen_val = generated.get(field_name)
        if exp_val in (None, "") and gen_val in (None, ""):
            continue
        match = _norm(exp_val) == _norm(gen_val)
        rows.append(
            ComparisonRow(
                requirement_id=rid,
                role=role or str(expected.get("role") or ""),
                field_name=field_name,
                genai_value=_norm(gen_val),
                python_value=_norm(exp_val),
                match=match,
                result="Match" if match else "Mismatch",
                validation_status="Verified" if match else "Manual Review Required",
                explanation="" if match else f"{field_name}: generated '{gen_val}' vs expected '{exp_val}'",
            )
        )
    return rows
