"""Pipeline 1: GenAI generation (Gemini primary, OpenAI optional) + schema validation + retry."""
from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from config.settings import get_settings
from schemas.models import GenOnboardingPlan

PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompt_templates"
MAX_RETRIES = 3
PROMPT_VERSION = "v1.3"
TEMPLATE_NAME = "onboarding_plan_generation"
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
# Per-model free-tier quotas differ — try in order. 2.5-* removed (404 for this key).
GEMINI_MODEL_FALLBACKS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
]


class GenerationError(Exception):
    pass


def load_prompt(template_file: str = "onboarding_plan_v1.txt") -> str:
    path = PROMPT_DIR / template_file
    if not path.exists():
        raise GenerationError(f"Prompt template missing: {template_file}")
    return path.read_text(encoding="utf-8")


def _render(template: str, variables: dict[str, str]) -> str:
    out = template
    for k, v in variables.items():
        out = out.replace("{{" + k + "}}", v)
    return out


def _extract_json(text: str) -> Any:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end > start:
            return json.loads(text[start : end + 1])
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def _normalize_generated_shape(data: Any) -> Any:
    """Normalize small provider shape variations before strict Pydantic validation."""
    if not isinstance(data, dict):
        return data
    def text_value(value: Any, keys: tuple[str, ...]) -> str:
        if not isinstance(value, dict):
            if isinstance(value, list):
                return "; ".join(str(item) for item in value)
            return str(value)
        for key in keys:
            if value.get(key):
                return str(value[key])
        return ""

    data["stages"] = [
        text_value(value, ("stage_name", "title", "name", "stage", "label"))
        for value in _as_list(data.get("stages"))
    ]
    data["progress_recommendations"] = [
        text_value(value, ("recommendation", "text", "description", "title"))
        for value in _as_list(data.get("progress_recommendations"))
    ]
    data["explanations"] = [
        text_value(value, ("explanation", "text", "description", "title"))
        for value in _as_list(data.get("explanations"))
    ]
    modules = data.get("modules")
    if not isinstance(modules, list):
        return data
    for module in modules:
        if not isinstance(module, dict):
            continue
        for key in ("module_title", "purpose", "description", "completion_criteria", "assessment_topic"):
            if isinstance(module.get(key), list):
                module[key] = text_value(module[key], ())
        module["tasks"] = _as_list(module.get("tasks"))
        for task in module["tasks"]:
            if isinstance(task, dict):
                for key in ("title", "description", "task_type", "expected_outcome", "completion_criteria"):
                    if isinstance(task.get(key), list):
                        task[key] = text_value(task[key], ())
                if not isinstance(task.get("scenario", False), bool):
                    # Some models emit a scenario description in this boolean field.
                    task["scenario"] = False
        module["quiz"] = _as_list(module.get("quiz"))
        for quiz in module["quiz"]:
            if isinstance(quiz, dict):
                for key in ("question", "explanation"):
                    if isinstance(quiz.get(key), list):
                        quiz[key] = text_value(quiz[key], ())
        module["checklist"] = [
            item if isinstance(item, dict) else {
                "activity": str(item),
                "mandatory": bool(module.get("mandatory")),
                "due_stage": module.get("due_stage") or "Week 1",
                "source_document_id": module.get("source_document_id") or "",
                "responsible_person": "",
            }
            for item in _as_list(module.get("checklist"))
        ]
        # Drop checklist entries that merely repeat a task title (avoids duplicate findings)
        task_titles = {
            re.sub(r"\s+", " ", str(task.get("title") or "").strip().lower())
            for task in module["tasks"]
            if isinstance(task, dict)
        }
        seen_activities: set[str] = set()
        deduped_checklist = []
        for item in module["checklist"]:
            activity = re.sub(r"\s+", " ", str(item.get("activity") or "").strip().lower())
            if not activity or activity in task_titles or activity in seen_activities:
                continue
            seen_activities.add(activity)
            deduped_checklist.append(item)
        module["checklist"] = deduped_checklist
        module["assessments"] = [
            item if isinstance(item, dict) else {
                "title": str(item),
                "topic": module.get("assessment_topic") or "",
                "source_document_id": module.get("source_document_id") or "",
                "source_section_id": module.get("source_section_id") or "",
            }
            for item in _as_list(module.get("assessments"))
        ]
    return data


