# Manual Testing Guide

A step-by-step checklist to verify SkillSprint AI by hand. Each test has an ID, steps, the
expected result, and a place to record evidence for the submission report.

## 0. Preconditions

- Backend running: `python -m uvicorn main:app --host 127.0.0.1 --port 8000`
- Frontend running: `npm run dev` → <http://localhost:3000>
- Accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@skillsprint.local` | `admin123` |
| Reviewer | `reviewer@skillsprint.local` | `reviewer123` |
| Training Manager | `training@skillsprint.local` | `training123` |
| Manager | `manager@skillsprint.local` | `manager123` |
| Learner | `learner@skillsprint.local` | `learner123` |

**Evidence to capture for every test:** screenshot/URL, request body + response, or the CSV row.

---

## 1. Authentication & access control

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| A1 | Log in with each of the 5 accounts | Each reaches its role dashboard | |
| A2 | Wrong password for admin | `401` / "Invalid email or password" | |
| A3 | As **learner**, try `POST /plans/generate` | `403` Admin access required | |
| A4 | As **learner**, toggle a task on another employee's plan | `403` You can only update your own plan | |
| A5 | Call an endpoint with no token | `401` | |

API example (PowerShell):

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/auth/login -ContentType 'application/json' `
  -Body '{"email":"admin@skillsprint.local","password":"admin123"}'
$h = @{ Authorization = "Bearer $($login.access_token)" }
Invoke-RestMethod -Uri http://127.0.0.1:8000/auth/me -Headers $h
```

---

## 2. Document ingestion, parsing & chunking

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| D1 | `Documents → Upload New Document`, choose a PDF | Document appears, `chunks` + `requirements_extracted` reported | |
| D2 | Upload a DOCX of the same content | Duplicate rejected (content hash) | |
| D3 | Select a **whole folder** (Nexora `current/`) | Multiple docs processed; DOCX preferred over duplicate PDF | |
| D4 | Open a document's chunks (`GET /documents/{id}/chunks`) | Section/heading/page references present | |
| D5 | Upload `sample_documents/nexora/current/NEX-ADV-001_*.docx` | Status `Quarantined`, injection flags shown | |

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/documents -Headers $h | Select-Object id,title,status
Invoke-RestMethod -Uri http://127.0.0.1:8000/documents/NEX-ENG-SOP-001/chunks -Headers $h
```

---

## 3. Role Requirement Matrix

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| M1 | `Requirement Matrix` view | Requirements per role, mandatory flags | |
| M2 | Filter by `Software Engineer` | Only that role + `All Roles` requirements | |
| M3 | Check a requirement's source | Source document/section/chunk present | |
| M4 | Add a requirement manually | Appears in the matrix | |

---

## 3b. Employee profile management

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| E1 | Open `Employees` view | Employee list with ID, name, role, dept, experience, joining, manager, training status | |
| E2 | Search by name/ID/role | Filtered results | |
| E3 | Filter by role and training status | Only matching employees | |
| E4 | `Add Employee` (name + role required) | New employee created and listed | |
| E5 | Edit an employee (experience, dept, status, joining) | Changes persisted | |
| E6 | Open a profile (view icon) | Training plans + required competencies shown | |
| E7 | Delete an employee | Removed; profile GET returns `404` | |
| E8 | Missing name/role on create | Rejected with message | |

```powershell
$emp  = Invoke-RestMethod -Uri http://127.0.0.1:8000/employees -Headers $h
$one  = Invoke-RestMethod -Uri http://127.0.0.1:8000/employees/<employee_id> -Headers $h
$body = @{ full_name='Test Emp'; role='Data Analyst'; department='Analytics'; experience_level='Intermediate'; joining_date='2026-11-01' } | ConvertTo-Json
$new  = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/employees -ContentType 'application/json' -Headers $h -Body $body
$upd  = Invoke-RestMethod -Method Put  -Uri "http://127.0.0.1:8000/employees/$($new.employee_id)" -ContentType 'application/json' -Headers $h -Body (@{ experience_level='Advanced' } | ConvertTo-Json)
Invoke-RestMethod -Method Delete -Uri "http://127.0.0.1:8000/employees/$($new.employee_id)" -Headers $h
```

---

## 4. Pipeline 1 — GenAI plan generation

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| G1 | `Generate Plan` → Software Engineer → submit | Plan created, structured modules/tasks/quizzes | |
| G2 | Inspect `generation_meta` | `model` = `deepseek-chat` (or configured), prompt version | |
| G3 | Check a module | Has source_document_id, requirement_ids, due_stage | |
| G4 | Repeat generation for another role (e.g. Data Analyst) | Different modules/content | |

