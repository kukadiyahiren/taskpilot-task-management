"""Generate actionable task proposals from meeting context via OpenAI-compatible API."""

from __future__ import annotations

import json
import os
from typing import Any, List

import httpx

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")


class AIConfigError(RuntimeError):
    pass


class AIGenerationError(RuntimeError):
    pass


async def generate_tasks_from_context(
    *,
    meeting_title: str,
    meeting_description: str | None,
    notes_combined: str,
    max_tasks: int = 8,
    extra_context: str | None = None,
    model: str | None = None,
) -> List[dict[str, Any]]:
    if not OPENAI_API_KEY:
        raise AIConfigError(
            "OPENAI_API_KEY is not set. Add it to .env to enable AI task generation."
        )
    use_model = (model or OPENAI_MODEL).strip()
    payload_desc = (meeting_description or "").strip()
    notes = notes_combined.strip()
    extra = (extra_context or "").strip()
    user_prompt = {
        "meeting_title": meeting_title,
        "meeting_description": payload_desc,
        "meeting_notes": notes,
        "extra_instructions": extra,
        "max_tasks": max_tasks,
    }
    system = (
        "You turn meeting information into concrete follow-up tasks for a task board. "
        "Respond with a single JSON object only, no markdown, shape: "
        '{"tasks":[{"title":"short imperative title","description":"context and acceptance criteria"}]}. '
        "Titles must be actionable (verb-first). Descriptions should be 1–3 sentences. "
        "Do not exceed max_tasks items."
    )
    body = {
        "model": use_model,
        "temperature": 0.4,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": json.dumps(user_prompt, ensure_ascii=False),
            },
        ],
    }
    url = f"{OPENAI_BASE_URL}/chat/completions"
    async with httpx.AsyncClient(timeout=90.0) as client:
        r = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=body,
        )
    if r.status_code >= 400:
        raise AIGenerationError(
            f"LLM API error {r.status_code}: {r.text[:500]}"
        )
    data = r.json()
    try:
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        tasks = parsed.get("tasks") or []
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise AIGenerationError(f"Unexpected LLM response shape: {e}") from e
    out: List[dict[str, Any]] = []
    for item in tasks[:max_tasks]:
        if not isinstance(item, dict):
            continue
        title = (item.get("title") or "").strip()
        if not title:
            continue
        desc = item.get("description")
        out.append(
            {
                "title": title[:200],
                "description": (desc or "").strip()[:4000] if desc else None,
            }
        )
    return out
