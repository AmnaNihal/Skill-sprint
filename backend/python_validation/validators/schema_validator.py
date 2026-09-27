"""Pipeline 2 schema validation step (reuses the deterministic JSON schema validator)."""
from __future__ import annotations

from genai_pipeline.schema_validator import validate_genai_payload


def validate_schema(plan: dict) -> list[str]:
    """Return schema problems for the generated plan (empty = valid)."""
    return validate_genai_payload(plan)
