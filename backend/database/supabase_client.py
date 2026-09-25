"""Thin Supabase PostgREST client using the publishable key (no JWT validation)."""
from __future__ import annotations

from functools import lru_cache
from typing import Any, Optional

import httpx

from config.settings import get_settings


class RestQuery:
    def __init__(self, client: "SupabaseRestClient", table: str):
        self._client = client
        self._table = table
        self._select = "*"
        self._filters: list[tuple[str, str, Any]] = []
        self._order: Optional[tuple[str, bool]] = None
        self._limit: Optional[int] = None
        self._offset: Optional[int] = None
        self._method = "GET"
        self._payload: Any = None
        self._headers: dict[str, str] = {}
        self._count: Optional[str] = None

    def select(self, columns: str = "*", count: Optional[str] = None) -> "RestQuery":
        self._select = columns
        self._count = count
        if self._method == "GET":
            self._method = "GET"
        return self

    def insert(self, row: dict | list[dict]) -> "RestQuery":
        self._method = "POST"
        self._payload = row
        self._headers["Prefer"] = "return=representation"
        return self

    def update(self, row: dict) -> "RestQuery":
        self._method = "PATCH"
        self._payload = row
        self._headers["Prefer"] = "return=representation"
        return self

    def delete(self) -> "RestQuery":
        self._method = "DELETE"
        return self

    def eq(self, column: str, value: Any) -> "RestQuery":
        if isinstance(value, bool):
            v = "true" if value else "false"
        else:
            v = str(value)
        self._filters.append((column, "eq", v))
        return self

    def neq(self, column: str, value: Any) -> "RestQuery":
        self._filters.append((column, "neq", str(value)))
        return self

    def order(self, column: str, desc: bool = False) -> "RestQuery":
        self._order = (column, desc)
        return self

    def limit(self, n: int) -> "RestQuery":
        self._limit = n
        return self

    def offset(self, n: int) -> "RestQuery":
        self._offset = n
        return self

    def execute(self) -> Any:
        return self._client._request(self)


class RestResult:
    def __init__(self, data: Any, count: Optional[int] = None):
        self.data = data
        self.count = count


class SupabaseRestClient:
    def __init__(self, url: str, key: str, timeout: float = 30.0):
        self._url = url.rstrip("/")
        self._key = key
        self._client = httpx.Client(
            base_url=self._url,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )

    def table(self, name: str) -> RestQuery:
        return RestQuery(self, name)

    def from_(self, name: str) -> RestQuery:
        return self.table(name)

    def _request(self, q: RestQuery) -> RestResult:
        params: list[tuple[str, str]] = []
        select = q._select
        if q._method == "GET":
            params.append(("select", select))
        for col, op, val in q._filters:
            params.append((col, f"{op}.{val}"))
        if q._order:
            col, desc = q._order
            params.append(("order", f"{col}.{'desc' if desc else 'asc'}"))
        if q._limit is not None:
            params.append(("limit", str(q._limit)))
        if q._offset is not None:
            params.append(("offset", str(q._offset)))

        path = f"/rest/v1/{q._table}"
        headers = dict(q._headers)
        if q._count and q._method == "GET":
            headers["Prefer"] = "count=exact"

        resp = self._client.request(q._method, path, params=params, json=q._payload, headers=headers)
        if resp.status_code >= 400:
            raise RuntimeError(f"Supabase REST {resp.status_code}: {resp.text[:500]}")

        count = None
        content_range = resp.headers.get("content-range") or resp.headers.get("x-total-count")
        if content_range and "/" in str(content_range):
            try:
                count = int(str(content_range).split("/")[-1])
            except ValueError:
                count = None
        elif content_range and str(content_range).isdigit():
            count = int(content_range)

        if resp.status_code == 204 or not resp.content:
            data = [] if q._method in ("DELETE", "PATCH") else None
            if q._method == "POST":
                data = []
            return RestResult(data=data, count=count)

        try:
            data = resp.json()
        except Exception:
            data = None
        return RestResult(data=data, count=count)

    # auth stubs so older call sites don't explode if hit accidentally
    class _Auth:
        def sign_up(self, *a, **k):
            raise RuntimeError("Supabase auth not used; use /auth/login")

        def sign_in_with_password(self, *a, **k):
            raise RuntimeError("Supabase auth not used; use /auth/login")

        def sign_out(self, *a, **k):
            return None

        def get_user(self, *a, **k):
            raise RuntimeError("Supabase auth not used; use backend JWT")

    auth = _Auth()


@lru_cache
def get_supabase() -> SupabaseRestClient:
    s = get_settings()
    return SupabaseRestClient(s.supabase_url, s.supabase_key)
