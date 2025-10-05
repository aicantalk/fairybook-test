"""Firestore-backed community board datastore helpers."""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import Protocol

from google_credentials import get_service_account_credentials

try:  # pragma: no cover - optional dependency checked at runtime
    from google.cloud import firestore  # type: ignore
except Exception:  # pragma: no cover - gracefully handle missing package
    firestore = None  # type: ignore

GCP_PROJECT_ID = (
    os.getenv("GCP_PROJECT_ID")
    or os.getenv("FIRESTORE_PROJECT_ID")
    or ""
).strip()
FIRESTORE_COLLECTION = (os.getenv("FIRESTORE_COLLECTION") or "posts").strip() or "posts"


@dataclass(slots=True)
class BoardPost:
    """Representation of a single board post."""

    id: str
    user_id: str
    content: str
    client_ip: str | None
    created_at_utc: datetime


class SupportsStripped(Protocol):
    def strip(self) -> str: ...


def _ensure_remote_ready() -> None:
    if firestore is None:
        raise RuntimeError("google-cloud-firestore must be installed for remote board storage")

    if GCP_PROJECT_ID:
        return

    credentials = get_service_account_credentials()
    project_id = getattr(credentials, "project_id", "") if credentials else ""
    if not project_id:
        raise RuntimeError(
            "GCP_PROJECT_ID must be set or provided via service-account credentials for the board."
        )


@lru_cache(maxsize=1)
def _get_firestore_client():
    _ensure_remote_ready()
    client_kwargs: dict[str, str] = {}
    credentials = get_service_account_credentials()
    if credentials is not None:
        client_kwargs["credentials"] = credentials
        if not GCP_PROJECT_ID:
            project_id = getattr(credentials, "project_id", "")
            if project_id:
                client_kwargs["project"] = project_id
    if GCP_PROJECT_ID:
        client_kwargs["project"] = GCP_PROJECT_ID
    return firestore.Client(**client_kwargs)  # type: ignore[arg-type]


def _get_firestore_collection():
    client = _get_firestore_client()
    return client.collection(FIRESTORE_COLLECTION)


def reset_board_storage_cache() -> None:
    """Testing helper to reset cached Firestore clients."""

    _get_firestore_client.cache_clear()


def init_board_store() -> None:
    """Validate Firestore connectivity for the community board."""

    _ensure_remote_ready()
    _get_firestore_collection()  # touch once to validate credentials/collection.


def add_post(
    *,
    user_id: SupportsStripped,
    content: SupportsStripped,
    client_ip: str | None,
    max_content_length: int = 1000,
) -> str:
    """Persist a new board post and return its identifier."""

    normalized_user = str(user_id).strip()
    normalized_content = str(content).strip()

    if not normalized_user:
        raise ValueError("user id is required")
    if not normalized_content:
        raise ValueError("content is required")

    if max_content_length and len(normalized_content) > max_content_length:
        normalized_content = normalized_content[:max_content_length]

    timestamp = datetime.now(timezone.utc)

    collection = _get_firestore_collection()
    doc_ref = collection.document()
    doc_ref.set(
        {
            "user_id": normalized_user,
            "content": normalized_content,
            "client_ip": client_ip,
            "created_at_utc": timestamp,
        }
    )
    return str(getattr(doc_ref, "id", ""))


def _coerce_datetime(value) -> datetime:
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(str(value))
        except Exception:  # pragma: no cover - defensive fallback
            dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def list_posts(*, limit: int = 50) -> list[BoardPost]:
    """Return the most recent board posts from Firestore."""

    if limit <= 0:
        return []

    collection = _get_firestore_collection()
    documents = list(collection.stream())

    posts: list[BoardPost] = []
    for doc in documents:
        data = doc.to_dict() or {}
        posts.append(
            BoardPost(
                id=str(getattr(doc, "id", "")),
                user_id=str(data.get("user_id", "")),
                content=str(data.get("content", "")),
                client_ip=data.get("client_ip"),
                created_at_utc=_coerce_datetime(data.get("created_at_utc")),
            )
        )

    posts.sort(key=lambda post: post.created_at_utc, reverse=True)
    if limit and len(posts) > limit:
        posts = posts[:limit]
    return posts


__all__ = [
    "BoardPost",
    "add_post",
    "init_board_store",
    "list_posts",
    "reset_board_storage_cache",
]
