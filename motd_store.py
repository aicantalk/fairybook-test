"""Storage helpers for a message-of-the-day announcement."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping

from google_credentials import get_service_account_credentials

try:  # pragma: no cover - optional dependency resolved at runtime
    from google.cloud import firestore  # type: ignore
except Exception:  # pragma: no cover - gracefully handle missing package
    firestore = None  # type: ignore


MOTD_JSON_PATH = Path("motd.json")

_STORAGE_MODE = (os.getenv("STORY_STORAGE_MODE") or "remote").strip().lower()
USE_REMOTE_MOTD = _STORAGE_MODE in {"remote", "gcs"}

GCP_PROJECT_ID = (os.getenv("GCP_PROJECT_ID") or "").strip()
MOTD_COLLECTION = (os.getenv("FIRESTORE_MOTD_COLLECTION") or "motd").strip() or "motd"
MOTD_DOCUMENT_ID = (os.getenv("FIRESTORE_MOTD_DOCUMENT") or "current").strip() or "current"


@dataclass(slots=True)
class Motd:
    message: str
    is_active: bool
    updated_at: datetime
    updated_by: str | None

    @property
    def signature(self) -> str:
        payload = f"{self.updated_at.isoformat() if self.updated_at else ''}|{self.message}".encode("utf-8")
        import hashlib

        return hashlib.sha256(payload).hexdigest()


def _ensure_remote_ready() -> None:
    if not USE_REMOTE_MOTD:
        return

    if firestore is None:
        raise RuntimeError("google-cloud-firestore must be installed for MOTD storage")

    if GCP_PROJECT_ID:
        return

    credentials = get_service_account_credentials()
    project_id = getattr(credentials, "project_id", "") if credentials else ""
    if not project_id:
        raise RuntimeError(
            "GCP_PROJECT_ID must be configured or provided via service account for MOTD storage."
        )


@lru_cache(maxsize=1)
def _get_firestore_client():
    _ensure_remote_ready()
    client_kwargs: dict[str, Any] = {}
    credentials = get_service_account_credentials()
    if credentials is not None:
        client_kwargs["credentials"] = credentials
        if not GCP_PROJECT_ID:
            project_id = getattr(credentials, "project_id", "")
            if project_id:
                client_kwargs["project"] = project_id
    if GCP_PROJECT_ID:
        client_kwargs["project"] = GCP_PROJECT_ID
    if firestore is None:  # pragma: no cover - defensive guard
        raise RuntimeError("Firestore client unavailable")
    return firestore.Client(**client_kwargs)  # type: ignore[arg-type]


def _get_firestore_document():
    client = _get_firestore_client()
    return client.collection(MOTD_COLLECTION).document(MOTD_DOCUMENT_ID)


def _deserialize(payload: Mapping[str, Any]) -> Motd:
    message = str(payload.get("message") or "")
    is_active = bool(payload.get("is_active")) and bool(message.strip())

    updated_raw = payload.get("updated_at")
    if isinstance(updated_raw, datetime):
        updated_at = updated_raw if updated_raw.tzinfo else updated_raw.replace(tzinfo=timezone.utc)
    else:
        try:
            updated_at = datetime.fromisoformat(str(updated_raw))
            if updated_at.tzinfo is None:
                updated_at = updated_at.replace(tzinfo=timezone.utc)
        except Exception:
            updated_at = datetime.now(timezone.utc)

    updated_by = payload.get("updated_by")
    if updated_by is not None:
        updated_by = str(updated_by).strip() or None

    return Motd(
        message=message,
        is_active=is_active,
        updated_at=updated_at,
        updated_by=updated_by,
    )


def get_motd() -> Motd | None:
    """Return the stored MOTD record, or ``None`` when none exists."""

    if USE_REMOTE_MOTD:
        try:
            doc = _get_firestore_document().get()
        except Exception:
            return None
        if not doc or not doc.exists:
            return None
        data = doc.to_dict() or {}
        if not isinstance(data, Mapping):
            return None
        return _deserialize(data)

    if not MOTD_JSON_PATH.is_file():
        return None

    try:
        payload = json.loads(MOTD_JSON_PATH.read_text("utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    if not isinstance(payload, Mapping):
        return None
    return _deserialize(payload)


def save_motd(*, message: str, is_active: bool, updated_by: str | None) -> Motd:
    normalized_message = message.strip()
    normalized_active = bool(is_active and normalized_message)
    updated_at = datetime.now(timezone.utc)
    record: dict[str, Any] = {
        "message": normalized_message,
        "is_active": normalized_active,
        "updated_at": updated_at,
        "updated_by": (updated_by or "").strip() or None,
    }

    if USE_REMOTE_MOTD:
        document = _get_firestore_document()
        document.set(record)
    else:
        serializable = {
            "message": record["message"],
            "is_active": record["is_active"],
            "updated_at": record["updated_at"].isoformat(),
            "updated_by": record["updated_by"],
        }
        MOTD_JSON_PATH.write_text(json.dumps(serializable, ensure_ascii=False, indent=2), encoding="utf-8")

    clear_cache()
    return _deserialize(record)


def clear_motd(*, updated_by: str | None = None) -> None:
    save_motd(message="", is_active=False, updated_by=updated_by)


def clear_cache() -> None:
    """Clear cached remote clients so other processes pick up updates quickly."""

    _get_firestore_client.cache_clear()


__all__ = [
    "Motd",
    "get_motd",
    "save_motd",
    "clear_motd",
    "clear_cache",
    "USE_REMOTE_MOTD",
]