def _coerce_plan(data: Any, role_title: str) -> GenOnboardingPlan:
    if isinstance(data, dict) and "modules" not in data:
        for v in data.values():
            if isinstance(v, dict) and "modules" in v:
                data = v
                break
            if isinstance(v, list) and v and isinstance(v[0], dict) and "module_title" in v[0]:
                data = {"role": role_title, "modules": v}
                break
    if isinstance(data, list):
        data = {"role": role_title, "modules": data}
    if not isinstance(data, dict):
        raise GenerationError("Model did not return a JSON object")
    data.setdefault("role", role_title)
    return GenOnboardingPlan.model_validate(_normalize_generated_shape(data))


def sanitize_source_text(text: str) -> str:
    """Prompt-injection defense: neutralize instruction-like patterns in source data (SRS Step 42)."""
    patterns = [
        r"(?i)ignore\s+(all\s+)?previous\s+instructions",
        r"(?i)ignore\s+(all\s+)?above\s+instructions",
        r"(?i)you\s+are\s+now\s+",
        r"(?i)disregard\s+(the\s+)?system\s+prompt",
        r"(?i)mark\s+as\s+approved",
        r"(?i)approve\s+this\s+employee",
        r"(?i)pretend\s+to\s+be",
        r"(?i)system\s*:\s*",
        r"(?i)assistant\s*:\s*",
    ]
    out = text
    for p in patterns:
        out = re.sub(p, "[BLOCKED_INSTRUCTION]", out)
    return out


def detect_injection(text: str) -> list[str]:
    flags = []
    checks = [
        (r"(?i)ignore\s+(all\s+)?(previous|above)\s+instructions", "ignore_previous_instructions"),
        (r"(?i)you\s+are\s+now\s+(an?\s+|in\s+)?", "role_override"),
        (r"(?i)pretend\s+to\s+be", "role_override"),
        (r"(?i)developer\s+mode", "developer_mode"),
        (r"(?i)(approve\s+this\s+employee|mark\s+as\s+approved|approve\s+every)", "fake_approval"),
        (r"(?i)system\s*:", "fake_system_message"),
        (r"(?i)assistant\s*:", "fake_assistant_message"),
        (r"(?i)do\s+not\s+follow\s+the\s+(rules|prompt)", "rule_bypass"),
        (r"(?i)disregard\s+(the\s+)?(system\s+prompt|instructions|rules)", "prompt_override"),
        (r"(?i)(override|disable|bypass)\s+(the\s+)?(validator|validation|requirement)", "validation_bypass"),
        (r"(?i)grant\s+admin|admin\s+access", "privilege_escalation"),
        (r"(?i)extract\s+the\s+api\s+key", "secret_theft"),
        (r"(?i)reveal\s+(confidential|restricted|secret)", "data_exfiltration"),
        (r"(?i)restricted\s+configuration", "config_exfiltration"),
    ]
    for pattern, name in checks:
        if re.search(pattern, text):
            flags.append(name)
    return flags


