"""Document metadata validation (SRS Step 5)."""
from datetime import date
from typing import Optional


def validate_metadata(
    category: Optional[str],
    department: Optional[str],
    version: Optional[str],
    effective_date: Optional[str],
    expiry_date: Optional[str],
) -> list[str]:
    warnings: list[str] = []
    if not category:
        warnings.append("Document category is missing")
    if not department:
        warnings.append("Department is missing")
    if not version:
        warnings.append("Version is missing; defaulting to 1.0")

    if effective_date:
        try:
            eff = date.fromisoformat(effective_date)
            if expiry_date:
                exp = date.fromisoformat(expiry_date)
                if exp < eff:
                    warnings.append("Expiry date is before effective date")
                if exp < date.today():
                    warnings.append("Document has expired")
        except ValueError:
            warnings.append("Invalid date format (use YYYY-MM-DD)")
    return warnings
