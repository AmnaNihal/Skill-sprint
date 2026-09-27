# Demonstration Video Script (MP4)

A shot-by-shot script for the required demonstration video. Each step lists what to show and the
expected visible result. Record at http://localhost:3000 (or the deployed URL).

## Preparation
- Start backend + frontend.
- Have the fictional dataset ready: `sample_documents/nexora/`.
- Have an adversarial file ready: `sample_documents/nexora/current/NEX-ADV-001_*.docx`.

## Steps (SRS §66)

1. **Login** — sign in as `admin@skillsprint.local` / `admin123`. Show the admin dashboard.
2. **Document upload** — open **Documents → Upload New Document**.
3. **Processing preview** — select a valid company DOCX; show the immediate "Processing results"
   panel (Python sections/chunks, AI document type + confidence, requirement count) and auto-filled
   metadata.
4. **Parsing & rejection** — select a lorem/placeholder file; show it marked **Rejected** with the
   reason and the ingest button disabled.
5. **Role creation** — **Requirement Matrix**: show role-wise requirements and add one manually.
6. **Requirement Matrix** — filter a role; open a requirement to show its source document/section.
7. **Employee creation** — **Employees**: add a new employee (role, department, experience, joining).
8. **Personalized onboarding generation** — **Generate Plan**: pick the employee/role, submit.
9. **Learning modules** — open the plan; show modules with objectives and key concepts.
10. **Checklist** — show checklist items (mandatory, due stage, source).
11. **Tasks** — show practical tasks with expected outcome and source.
12. **Quiz** — open the Quiz modal; show a question with options, correct answer, explanation, source.
13. **Structured GenAI JSON** — show `generation_meta` (provider/model/prompt version) and that the
    output is structured (modules/tasks/quizzes).
14. **Python validation** — open **Validation**; show findings and the summary (coverage,
    traceability, consistency, status).
15. **GenAI/Python comparison** — show requirement-level comparison rows.
16. **Coverage score** — highlight the coverage score; note 100% for approved plans.
17. **Traceability** — highlight 100% traceability and a source citation.
18. **Hallucination detection** — show an item flagged as unsupported / source support missing.
19. **Contradiction detection** — show a contradiction finding (or an FAQ-vs-policy conflict case).
20. **Prompt-injection protection** — upload `NEX-ADV-001`; show it **Quarantined** with injection
    flags and that it produces no requirements.
21. **Manual review** — **Reviews**: approve/reject a plan with a comment; show the audit record.
22. **Employee progress** — log in as `learner@skillsprint.local`; complete a task; show progress and
    adaptive recommendations.
23. **Policy update** — upload a new document version (`/policy/upload-version`); show supersede and
    impact analysis (`/policy/impact/{document_id}`).
24. **Selective regeneration** — regenerate only the affected modules; show the revalidated status.

## Closing
- Show `/reports/export` and `reports/comparison_report.csv` / `reports/validation_report.csv`.
- Mention limitations and the deterministic validation guarantee.

## Recording tips
- Keep it under ~10 minutes; use 1080p.
- Zoom into scores, statuses, and source citations.
- Read each on-screen status aloud (e.g., "Verified", "Quarantined", "Outdated Source").
