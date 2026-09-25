"""Generate verified onboarding plans for the demo roles through the live API.

Run the backend first, then from backend:
    python tools/generate_role_plans.py
"""
from __future__ import annotations

import httpx

BASE = "http://127.0.0.1:8000"
ROLES = [
    "Software Engineer",
    "QA Engineer",
    "DevOps Engineer",
    "Customer Support Executive",
    "HR Executive",
    "Product Manager",
    "Data Analyst",
    "Information Security Analyst",
    "UI/UX Designer",
    "Project Coordinator",
]


def main() -> None:
    with httpx.Client(base_url=BASE, timeout=300) as client:
        token = client.post(
            "/auth/login",
            json={"email": "admin@skillsprint.local", "password": "admin123"},
        ).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        employees = client.get("/employees", headers=headers).json()
        by_role: dict[str, dict] = {}
        for emp in employees:
            by_role.setdefault(emp.get("role") or "", emp)

        summary = []
        for role in ROLES:
            emp = by_role.get(role, {})
            payload = {
                "employee_id": emp.get("employee_id"),
                "employee_name": emp.get("name") or f"{role} Demo",
                "role_title": role,
                "role": role,
                "department": emp.get("department") or "",
                "experience_level": emp.get("experience_level") or "Beginner",
                "joining_date": emp.get("joining_date") or "2026-10-01",
                "target_completion": "90 Days",
            }
            try:
                result = client.post("/plans/generate", json=payload, headers=headers).json()
                summary.append(
                    {
                        "role": role,
                        "plan_id": result.get("plan_id"),
                        "status": result.get("status"),
                        "verification": result.get("verification_status"),
                        "coverage": (result.get("scores") or {}).get("coverage"),
                        "modules": result.get("modules"),
                        "missing": len(result.get("missing") or []),
                    }
                )
                print(
                    f"{role}: plan={result.get('plan_id')} {result.get('verification_status')} "
                    f"coverage={(result.get('scores') or {}).get('coverage')} "
                    f"modules={result.get('modules')} missing={len(result.get('missing') or [])}"
                )
            except Exception as exc:  # noqa: BLE001
                print(f"{role}: FAILED {exc}")
                summary.append({"role": role, "error": str(exc)})

        verified = sum(1 for s in summary if s.get("verification") in ("Verified", "Verified with Warning"))
        print(f"\nGenerated {len(summary)} plans, {verified} verified.")


if __name__ == "__main__":
    main()
