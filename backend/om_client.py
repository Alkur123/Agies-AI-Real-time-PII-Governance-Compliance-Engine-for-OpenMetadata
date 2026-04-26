"""
OpenMetadata REST API Client for Chakravyuha Governance Integration.
Connects to an OM instance, reads tables/columns, writes compliance tags back.
"""
import httpx
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

OM_HOST = os.getenv("OM_HOST", "http://localhost:8585")
OM_TOKEN = os.getenv("OM_TOKEN", "")
OM_USERNAME = os.getenv("OM_USERNAME", "admin")
OM_PASSWORD = os.getenv("OM_PASSWORD", "admin")

CHAKRAVYUHA_CLASSIFICATION = "Chakravyuha_Governance"


class OpenMetadataClient:
    def __init__(self, host: str = None, token: str = None):
        self.base = f"{host or OM_HOST}/api/v1"
        self._token = token or OM_TOKEN
        self._headers = None

    def _get_headers(self) -> dict:
        if not self._headers:
            if not self._token:
                self._token = self._login()
            self._headers = {
                "Authorization": f"Bearer {self._token}",
                "Content-Type": "application/json",
            }
        return self._headers

    def _login(self) -> str:
        """Obtain JWT from OM using username/password (password must be base64-encoded)."""
        import base64
        host_root = self.base.replace("/api/v1", "")
        encoded_pw = base64.b64encode(OM_PASSWORD.encode()).decode()
        payload = {"email": OM_USERNAME, "password": encoded_pw}
        try:
            resp = httpx.post(f"{host_root}/api/v1/users/login", json=payload, timeout=10)
            if resp.status_code == 200:
                return resp.json().get("accessToken", "")
            logger.warning(f"OM login returned {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"OM login failed: {e}")
        return ""

    # ── Read operations ──────────────────────────────────────────

    def health_check(self) -> bool:
        try:
            resp = httpx.get(
                self.base.replace("/api/v1", "") + "/", timeout=5
            )
            return resp.status_code == 200
        except Exception:
            return False

    def list_tables(self, limit: int = 100, fields: str = "columns,tags,database") -> list:
        resp = httpx.get(
            f"{self.base}/tables",
            params={"limit": limit, "fields": fields},
            headers=self._get_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("data", [])

    def get_table(self, table_id: str, fields: str = "columns,tags,database") -> dict:
        resp = httpx.get(
            f"{self.base}/tables/{table_id}",
            params={"fields": fields},
            headers=self._get_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    def get_table_by_fqn(self, fqn: str, fields: str = "columns,tags") -> dict:
        resp = httpx.get(
            f"{self.base}/tables/name/{fqn}",
            params={"fields": fields},
            headers=self._get_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    def list_databases(self, limit: int = 50) -> list:
        resp = httpx.get(
            f"{self.base}/databases",
            params={"limit": limit},
            headers=self._get_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("data", [])

    # ── Classification & tag management ─────────────────────────

    def classification_exists(self, name: str) -> bool:
        resp = httpx.get(
            f"{self.base}/classifications/name/{name}",
            headers=self._get_headers(),
            timeout=10,
        )
        return resp.status_code == 200

    def create_classification(self, name: str, description: str) -> dict:
        if self.classification_exists(name):
            logger.info(f"Classification '{name}' already exists — skipping")
            return {"name": name, "existing": True}
        resp = httpx.post(
            f"{self.base}/classifications",
            json={
                "name": name,
                "description": description,
                "provider": "user",
                "mutuallyExclusive": False,
            },
            headers=self._get_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()

    def tag_exists(self, classification: str, tag_name: str) -> bool:
        resp = httpx.get(
            f"{self.base}/tags/name/{classification}.{tag_name}",
            headers=self._get_headers(),
            timeout=10,
        )
        return resp.status_code == 200

    def create_tag(self, classification: str, tag_name: str, description: str) -> dict:
        if self.tag_exists(classification, tag_name):
            logger.info(f"Tag '{classification}.{tag_name}' already exists — skipping")
            return {"name": tag_name, "existing": True}
        resp = httpx.post(
            f"{self.base}/tags",
            json={
                "name": tag_name,
                "description": description,
                "classification": classification,
            },
            headers=self._get_headers(),
            timeout=10,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        logger.warning(f"Tag creation {resp.status_code}: {resp.text[:200]}")
        return {"name": tag_name, "status": resp.status_code}

    # ── Write operations ──────────────────────────────────────────

    def add_table_tags(self, table_id: str, new_tags: list) -> dict:
        """Merge governance tags into a table's existing tag list."""
        table = self.get_table(table_id)
        current_fqns = {t["tagFQN"] for t in table.get("tags", [])}
        merged = table.get("tags", []) + [
            t for t in new_tags if t["tagFQN"] not in current_fqns
        ]
        patch_headers = {**self._get_headers(), "Content-Type": "application/json-patch+json"}
        resp = httpx.patch(
            f"{self.base}/tables/{table_id}",
            json=[{"op": "add", "path": "/tags", "value": merged}],
            headers=patch_headers,
            timeout=15,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        logger.warning(f"Table tag update {resp.status_code}: {resp.text[:200]}")
        return {"status": resp.status_code}

    def add_column_tags(self, table_id: str, column_name: str, new_tags: list) -> dict:
        """Merge governance tags into a specific column."""
        table = self.get_table(table_id, fields="columns,tags")
        columns = table.get("columns", [])
        for col in columns:
            if col["name"] == column_name:
                current_fqns = {t["tagFQN"] for t in col.get("tags", [])}
                col["tags"] = col.get("tags", []) + [
                    t for t in new_tags if t["tagFQN"] not in current_fqns
                ]
        patch_headers = {**self._get_headers(), "Content-Type": "application/json-patch+json"}
        resp = httpx.patch(
            f"{self.base}/tables/{table_id}",
            json=[{"op": "add", "path": "/columns", "value": columns}],
            headers=patch_headers,
            timeout=15,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        logger.warning(f"Column tag update {resp.status_code}: {resp.text[:200]}")
        return {"status": resp.status_code}

    def register_webhook(self, name: str, endpoint: str) -> dict:
        """Register a webhook so OM fires events to Chakravyuha on new asset ingestion."""
        resp = httpx.post(
            f"{self.base}/events/subscriptions",
            json={
                "name": name,
                "description": "Chakravyuha auto-governance scan",
                "enabled": True,
                "alertType": "Notification",
                "filteringRules": {
                    "resources": ["table"],
                    "rules": [
                        {
                            "name": "matchAnyEventType",
                            "condition": "matchAnyEventType('entityCreated','entityUpdated')",
                        }
                    ],
                },
                "subscriptionType": "GenericWebhook",
                "subscriptionConfig": {"endpoint": endpoint, "secretKey": ""},
            },
            headers=self._get_headers(),
            timeout=10,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        return {"status": resp.status_code, "text": resp.text[:200]}
