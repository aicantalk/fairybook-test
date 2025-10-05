"""Storage helpers for a message-of-the-day announcement."""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Mapping

from google_credentials import get_service_account_credentials

try:  # pragma: no cover - optional dependency resolved at runtime
    from google.cloud import firestore  # type: ignore
except Exception:  # pragma: no cover - gracefully handle missing package
    firestore = None  # type: ignore

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

    try:
        doc = _get_firestore_document().get()
    except Exception:
        return None
    if not doc or not getattr(doc, "exists", False):
        return None
    data = doc.to_dict() or {}
    if not isinstance(data, Mapping):
        return None
    return _deserialize(data)


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

    document = _get_firestore_document()
    document.set(record)

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
]
