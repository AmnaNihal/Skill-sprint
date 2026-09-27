"""Export a requirement-level GenAI vs Python comparison report (SRS deliverable).

Run from backend:
    python tools/export_comparison_report.py

Writes reports/comparison_report.csv (and .json) with at least 100 comparison rows.
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
    plans = sb.table("plans").select("id,role").execute().data or []
    comparison_rows: list[dict] = []
    for plan in plans:
        rows = (
            sb.table("plans")
            .select("payload->validation->comparison")
            .eq("id", plan.get("id"))
            .limit(1)
            .execute()
            .data
            or []
        )
        items = (rows[0].get("comparison") if rows else []) or []
        for item in items:
            comparison_rows.append(
                {
                    "plan_id": str(plan.get("id")),
                    "role": item.get("role") or plan.get("role") or "",
                    "requirement_id": item.get("requirement_id"),
                    "field": item.get("field_name"),
                    "genai_value": item.get("genai_value"),
                    "python_value": item.get("python_value"),
                    "result": item.get("result"),
                    "validation_status": item.get("validation_status"),
                }
            )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    csv_path = OUT_DIR / "comparison_report.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "plan_id", "role", "requirement_id", "field",
                "genai_value", "python_value", "result", "validation_status",
            ],
        )
        writer.writeheader()
        writer.writerows(comparison_rows)

    json_path = OUT_DIR / "comparison_report.json"
    json_path.write_text(json.dumps(comparison_rows, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"plans={len(rows)} comparison_rows={len(comparison_rows)}")
    print(f"written: {csv_path}")
    print(f"written: {json_path}")
    if len(comparison_rows) < 100:
        print("WARNING: fewer than 100 comparison rows - generate more plans first.")


if __name__ == "__main__":
    main()
