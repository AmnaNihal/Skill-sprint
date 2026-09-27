# Required Demo Scenarios (A–I)

Source: SRS §70. Each scenario lists how to reproduce it and the expected result. Use the admin
account unless stated otherwise.

## Scenario A — Successful plan
- **Do:** Generate a plan for a role fully covered by the matrix (e.g. Product Manager).
- **Expect:** `Verified`, coverage 100%, traceability 100%, 0 missing/unsupported/contradictions.

## Scenario B — Missing requirement
- **Do:** Remove or supersede a mandatory requirement after a plan was generated, then **Revalidate**.
- **Expect:** coverage below 100%, status `Requirement Missing` / `Partially Verified`; never `Verified`.

## Scenario C — Unsupported requirement
- **Do:** A plan that includes a requirement ID not present in the matrix (e.g. cite `R099`).
- **Expect:** `Unsupported Requirement` finding; status `Unsupported` / `Manual Review Required`.

## Scenario D — Outdated source
- **Do:** Have a plan cite a document version older than the active version (upload a new version and
  revalidate a plan still citing the old one).
- **Expect:** `Outdated Source`; recorded generated vs current version.

## Scenario E — Contradiction
- **Do:** Use a FAQ that conflicts with the latest approved policy (`CONFLICT-*` documents) or a
  module that marks a mandatory requirement optional.
- **Expect:** `Contradiction Detected` (or precedence-resolved) + manual review record.

## Scenario F — Prompt injection
- **Do:** Upload `NEX-ADV-001_*.docx` (contains "Ignore all previous instructions…").
- **Expect:** document **Quarantined**, injection flags listed, no requirements extracted, and
  **no change** to application behaviour.

## Scenario G — Policy update
- **Do:** `POST /policy/upload-version` for a document; then `GET /policy/impact/{document_id}`;
  then `POST /policy/regenerate`.
- **Expect:** previous version inactive + requirements `Superseded`; impact shows affected
  modules/tasks/quizzes/plans/employees; regeneration rebuilds only affected modules and revalidates.

## Scenario H — New role
- **Do:** Create a new role and add requirements; generate a plan for it.
- **Expect:** requirements map to the role (plus `All Roles`), plan generated and validated with no
  code changes.

## Scenario I — Unsupported topic
- **Do:** Request training content that is not present in any approved source.
- **Expect:** insufficient source support → `Source Support Missing` / `Manual Review Required`;
  the system does **not** invent company policy.

## Notes
- All scenarios run through the same generic architecture — no hard-coded answers.
- Deterministic fallback keeps the demo working when the AI provider is rate-limited.
