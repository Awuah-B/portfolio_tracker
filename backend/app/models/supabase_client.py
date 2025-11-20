"""Lightweight synchronous Supabase REST client using httpx.

This file provides a minimal helper around Supabase's REST API (PostgREST).
It uses the centralized `CONFIG.supabase` values from `app.config` and exposes
basic CRUD helpers suitable for scripts and small services in this project.

This intentionally does not replace SQLAlchemy for complex queries; it lets
the project work when only SUPABASE_* env vars are provided (no DATABASE_URL).
"""
from typing import Any, Dict, List, Optional
import httpx

from app.exceptions import ConfigurationError

try:
    from app.config import CONFIG
except Exception as e:
    CONFIG = None


class SupabaseClient:
    def __init__(self):
        if CONFIG is None:
            raise ConfigurationError("CONFIG is not available. Ensure app.config can be imported and SUPABASE envs are set.")

        supabase = getattr(CONFIG, "supabase", None)
        if not supabase or not getattr(supabase, "url", None):
            raise ConfigurationError("Supabase URL is not configured in CONFIG.supabase.url")

        self.url = supabase.url.rstrip("/")
        self.key = supabase.service_role_key or supabase.anon_key
        if not self.key:
            raise ConfigurationError("Supabase anon or service role key is required")

        self.base = f"{self.url}/rest/v1"
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            # prefer minimal return by default
            "Prefer": "return=minimal",
        }

        # Reuse a client for connection pooling
        self._client = httpx.Client(headers=self.headers, timeout=10.0)

    def select(self, table: str, filters: Optional[Dict[str, Any]] = None, select: str = "*") -> List[Dict]:
        """Select rows from a table.

        filters: mapping column->value for eq matches. This builds simple
        PostgREST filter syntax: ?col=eq.value&...
        """
        qs = []
        if filters:
            for k, v in filters.items():
                qs.append(f"{k}=eq.{v}")

        q = f"?select={select}"
        if qs:
            q += "&" + "&".join(qs)

        resp = self._client.get(f"{self.base}/{table}{q}")
        resp.raise_for_status()
        return resp.json()

    def insert(self, table: str, payload: Any, returning: str = "minimal") -> Any:
        """Insert a row or list of rows into a table.

        payload can be a dict or list of dicts. `returning` controls the Prefer header
        (e.g., 'minimal' or 'representation').
        """
        headers = self.headers.copy()
        headers["Prefer"] = f"return={returning}"

        resp = self._client.post(f"{self.base}/{table}", json=payload, headers=headers)
        resp.raise_for_status()
        # PostgREST returns empty body for minimal; representation returns JSON
        if resp.text:
            return resp.json()
        return None

    def upsert(self, table: str, payload: Any, on_conflict: Optional[str] = None) -> Any:
        """Upsert using POST with on_conflict query param and resolution=merge-duplicates."""
        url = f"{self.base}/{table}"
        params = {}
        if on_conflict:
            params["on_conflict"] = on_conflict

        headers = self.headers.copy()
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"

        resp = self._client.post(url, json=payload, params=params, headers=headers)
        resp.raise_for_status()
        if resp.text:
            return resp.json()
        return None

    def delete(self, table: str, filters: Dict[str, Any]) -> int:
        """Delete rows that match filters. Returns number of deleted rows when available."""
        qs = []
        for k, v in filters.items():
            qs.append(f"{k}=eq.{v}")
        q = "?" + "&".join(qs) if qs else ""

        resp = self._client.delete(f"{self.base}/{table}{q}")
        resp.raise_for_status()
        if resp.text:
            try:
                data = resp.json()
                return len(data) if isinstance(data, list) else 0
            except Exception:
                return 0
        return 0


# Create a module-level client when imported so other code can `from ... import supabase_client`
def create_client() -> SupabaseClient:
    return SupabaseClient()


__all__ = ["SupabaseClient", "create_client"]