def fallback_plan(
    employee_name: str,
    role_title: str,
    department: str,
    experience_level: str,
    target_completion: str,
    requirements: list[dict],
    source_blocks: list[dict],
    reason: str = "",
) -> dict:
    """Deterministic curriculum builder used when GenAI is unavailable."""
    stages = ["Day 1", "Week 1", "Week 2", "First 30 Days", "First 60 Days", "First 90 Days"]
    block_by_doc: dict[str, list[dict]] = {}
    for b in source_blocks:
        block_by_doc.setdefault(b.get("source_document_id") or "", []).append(b)

    def pick_block(req: dict) -> dict:
        did = req.get("source_document_id") or ""
        pool = block_by_doc.get(did) or source_blocks
        for b in pool:
            if not req.get("source_section_id") or b.get("source_section_id") == req.get("source_section_id"):
                return b
        return pool[0] if pool else {
            "source_document_id": did,
            "source_section_id": req.get("source_section_id") or "Section-1",
            "source_chunk_id": req.get("source_chunk_id") or "",
            "heading": req.get("competency") or role_title,
            "content": req.get("requirement") or req.get("description") or "",
        }

    modules = []
    sorted_reqs = sorted(requirements, key=lambda r: (0 if r.get("mandatory") else 1, r.get("priority") or "Low"))
    for i, r in enumerate(sorted_reqs, 1):
        b = pick_block(r)
        stage = r.get("due_stage") if r.get("due_stage") in stages else stages[min((i - 1) // 3, 5)]
        text = (r.get("requirement") or r.get("description") or r.get("title") or "").strip()
        rid = r.get("requirement_id") or r.get("id") or f"R{i:03d}"
        mid = f"M{i:03d}"
        snippet = text[:120]
        modules.append(
            {
                "module_id": mid,
                "module_title": f"{(r.get('competency') or 'Competency')} · {rid}",
                "purpose": text or f"Cover requirement {rid}",
                "description": text,
                "role": role_title,
                "department": department or "",
                "mandatory": bool(r.get("mandatory")),
                "due_stage": stage,
                "priority": r.get("priority") or "Medium",
                "estimated_hours": 1,
                "difficulty": experience_level if experience_level in ("Beginner", "Intermediate", "Advanced") else "Beginner",
                "learning_objectives": [f"Apply: {snippet}" if snippet else f"Cover {rid}"],
                "key_concepts": [r.get("competency") or role_title],
                "source_document_id": b.get("source_document_id") or r.get("source_document_id") or "",
                "source_section_id": b.get("source_section_id") or r.get("source_section_id") or "Section-1",
                "source_citations": [rid],
                "prerequisites": [],
                "assessment_topic": r.get("assessment_topic") or (r.get("competency") or ""),
                "completion_criteria": "Complete task and pass quiz with >=80%",
                "requirement_id": rid,
                "requirement_ids": [rid],
                "tasks": [
                    {
                        "id": f"{mid}-T01",
                        "title": f"Study {rid}",
                        "description": text,
                        "task_type": "Reading",
                        "difficulty": "Beginner",
                        "due_stage": stage,
                        "estimated_minutes": 30,
                        "mandatory": bool(r.get("mandatory")),
                        "expected_outcome": "Demonstrate understanding of the requirement",
                        "completion_criteria": "Task marked complete",
                        "source_document_id": b.get("source_document_id") or r.get("source_document_id") or "",
                        "source_section_id": b.get("source_section_id") or r.get("source_section_id") or "Section-1",
                        "requirement_id": rid,
                        "scenario": False,
                        "completed": False,
                    }
                ],
                "quiz": [
                    {
                        "id": f"{mid}-Q01",
                        "question": f"Which source governs {rid}? ({snippet or 'policy control'})",
                        "question_type": "multiple_choice",
                        "options": [
                            f"{b.get('source_document_id') or r.get('source_document_id')} section {b.get('source_section_id')}",
                            "Unrelated external blog",
                            "No source document",
                            "Personal opinion",
                        ],
                        "correct_answer": [0],
                        "explanation": f"Cited by {rid} from source document.",
                        "difficulty": "Beginner",
                        "source_document_id": b.get("source_document_id") or r.get("source_document_id") or "",
                        "source_section_id": b.get("source_section_id") or r.get("source_section_id") or "Section-1",
                        "requirement_id": rid,
                    }
                ],
                "checklist": [],
                "assessments": [],
            }
        )

    plan = {
        "role": role_title,
        "department": department or "",
        "employee_name": employee_name or "",
        "target_completion": target_completion or "30 Days",
        "stages": stages,
        "modules": modules,
        "progress_recommendations": [
            "Complete Day-1 mandatory modules first",
            "Re-run validation after policy updates",
        ],
        "explanations": [reason or "Built from role requirement matrix (GenAI unavailable)"],
    }
    meta = {
        "prompt_version": "fallback-v1",
        "template_name": TEMPLATE_NAME,
        "model": "python-fallback",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "retries": 0,
        "retry_log": [f"fallback:{reason}"] if reason else ["fallback"],
        "source_document_versions": sorted({b.get("source_document_id", "") for b in source_blocks if b.get("source_document_id")}),
    }
    return {"plan": plan, "meta": meta}


def _supplement_missing_requirements(
    plan: dict,
    requirements: list[dict],
    source_blocks: list[dict],
    employee_name: str,
    role_title: str,
    department: str,
    experience_level: str,
    target_completion: str,
) -> list[str]:
    """Append source-cited modules when a compact AI response omits matrix requirements."""
    covered = {
        requirement_id
        for module in plan.get("modules") or []
        for requirement_id in module.get("requirement_ids") or []
    }
    missing = [
        requirement
        for requirement in requirements
        if (requirement.get("requirement_id") or requirement.get("id")) not in covered
    ]
    if not missing:
        return []
    supplement = fallback_plan(
        employee_name, role_title, department, experience_level, target_completion,
        missing, source_blocks, reason="AI coverage supplement",
    )["plan"]
    start = len(plan.get("modules") or []) + 1
    for index, module in enumerate(supplement["modules"], start):
        module_id = f"M{index:03d}"
        module["module_id"] = module_id
        for task_index, task in enumerate(module.get("tasks") or [], 1):
            if isinstance(task, dict):
                task["id"] = f"{module_id}-T{task_index:02d}"
        for quiz_index, quiz in enumerate(module.get("quiz") or [], 1):
            if isinstance(quiz, dict):
                quiz["id"] = f"{module_id}-Q{quiz_index:02d}"
    plan.setdefault("modules", []).extend(supplement["modules"])
    return [str(requirement.get("requirement_id") or requirement.get("id")) for requirement in missing]


STAGE_ORDER = ["Day 1", "Week 1", "Week 2", "First 30 Days", "First 60 Days", "First 90 Days"]


def _align_due_stages(plan: dict, requirements: list[dict]) -> int:
    """Schedule each module at the earliest stage among the matrix requirements it covers.

    AI models group several requirements per module; without alignment a module that covers a
    Day-1 requirement can be scheduled later, which the validator correctly flags.
    """
    stage_by_req = {}
    for requirement in requirements:
        requirement_id = requirement.get("requirement_id") or requirement.get("id")
        stage = requirement.get("due_stage")
        if requirement_id and stage in STAGE_ORDER:
            stage_by_req[requirement_id] = stage
    changed = 0
    for module in plan.get("modules") or []:
        ids = list(module.get("requirement_ids") or [])
        if module.get("requirement_id") and module["requirement_id"] not in ids:
            ids.append(module["requirement_id"])
        stages = [stage_by_req[req_id] for req_id in ids if req_id in stage_by_req]
        if not stages:
            continue
        earliest = min(stages, key=STAGE_ORDER.index)
        if module.get("due_stage") != earliest:
            module["due_stage"] = earliest
            changed += 1
        for task in module.get("tasks") or []:
            if isinstance(task, dict) and task.get("due_stage") in STAGE_ORDER:
                if STAGE_ORDER.index(task["due_stage"]) > STAGE_ORDER.index(earliest):
                    task["due_stage"] = earliest
    return changed


def _enforce_module_mandatory(plan: dict, requirements: list[dict]) -> int:
    """Mark a module (and its tasks) mandatory when it covers any mandatory requirement."""
    mandatory_ids = {
        str(r.get("requirement_id") or r.get("id"))
        for r in requirements
        if r.get("mandatory")
    }
    changed = 0
    for module in plan.get("modules") or []:
        covered = {str(x) for x in (module.get("requirement_ids") or [])}
        if module.get("requirement_id"):
            covered.add(str(module["requirement_id"]))
        if covered & mandatory_ids and not module.get("mandatory"):
            module["mandatory"] = True
            changed += 1
        if module.get("mandatory"):
            for task in module.get("tasks") or []:
                if isinstance(task, dict):
                    task["mandatory"] = True
    return changed


def _drop_dangling_prerequisites(plan: dict) -> int:
    """Remove prerequisite references that do not match any module (avoids false sequence errors)."""
    module_ids: set[str] = set()
    module_titles: set[str] = set()
    for module in plan.get("modules") or []:
        module_ids.add(str(module.get("module_id") or ""))
        module_ids.add(str(module.get("id") or ""))
        module_titles.add(str(module.get("module_title") or ""))
        module_titles.add(str(module.get("title") or ""))
    removed = 0
    for module in plan.get("modules") or []:
        prerequisites = list(module.get("prerequisites") or [])
        kept = [p for p in prerequisites if str(p) in module_ids or str(p) in module_titles]
        if len(kept) != len(prerequisites):
            removed += len(prerequisites) - len(kept)
            module["prerequisites"] = kept
    return removed


def _requirements_payload(requirements: list[dict]) -> str:
    return json.dumps(
        [
            {
                "id": r.get("requirement_id") or r.get("id"),
                "requirement_id": r.get("requirement_id") or r.get("id"),
                "title": r.get("title") or r.get("requirement"),
                "requirement": r.get("requirement") or r.get("description"),
                "description": r.get("description") or r.get("requirement"),
                "role": r.get("role") or r.get("role_title"),
                "requirement_type": r.get("requirement_type"),
                "mandatory": r.get("mandatory"),
                "priority": r.get("priority"),
                "due_stage": r.get("due_stage"),
                "assessment_topic": r.get("assessment_topic"),
                "source_document_id": r.get("source_document_id"),
                "source_section_id": r.get("source_section_id"),
            }
            for r in requirements
        ],
        indent=2,
    )


def _call_gemini(system_part: str, user_part: str, model: str, api_key: str) -> str:
    url = f"{GEMINI_BASE}/models/{model}:generateContent"
    body = {
        "systemInstruction": {"parts": [{"text": system_part}]},
        "contents": [{"role": "user", "parts": [{"text": user_part}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    with httpx.Client(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
        resp = client.post(url, json=body, headers={"x-goog-api-key": api_key, "Content-Type": "application/json"})
        if resp.status_code >= 400:
            raise GenerationError(f"Gemini HTTP {resp.status_code}: {resp.text[:400]}")
        data = resp.json()
    try:
        # finishReason may be MAX_TOKENS with partial JSON
        cand = data["candidates"][0]
        parts = cand.get("content", {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts)
        if not text:
            raise GenerationError(f"Empty Gemini response: {str(data)[:300]}")
        return text
    except GenerationError:
        raise
    except Exception as e:
        raise GenerationError(f"Gemini response parse failed: {e}: {str(data)[:300]}") from e


def _gemini_models(settings) -> list[str]:
    primary = (settings.gemini_model or GEMINI_MODEL_FALLBACKS[0]).strip()
    ordered = [primary]
    for m in GEMINI_MODEL_FALLBACKS:
        if m not in ordered:
            ordered.append(m)
    return ordered


def _call_gemini_with_model_fallback(system_part: str, user_part: str, api_key: str, log: list[str]) -> tuple[str, str]:
    """Try preferred Gemini models; only cascade on overload/503 (shared free-tier quota on 429)."""
    errors: list[str] = []
    for model in _gemini_models(get_settings()):
        try:
            raw = _call_gemini(system_part, user_part, model, api_key)
            return raw, model
        except Exception as e:
            errors.append(f"{model}:{e}")
            log.append(f"gemini_model_{model}:{type(e).__name__}:{e}")
            msg = str(e).lower()
            # auth: other models fail the same way
            if "api key not valid" in msg or "api_key_invalid" in msg or "permission" in msg or "401" in msg:
                raise
            # 429/503/404/timeout: quotas are per-model — try next
            continue
    raise GenerationError("All Gemini models failed: " + " | ".join(errors[-3:]))


def _call_openai(system_part: str, user_part: str, model: str, api_key: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_part},
            {"role": "user", "content": user_part},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
        max_tokens=8000,
        timeout=60,
    )
    return resp.choices[0].message.content or ""


def _call_deepseek(system_part: str, user_part: str, model: str, api_key: str) -> str:
    """DeepSeek exposes an OpenAI-compatible chat-completions API."""
    from openai import OpenAI

    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_part},
            {"role": "user", "content": user_part},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
        max_tokens=8000,
        timeout=90,
    )
    return resp.choices[0].message.content or ""


def generate_onboarding_plan(
    employee_name: str,
    role_title: str,
    department: str,
    experience_level: str,
    target_completion: str,
    joining_date: str,
    requirements: list[dict],
    source_blocks: list[dict],
) -> dict:
    """Generate plan via Gemini (default) or OpenAI; fall back to deterministic builder on failure."""
    settings = get_settings()
    template = load_prompt()
    cleaned_blocks = []
    for b in source_blocks:
        cleaned_blocks.append(
            {
                "source_document_id": b.get("source_document_id", ""),
                "source_section_id": b.get("source_section_id", ""),
                "source_chunk_id": b.get("source_chunk_id", ""),
                "heading": b.get("heading", ""),
                "content": sanitize_source_text(b.get("content", "")),
                "injection_flags": detect_injection(b.get("content", "")),
            }
        )

    prompt = _render(
        template,
        {
            "employee_name": employee_name,
            "role_title": role_title,
            "department": department or "-",
            "experience_level": experience_level,
            "target_completion": target_completion,
            "joining_date": joining_date or "-",
            "requirements_json": _requirements_payload(requirements),
            "source_blocks": json.dumps(cleaned_blocks, indent=2),
        },
    )
    system_part = template.split("USER:")[0].replace("SYSTEM:", "").strip()
    user_part = prompt.split("USER:", 1)[-1].strip() if "USER:" in prompt else prompt

    provider = (settings.ai_provider or "gemini").lower()
    if provider not in ("deepseek", "gemini", "openai", "fallback"):
        provider = "deepseek"

    # Respect the selected provider. Fallback is handled locally after provider retries.
    order: list[str] = []
    if provider == "deepseek":
        order = ["deepseek"]
    elif provider == "gemini":
        order = ["gemini"]
    elif provider == "openai":
        order = ["openai"]
        if settings.gemini_api_key:
            order.append("gemini")
    else:
        order = []

    log: list[str] = []
    last_err: Exception | None = None
    should_fallback = True
    openai_hard_fail = False

    for attempt in range(1, MAX_RETRIES + 1):
        for p in order:
            if p == "openai" and openai_hard_fail:
                continue
            try:
                log.append(f"attempt_{attempt}:{p}")
                if p == "deepseek":
                    if not settings.deepseek_api_key:
                        last_err = GenerationError("DEEPSEEK_API_KEY not configured")
                        log.append(f"skip_{p}:no_key")
                        continue
                    raw = _call_deepseek(system_part, user_part, settings.deepseek_model, settings.deepseek_api_key)
                    model_name = settings.deepseek_model
                elif p == "gemini":
                    if not settings.gemini_api_key:
                        last_err = GenerationError("GEMINI_API_KEY not configured")
                        log.append(f"skip_{p}:no_key")
                        continue
                    raw, model_name = _call_gemini_with_model_fallback(
                        system_part, user_part, settings.gemini_api_key, log
                    )
                else:
                    if not settings.openai_api_key:
                        last_err = GenerationError("OPENAI_API_KEY not configured")
                        log.append(f"skip_{p}:no_key")
                        continue
                    raw = _call_openai(system_part, user_part, settings.openai_model, settings.openai_api_key)
                    model_name = settings.openai_model

                data = _extract_json(raw)
                plan = _coerce_plan(data, role_title)
                plan_data = plan.model_dump()
                supplemented_ids = _supplement_missing_requirements(
                    plan_data, requirements, source_blocks, employee_name, role_title,
                    department, experience_level, target_completion,
                )
                aligned_modules = _align_due_stages(plan_data, requirements)
                _enforce_module_mandatory(plan_data, requirements)
                _drop_dangling_prerequisites(plan_data)
                plan = _coerce_plan(plan_data, role_title)
                meta = {
                    "prompt_version": PROMPT_VERSION,
                    "template_name": TEMPLATE_NAME,
                    "model": model_name,
                    "provider": p,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "retries": attempt - 1,
                    "retry_log": log,
                    "source_document_versions": sorted(
                        {b.get("source_document_id", "") for b in cleaned_blocks if b.get("source_document_id")}
                    ),
                    "coverage_supplemented_requirement_ids": supplemented_ids,
                    "stage_aligned_modules": aligned_modules,
                }
                return {"plan": plan.model_dump(), "meta": meta}
            except Exception as e:
                last_err = e
                msg = str(e).lower()
                log.append(f"error_{p}_{attempt}:{type(e).__name__}:{e}")
                # OpenAI hard-dead: stop using it
                if p == "openai" and any(s in msg for s in ("insufficient_quota", "credit_balance", "invalid_api_key")):
                    openai_hard_fail = True
                    log.append("openai_disabled")
                    continue
                # Gemini free-tier 429: short wait then outer retry (shared quota)
                if p == "gemini" and ("429" in msg or "quota" in msg):
                    time.sleep(min(5 * attempt, 15))
                    continue
                if "503" in msg or "unavailable" in msg:
                    time.sleep(min(2 * attempt, 6))
                    continue
                time.sleep(min(attempt, 3))

    # If every provider hard-failed on quota/auth, still fall back (SRS: never leave user empty-handed)
    reason = f"Generation failed after retries: {last_err}"
    if should_fallback or last_err is None:
        return fallback_plan(
            employee_name, role_title, department, experience_level, target_completion,
            requirements, source_blocks, reason=str(last_err) if last_err else reason,
        )
    raise GenerationError(reason)
