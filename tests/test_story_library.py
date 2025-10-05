from __future__ import annotations

import importlib
import sys
from datetime import datetime, timedelta, timezone
from typing import Any


class FakeDoc:
    def __init__(self, doc_id: str, data: dict[str, Any]):
        self._id = doc_id
        self._data = data

    @property
    def id(self) -> str:
        return self._id

    def to_dict(self) -> dict[str, Any]:
        return dict(self._data)


class FakeDocRef:
    def __init__(self, collection: "FakeCollection", doc_id: str | None):
        if doc_id:
            self._id = doc_id
        else:
            self._id = collection.new_id()
        self._collection = collection
        collection.store.setdefault(self._id, {})

    @property
    def id(self) -> str:
        return self._id

    def set(self, data: dict[str, Any]) -> None:
        self._collection.store[self._id] = dict(data)


class FakeCollection:
    def __init__(self) -> None:
        self.store: dict[str, dict[str, Any]] = {}
        self._counter = 0

    def new_id(self) -> str:
        self._counter += 1
        return f"doc-{self._counter}"

    def document(self, doc_id: str | None = None) -> FakeDocRef:
        return FakeDocRef(self, doc_id)

    def stream(self):
        return [FakeDoc(doc_id, data) for doc_id, data in self.store.items()]


def _reload_story_library(monkeypatch, collection: FakeCollection):
    module_name = "story_library"
    if module_name in sys.modules:
        sys.modules.pop(module_name)
    module = importlib.import_module(module_name)
    monkeypatch.setattr(module, "_get_story_collection", lambda: collection)
    monkeypatch.setattr(module, "_ensure_remote_ready", lambda: None)
    module.reset_story_library_cache()
    return module


def test_list_story_records_filters_by_user(monkeypatch):
    collection = FakeCollection()
    lib = _reload_story_library(monkeypatch, collection)

    base = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)

    first = lib.record_story_export(
        user_id="user-1",
        title="첫 번째",
        local_path=None,
        gcs_object=None,
        gcs_url=None,
    )
    second = lib.record_story_export(
        user_id="user-2",
        title="두 번째",
        local_path=None,
        gcs_object=None,
        gcs_url=None,
    )
    third = lib.record_story_export(
        user_id="user-1",
        title="세 번째",
        local_path=None,
        gcs_object=None,
        gcs_url=None,
    )

    overrides = {
        first.id: base + timedelta(minutes=1),
        second.id: base + timedelta(minutes=2),
        third.id: base + timedelta(minutes=3),
    }
    for doc_id, ts in overrides.items():
        collection.store[doc_id]["created_at_utc"] = ts.isoformat()

    all_records = lib.list_story_records()
    assert [record.title for record in all_records] == ["세 번째", "두 번째", "첫 번째"]
    assert [record.user_id for record in all_records] == ["user-1", "user-2", "user-1"]

    user_records = lib.list_story_records(user_id="user-1")
    assert {record.user_id for record in user_records} == {"user-1"}
    assert [record.title for record in user_records] == ["세 번째", "첫 번째"]


def test_list_story_records_limit(monkeypatch):
    collection = FakeCollection()
    lib = _reload_story_library(monkeypatch, collection)

    base = datetime(2024, 1, 2, 9, 0, tzinfo=timezone.utc)

    created_ids = []
    for idx in range(5):
        export = lib.record_story_export(
            user_id="user",
            title=f"story-{idx}",
            local_path=None,
            gcs_object=None,
            gcs_url=None,
        )
        created_ids.append(export.id)

    for offset, doc_id in enumerate(created_ids):
        collection.store[doc_id]["created_at_utc"] = (base + timedelta(minutes=offset)).isoformat()

    limited = lib.list_story_records(user_id="user", limit=2)
    assert len(limited) == 2
    assert [record.title for record in limited] == ["story-4", "story-3"]


def test_record_story_export_assigns_story_id(monkeypatch):
    collection = FakeCollection()
    lib = _reload_story_library(monkeypatch, collection)

    export = lib.record_story_export(
        user_id="user",
        title="새로운 이야기",
        local_path="/tmp/story.html",
        gcs_object="exports/story.html",
        gcs_url="https://example.com/story.html",
    )

    assert export.story_id
    stored = collection.store[export.id]
    assert stored["local_path"] == "/tmp/story.html"
    assert stored["gcs_object"] == "exports/story.html"
    assert stored["gcs_url"] == "https://example.com/story.html"
