"""Export a validation report from stored plans (SRS §64).

Run from backend:
    python tools/export_validation_report.py

Writes reports/validation_report.csv and .json with per-plan scores, missing/unsupported items,
contradictions, duplicates, sequence issues, hallucinations, and outdated sources.
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database.supabase_client import get_supabase

OUT_DIR = BACKEND_DIR.parent / "reports"


def main() -> None:
    sb = get_supabase()
    rows = sb.table("plans").select("id,role,status,payload").execute().data or []
    records = []
    for row in rows:
        validation = (row.get("payload") or {}).get("validation") or {}
        summary = validation.get("summary") or {}
        records.append(
            {
                "plan_id": str(row.get("id")),
                "role": row.get("role"),
                "status": row.get("status"),
                "verification_status": summary.get("verification_status"),
                "coverage_score": summary.get("coverage_score"),
                "traceability_score": summary.get("traceability_score"),
                "consistency_score": summary.get("consistency_score"),
                "missing_count": summary.get("missing_count"),
                "unsupported_count": summary.get("unsupported_count"),
                "contradiction_count": summary.get("contradiction_count"),
                "duplicate_count": summary.get("duplicate_count"),
                "sequence_issue_count": summary.get("sequence_issue_count"),
                "hallucination_count": summary.get("hallucination_count"),
                "outdated_source_count": summary.get("outdated_source_count"),
                "missing": "; ".join(str(x) for x in (validation.get("missing") or [])),
                "unsupported": "; ".join(str(x) for x in (validation.get("unsupported") or [])),
            }
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fields = list(records[0].keys()) if records else [
        "plan_id", "role", "status", "verification_status", "coverage_score", "traceability_score",
    ]
    with (OUT_DIR / "validation_report.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)
    (OUT_DIR / "validation_report.json").write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")

    verified = sum(1 for r in records if r["verification_status"] in ("Verified", "Verified with Warning"))
    print(f"plans={len(records)} verified={verified}")
    print(f"written: {OUT_DIR / 'validation_report.csv'}")
    print(f"written: {OUT_DIR / 'validation_report.json'}")


if __name__ == "__main__":
    main()