```powershell
$body = @{ employee_name='Manual Test'; role_title='Software Engineer'; role='Software Engineer';
  department='Engineering'; experience_level='Beginner'; joining_date='2026-10-01'; target_completion='90 Days' } | ConvertTo-Json
$plan = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/plans/generate -ContentType 'application/json' -Headers $h -Body $body
$plan | Select-Object plan_id,status,verification_status,scores,modules,tasks
```

---

## 5. Pipeline 2 — Python validation

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| V1 | Open `Validation` for the new plan | Findings + summary (coverage/traceability/consistency) | |
| V2 | Confirm a fully covered plan | `Verified`, coverage 100 | |
| V3 | Deliberately remove a requirement from the matrix (or use a plan missing one) | Coverage drops, status not `Verified`, missing listed | |
| V4 | `Revalidate` | Recomputes the same result | |
| V5 | Check traceability | Every item cites an approved document | |

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/validation/<plan_id> -Headers $h
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/plans/<plan_id>/revalidate -Headers $h
```

---

## 6. Comparison & consistency

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| C1 | Export report (`Reports → Export`) | CSV/JSON with requirement-level comparison rows | |
| C2 | Run consistency check | Consistency score + missing/extra requirement lists | |

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/plans/<plan_id>/consistency -Headers $h
Invoke-WebRequest -Uri http://127.0.0.1:8000/reports/export -Headers $h -OutFile report.csv
```

---

## 7. Human review

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| R1 | As reviewer, open `Reviews` | Pending plans listed | |
| R2 | Approve with a comment | Status `Approved`, review recorded | |
| R3 | Reject another plan | Status `Rejected` | |
| R4 | Re-open the plan | Original validation preserved + decision appended | |

---

## 8. Learner experience

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| L1 | Log in as learner, open dashboard | Progress, modules, tasks | |
| L2 | Complete a task | Progress increases | |
| L3 | View recommendations | Mandatory incomplete modules / weak areas listed | |

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/dashboard/learner/<plan_id> -Headers $h
```

---

## 9. Policy update — impact analysis & selective regeneration

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| P1 | `GET /policy/precedence` | 4-level hierarchy returned | |
| P2 | `GET /policy/impact/{document_id}` | Affected modules/quizzes/plans/employees | |
| P3 | `POST /policy/upload-version` (new version of a doc) | Previous version inactive, old requirements `Superseded`, new requirements extracted | |
| P4 | `POST /policy/regenerate` for an affected plan | Only affected modules replaced, coverage back to 100, revalidated | |

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/policy/impact/NEX-ENG-SOP-001 -Headers $h
$rg = @{ plan_id=<plan_id>; document_id='NEX-ENG-SOP-001' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/policy/regenerate -ContentType 'application/json' -Headers $h -Body $rg
```

---

## 10. Security & prompt injection

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| S1 | Upload `NEX-ADV-001_*.docx` | Quarantined; excluded from requirement extraction | |
| S2 | Upload a doc containing "Ignore all previous instructions..." | Flagged/quarantined | |
| S3 | Confirm a quarantined doc produces no requirements | 0 source-linked requirements for it | |
| S4 | Attempt learner→admin actions | `403` | |
| S5 | Verify no secrets in repo | `.env` not tracked; only `.env.example` | |

---

## 11. Hidden-input readiness

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| H1 | Create a **new role** (`POST /roles`) | Role appears in matrix/roles list | |
| H2 | Upload a **new document** and extract requirements | Requirements linked to the new source | |
| H3 | Generate a plan for the new role | Plan produced and validated | |
| H4 | Upload an **updated policy** and regenerate | Impact analysis + selective regeneration work | |

> Rule: do not hard-code results. New inputs must flow through the same generic pipeline.

---

## 12. Boundary / negative tests

| ID | Steps | Expected | ✅ |
|---|---|---|---|
| B1 | Upload an empty file | Rejected ("Empty document") | |
| B2 | Upload an unsupported type (e.g. `.exe`) | Rejected | |
| B3 | Request a non-existent plan id | `404` | |
| B4 | `POST /plans/generate` with an unknown role | `400` (no requirements) or clear error | |
| B5 | While AI quota exhausted | Deterministic fallback plan, still validated | |
| B6 | Very large document (> 25 MB) | Rejected | |

---

## 13. Suggested evidence sheet

| Test ID | Date | Tester | Result (Pass/Fail) | Evidence link/file | Notes |
|---|---|---|---|---|---|
| A1 | | | | | |
| D1 | | | | | |
| V2 | | | | | |
| P4 | | | | | |
| S1 | | | | | |

Use this sheet to fill `reports/` and the Project Report's testing section.
