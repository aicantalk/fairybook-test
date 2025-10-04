"""Generation token bookkeeping backed by Firestore."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Mapping

from zoneinfo import ZoneInfo

from google_credentials import get_service_account_credentials

try:  # pragma: no cover - optional dependency checked at runtime
    from google.cloud import firestore  # type: ignore
except Exception:  # pragma: no cover - degrade gracefully when package missing
    firestore = None  # type: ignore


KST = ZoneInfo("Asia/Seoul")

DEFAULT_INITIAL_TOKENS = 7
DEFAULT_AUTO_CAP = 10

_PROJECT_ENV = (
    "GCP_PROJECT_ID",
    "FIRESTORE_PROJECT_ID",
)


def _get_project_id() -> str:
    import os

    for key in _PROJECT_ENV:
        value = os.getenv(key)
        if value:
            return value.strip()
    return ""


_COLLECTION_NAME = ("FIRESTORE_TOKEN_COLLECTION", "generation_tokens")


def _get_collection_name() -> str:
    import os

    env_value = os.getenv(_COLLECTION_NAME[0])
    if env_value and env_value.strip():
        return env_value.strip()
    return _COLLECTION_NAME[1]


@dataclass(slots=True)
class GenerationTokenStatus:
    tokens: int
    auto_cap: int
    created_at: datetime | None
    updated_at: datetime | None
    last_login_at: datetime | None
    last_refill_at: datetime | None
    last_consumed_at: datetime | None
    last_consumed_signature: str | None


@dataclass(slots=True)
class SyncResult:
    status: GenerationTokenStatus
    initialized: bool
    refilled_by: int


@dataclass(slots=True)
class ConsumeOutcome:
    consumed: bool
    status: GenerationTokenStatus
    signature: str | None = None


class GenerationTokenError(RuntimeError):
    """Base error for token management."""


class InsufficientGenerationTokens(GenerationTokenError):
    """Raised when the user has no tokens left to consume."""

    def __init__(self, tokens_available: int) -> None:
        super().__init__("No generation tokens available.")
        self.tokens_available = tokens_available


def _ensure_firestore_ready() -> None:
    if firestore is None:
        raise RuntimeError("google-cloud-firestore must be installed for generation token tracking")

    project_id = _get_project_id()
    if project_id:
        return

    credentials = get_service_account_credentials()
    if credentials is None or not getattr(credentials, "project_id", ""):
        raise RuntimeError(
            "GCP_PROJECT_ID must be set or provided via service-account credentials for generation tokens."
        )


@lru_cache(maxsize=1)
def _get_firestore_client():
    _ensure_firestore_ready()
    client_kwargs: dict[str, object] = {}
    credentials = get_service_account_credentials()
    project_id = _get_project_id()
    if credentials is not None:
        client_kwargs["credentials"] = credentials
        project_from_creds = getattr(credentials, "project_id", "")
        if project_from_creds and not project_id:
            project_id = project_from_creds
    if project_id:
        client_kwargs["project"] = project_id
    return firestore.Client(**client_kwargs)  # type: ignore[arg-type]


def _get_collection():
    client = _get_firestore_client()
    return client.collection(_get_collection_name())


def _as_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return None


def _utc_now(now: datetime | None = None) -> datetime:
    if now is None:
        return datetime.now(timezone.utc)
    if now.tzinfo is None:
        return now.replace(tzinfo=timezone.utc)
    return now.astimezone(timezone.utc)


def _kst_date(dt: datetime | None) -> datetime.date | None:
    if dt is None:
        return None
    return dt.astimezone(KST).date()


def _coerce_int(value: Any, default: int) -> int:
    try:
        coerced = int(value)
    except (TypeError, ValueError):
        return default
    return coerced


def _build_status(payload: Mapping[str, Any]) -> GenerationTokenStatus:
    tokens = max(_coerce_int(payload.get("tokens"), 0), 0)
    auto_cap = _coerce_int(payload.get("auto_cap"), DEFAULT_AUTO_CAP)
    if auto_cap <= 0:
        auto_cap = DEFAULT_AUTO_CAP
    return GenerationTokenStatus(
        tokens=tokens,
        auto_cap=auto_cap,
        created_at=_as_datetime(payload.get("created_at")),
        updated_at=_as_datetime(payload.get("updated_at")),
        last_login_at=_as_datetime(payload.get("last_login_at")),
        last_refill_at=_as_datetime(payload.get("last_refill_at")),
        last_consumed_at=_as_datetime(payload.get("last_consumed_at")),
        last_consumed_signature=str(payload.get("last_consumed_signature") or "") or None,
    )


def _default_document(now: datetime) -> dict[str, Any]:
    return {
        "tokens": DEFAULT_INITIAL_TOKENS,
        "auto_cap": DEFAULT_AUTO_CAP,
        "created_at": now,
        "updated_at": now,
        "last_login_at": now,
        "last_refill_at": now,
        "last_consumed_at": None,
        "last_consumed_signature": None,
    }


def get_status(uid: str) -> GenerationTokenStatus | None:
    if not uid:
        raise ValueError("uid is required")

    collection = _get_collection()
    doc_ref = collection.document(uid)
    snapshot = doc_ref.get()
    if not getattr(snapshot, "exists", False):
        return None
    data = snapshot.to_dict() if hasattr(snapshot, "to_dict") else None
    if not isinstance(data, Mapping):
        return None
    status = _build_status(data)
    if status.created_at is None:
        # Populate missing creation timestamp lazily.
        now = _utc_now()
        doc_ref.set({"created_at": now, "updated_at": now}, merge=True)
        cached = dict(data)
        cached["created_at"] = now
        cached["updated_at"] = now
        return _build_status(cached)
    return status


def sync_on_login(uid: str, *, now: datetime | None = None) -> SyncResult:
    if not uid:
        raise ValueError("uid is required")

    now_utc = _utc_now(now)
    collection = _get_collection()
    doc_ref = collection.document(uid)
    snapshot = doc_ref.get()

    if not getattr(snapshot, "exists", False):
        payload = _default_document(now_utc)
        doc_ref.set(payload)
        return SyncResult(status=_build_status(payload), initialized=True, refilled_by=0)

    raw_data = snapshot.to_dict() if hasattr(snapshot, "to_dict") else {}
    if not isinstance(raw_data, Mapping):
        raw_data = {}

    tokens = max(_coerce_int(raw_data.get("tokens"), 0), 0)
    auto_cap = _coerce_int(raw_data.get("auto_cap"), DEFAULT_AUTO_CAP)
    if auto_cap <= 0:
        auto_cap = DEFAULT_AUTO_CAP

    created_at = _as_datetime(raw_data.get("created_at")) or now_utc
    last_refill_at = _as_datetime(raw_data.get("last_refill_at")) or created_at

    previous_date = _kst_date(last_refill_at) or _kst_date(created_at)
    now_date = _kst_date(now_utc)
    refill_days = 0
    if previous_date and now_date:
        delta_days = (now_date - previous_date).days
        if delta_days > 0:
            refill_days = delta_days

    cap_gap = max(auto_cap - tokens, 0)
    refill_amount = min(refill_days, cap_gap)

    updated_tokens = tokens + refill_amount
    updates: dict[str, Any] = {
        "tokens": updated_tokens,
        "auto_cap": auto_cap,
        "last_login_at": now_utc,
        "updated_at": now_utc,
    }

    if "created_at" not in raw_data or raw_data.get("created_at") is None:
        updates["created_at"] = created_at

    if refill_amount > 0:
        updates["last_refill_at"] = now_utc

    doc_ref.set(updates, merge=True)

    merged = dict(raw_data)
    merged.update(updates)
    status = _build_status(merged)
    return SyncResult(status=status, initialized=False, refilled_by=refill_amount)


def consume_token(uid: str, *, signature: str | None = None, now: datetime | None = None) -> ConsumeOutcome:
    if not uid:
        raise ValueError("uid is required")

    now_utc = _utc_now(now)
    collection = _get_collection()
    doc_ref = collection.document(uid)
    snapshot = doc_ref.get()

    if not getattr(snapshot, "exists", False):
        raise InsufficientGenerationTokens(0)

    raw_data = snapshot.to_dict() if hasattr(snapshot, "to_dict") else {}
    if not isinstance(raw_data, Mapping):
        raw_data = {}

    tokens = max(_coerce_int(raw_data.get("tokens"), 0), 0)
    last_signature = str(raw_data.get("last_consumed_signature") or "") or None

    if signature and last_signature and signature == last_signature:
        status = _build_status(raw_data)
        return ConsumeOutcome(consumed=False, status=status, signature=last_signature)

    if tokens <= 0:
        raise InsufficientGenerationTokens(tokens)

    updated_tokens = tokens - 1
    updates: dict[str, Any] = {
        "tokens": updated_tokens,
        "last_consumed_at": now_utc,
        "updated_at": now_utc,
    }
    if signature:
        updates["last_consumed_signature"] = signature

    doc_ref.set(updates, merge=True)

    merged = dict(raw_data)
    merged.update(updates)
    status = _build_status(merged)
    return ConsumeOutcome(consumed=True, status=status, signature=signature)


def set_tokens(
    uid: str,
    *,
    tokens: int,
    auto_cap: int | None = None,
    now: datetime | None = None,
) -> GenerationTokenStatus:
    if not uid:
        raise ValueError("uid is required")

    sanitized_tokens = max(tokens, 0)
    now_utc = _utc_now(now)

    collection = _get_collection()
    doc_ref = collection.document(uid)
    snapshot = doc_ref.get()

    raw_data = snapshot.to_dict() if getattr(snapshot, "exists", False) and hasattr(snapshot, "to_dict") else {}
    if not isinstance(raw_data, Mapping):
        raw_data = {}

    updates: dict[str, Any] = {
        "tokens": sanitized_tokens,
        "updated_at": now_utc,
    }
    if auto_cap is not None:
        updates["auto_cap"] = max(auto_cap, 0)

    if not getattr(snapshot, "exists", False):
        base = _default_document(now_utc)
        base.update(updates)
        if auto_cap is not None and auto_cap > 0:
            base["auto_cap"] = auto_cap
        doc_ref.set(base)
        return _build_status(base)

    doc_ref.set(updates, merge=True)
    merged = dict(raw_data)
    merged.update(updates)
    if "created_at" not in merged or merged.get("created_at") is None:
        merged["created_at"] = now_utc
    return _build_status(merged)


def top_up_tokens(
    uid: str,
    *,
    amount: int,
    allow_exceed_cap: bool = False,
    now: datetime | None = None,
) -> GenerationTokenStatus:
    if amount <= 0:
        return get_status(uid) or set_tokens(uid, tokens=DEFAULT_INITIAL_TOKENS, now=now)

    now_utc = _utc_now(now)
    status = get_status(uid)
    if status is None:
        initial_tokens = amount if allow_exceed_cap else min(amount, DEFAULT_AUTO_CAP)
        return set_tokens(uid, tokens=initial_tokens, now=now_utc)

    current_tokens = status.tokens
    new_total = current_tokens + amount
    if not allow_exceed_cap and status.auto_cap > 0:
        new_total = min(new_total, status.auto_cap)
    return set_tokens(uid, tokens=new_total, now=now_utc)


def status_to_dict(status: GenerationTokenStatus) -> dict[str, Any]:
    def _serialize(value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.astimezone(timezone.utc).isoformat()

    return {
        "tokens": status.tokens,
        "auto_cap": status.auto_cap,
        "created_at": _serialize(status.created_at),
        "updated_at": _serialize(status.updated_at),
        "last_login_at": _serialize(status.last_login_at),
        "last_refill_at": _serialize(status.last_refill_at),
        "last_consumed_at": _serialize(status.last_consumed_at),
        "last_consumed_signature": status.last_consumed_signature,
    }


def status_from_mapping(payload: Mapping[str, Any] | None) -> GenerationTokenStatus | None:
    if payload is None:
        return None
    if not isinstance(payload, Mapping):
        return None
    return _build_status(payload)


__all__ = [
    "GenerationTokenStatus",
    "SyncResult",
    "ConsumeOutcome",
    "GenerationTokenError",
    "InsufficientGenerationTokens",
    "DEFAULT_INITIAL_TOKENS",
    "DEFAULT_AUTO_CAP",
    "get_status",
    "sync_on_login",
    "consume_token",
    "set_tokens",
    "top_up_tokens",
    "status_to_dict",
    "status_from_mapping",
]
