from __future__ import annotations

import importlib
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest


def _reload_module(monkeypatch):
    monkeypatch.setenv("GCP_PROJECT_ID", "demo-project")
    root = Path(__file__).resolve().parents[1]
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))
    sys.modules.pop("services.generation_tokens", None)
    module = importlib.import_module("services.generation_tokens")
    return module


class FakeSnapshot:
    def __init__(self, data: dict | None):
        self._data = data

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self):
        if self._data is None:
            return None
        return dict(self._data)


class FakeDocument:
    def __init__(self):
        self._data: dict | None = None

    def get(self):
        return FakeSnapshot(self._data)

    def set(self, payload: dict, merge: bool = False):
        if not merge or self._data is None:
            self._data = dict(payload)
        else:
            assert isinstance(self._data, dict)
            self._data.update(dict(payload))

    @property
    def data(self) -> dict | None:
        return None if self._data is None else dict(self._data)


class FakeCollection:
    def __init__(self):
        self._docs: dict[str, FakeDocument] = {}

    def document(self, uid: str) -> FakeDocument:
        self._docs.setdefault(uid, FakeDocument())
        return self._docs[uid]


class FakeClient:
    def __init__(self):
        self._collections: dict[str, FakeCollection] = {}

    def collection(self, name: str) -> FakeCollection:
        self._collections.setdefault(name, FakeCollection())
        return self._collections[name]


class FakeFirestore(SimpleNamespace):
    def __init__(self):
        super().__init__()
        self._client = FakeClient()

    def Client(self, *_, **__):  # pragma: no cover - signature compatibility
        return self._client


def _setup_fake_firestore(module, monkeypatch):
    fake_firestore = FakeFirestore()
    monkeypatch.setattr(module, "firestore", fake_firestore, raising=False)
    monkeypatch.setattr(module, "get_service_account_credentials", lambda: SimpleNamespace(project_id="demo-project"))
    module._get_firestore_client.cache_clear()  # type: ignore[attr-defined]
    return fake_firestore


def test_sync_on_login_initializes_document(monkeypatch):
    module = _reload_module(monkeypatch)
    fake_firestore = _setup_fake_firestore(module, monkeypatch)

    now = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
    result = module.sync_on_login("uid-1", now=now)

    assert result.initialized is True
    assert result.refilled_by == 0
    assert result.status.tokens == module.DEFAULT_INITIAL_TOKENS
    assert result.status.last_login_at == now

    collection = fake_firestore._client.collection("generation_tokens")
    stored = collection.document("uid-1").data
    assert stored is not None
    assert stored["tokens"] == module.DEFAULT_INITIAL_TOKENS
    assert stored["last_login_at"] == now


def test_sync_on_login_applies_daily_refill(monkeypatch):
    module = _reload_module(monkeypatch)
    fake_firestore = _setup_fake_firestore(module, monkeypatch)

    collection = fake_firestore._client.collection("generation_tokens")
    doc = collection.document("uid-2")
    baseline = datetime(2024, 1, 1, 0, 0, tzinfo=timezone.utc)
    doc.set(
        {
            "tokens": 5,
            "auto_cap": 10,
            "created_at": baseline,
            "last_refill_at": baseline,
            "updated_at": baseline,
        }
    )

    later = baseline + timedelta(days=2, hours=1)
    result = module.sync_on_login("uid-2", now=later)

    assert result.initialized is False
    assert result.refilled_by == 2
    assert result.status.tokens == 7
    assert result.status.last_refill_at == later


def test_consume_token_decrements_and_is_idempotent(monkeypatch):
    module = _reload_module(monkeypatch)
    fake_firestore = _setup_fake_firestore(module, monkeypatch)

    collection = fake_firestore._client.collection("generation_tokens")
    doc = collection.document("uid-3")
    now = datetime(2024, 1, 5, 3, 0, tzinfo=timezone.utc)
    doc.set(
        {
            "tokens": 2,
            "auto_cap": 10,
            "created_at": now,
            "updated_at": now,
        }
    )

    signature = "story-abc"
    outcome = module.consume_token("uid-3", signature=signature, now=now)
    assert outcome.consumed is True
    assert outcome.status.tokens == 1
    assert outcome.signature == signature

    # Repeat with same signature should be a no-op
    second = module.consume_token("uid-3", signature=signature, now=now + timedelta(minutes=1))
    assert second.consumed is False
    assert second.status.tokens == 1
    assert second.signature == signature


def test_consume_token_raises_when_empty(monkeypatch):
    module = _reload_module(monkeypatch)
    fake_firestore = _setup_fake_firestore(module, monkeypatch)

    collection = fake_firestore._client.collection("generation_tokens")
    doc = collection.document("uid-4")
    baseline = datetime(2024, 1, 1, tzinfo=timezone.utc)
    doc.set(
        {
            "tokens": 0,
            "auto_cap": 10,
            "created_at": baseline,
            "updated_at": baseline,
        }
    )

    with pytest.raises(module.InsufficientGenerationTokens) as exc:
        module.consume_token("uid-4", signature="story-1", now=baseline)

    assert exc.value.tokens_available == 0


def test_set_tokens_overrides_values(monkeypatch):
    module = _reload_module(monkeypatch)
    fake_firestore = _setup_fake_firestore(module, monkeypatch)

    now = datetime(2024, 2, 10, tzinfo=timezone.utc)
    status = module.set_tokens("uid-5", tokens=25, auto_cap=20, now=now)
    assert status.tokens == 25
    assert status.auto_cap == 20

    # Second call should merge without resetting creation time
    updated = module.set_tokens("uid-5", tokens=5, now=now + timedelta(hours=1))
    assert updated.tokens == 5
    assert updated.auto_cap == 20
    assert updated.created_at == status.created_at


def test_top_up_tokens_respects_cap(monkeypatch):
    module = _reload_module(monkeypatch)
    fake_firestore = _setup_fake_firestore(module, monkeypatch)

    now = datetime(2024, 3, 1, tzinfo=timezone.utc)
    module.set_tokens("uid-6", tokens=8, auto_cap=10, now=now)

    after = module.top_up_tokens("uid-6", amount=5, now=now + timedelta(minutes=1))
    assert after.tokens == 10  # capped

    unlimited = module.top_up_tokens("uid-6", amount=5, allow_exceed_cap=True, now=now + timedelta(minutes=2))
    assert unlimited.tokens == 15


def test_status_serialization_roundtrip(monkeypatch):
    module = _reload_module(monkeypatch)
    now = datetime(2024, 4, 1, 12, tzinfo=timezone.utc)
    status = module.GenerationTokenStatus(
        tokens=3,
        auto_cap=10,
        created_at=now,
        updated_at=now,
        last_login_at=now,
        last_refill_at=now,
        last_consumed_at=None,
        last_consumed_signature="sig",
    )

    payload = module.status_to_dict(status)
    restored = module.status_from_mapping(payload)
    assert restored is not None
    assert restored.tokens == status.tokens
    assert restored.last_consumed_signature == "sig"


def test_admin_refill_tokens(monkeypatch):
    module = _reload_module(monkeypatch)
    fake_firestore = _setup_fake_firestore(module, monkeypatch)

    collection = fake_firestore._client.collection("generation_tokens")
    doc = collection.document("uid-10")
    doc.set({"tokens": 1, "auto_cap": 5})

    sys.modules.pop("admin_tool.generation_tokens", None)
    admin_module = importlib.import_module("admin_tool.generation_tokens")

    updated = admin_module.refill_user_tokens("uid-10")
    assert updated.tokens == 5
