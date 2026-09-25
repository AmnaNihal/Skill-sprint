# Final Submission Checklist

Status legend: ✅ done · 🟡 partial · ⏳ pending (requires deployment/media/time)

| # | Deliverable | Status | Location / notes |
|---|---|---|---|
| 1 | Project Report | 🟡 | `documentation/PROJECT_REPORT.md` (extend with screenshots/diagrams) |
| 2 | Source Code | ✅ | `backend/`, `src/` |
| 3 | Company Document Dataset | ✅ | `sample_documents/nexora/` (current + historical + metadata) |
| 4 | GenAI Pipeline Evidence | 🟡 | `genai_pipeline/`, `prompt_templates/`; runtime `generation_meta` in plans |
| 5 | Python Validation Evidence | ✅ | `python_validation/`, `/validation/{id}`, tests |
| 6 | GenAI/Python Comparison Report (≥100 rows) | ✅ | `reports/comparison_report.csv` (1666 rows) + `.json` |
| 7 | Onboarding Plans for ≥10 roles | ✅ | Plans for all 10 demo roles (100% coverage) |
| 8 | Validation Report | ✅ | `/reports/export` (CSV/JSON) |
| 9 | Security Testing Report | ✅ | `documentation/SECURITY_TESTING_REPORT.md` |
| 10 | Test Cases | ✅ | `backend/tests/` (pytest, 17 tests) |
| 11 | Installation Instructions | ✅ | `documentation/INSTALLATION.md` |
| 12 | Execution Instructions | ✅ | `documentation/EXECUTION.md` |
| 13 | GitHub Repository | ✅ | https://github.com/AmnaNihal/Skill-sprint |
| 14 | Deployed Application | ⏳ | Deployment + evaluator credentials pending |
| 15 | Demonstration Video (MP4) | ⏳ | Record main workflows |
| 16 | Technical Blog (≥2000 words) | ⏳ | Publish |
| 17 | AI Usage Declaration | ✅ | `AI_USAGE.md` |
| 18 | Final Submission Checklist | ✅ | this file |

## Dataset target tracking

| Component | Minimum | Current | Status |
|---|---|---|---|
| Company documents | 20 | 79 active (Nexora + expansion) | ✅ |
| Job roles | 10 | 10+ role descriptions | ✅ |
| Identifiable requirements | 150 | 300+ | ✅ |
| Mandatory requirements | 50 | 200+ | ✅ |
| Role-specific requirements | 30 | 60+ | ✅ |
| Conflicting/ambiguous cases | 10 | 10 (`CONFLICT-*`) | ✅ |
| Policy-version changes | 10 | 5 docs × 2 versions (`VERSION-*`) | ✅ |
| Adversarial/prompt-injection cases | 10 | 10 (`ADV-*`, all quarantined) | ✅ |

## Remaining high-value work

1. Deploy (Render/Railway) and provide an evaluator URL + credentials.
2. Record the demonstration video and publish the technical blog.
3. Add CI (pytest + `tsc`) and screenshots to the project report.

## Dataset tools

- `backend/tools/import_nexora.py` — import Nexora corpus + curated matrix
- `backend/tools/extract_nexora_ai.py` — AI requirement extraction
- `backend/tools/expand_dataset.py` — adversarial / conflict / version documents
- `backend/tools/generate_role_plans.py` — generate plans for the demo roles
- `backend/tools/export_comparison_report.py` — comparison report artifact
