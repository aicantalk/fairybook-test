from __future__ import annotations

import importlib
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest


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
    def __init__(self, collection: "FakeCollection", doc_id: str):
        self._collection = collection
        self._id = doc_id
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

    def document(self) -> FakeDocRef:
        self._counter += 1
        doc_id = f"doc-{self._counter}"
        return FakeDocRef(self, doc_id)

    def stream(self):
        return [FakeDoc(doc_id, data) for doc_id, data in self.store.items()]


def _reload_board(monkeypatch, collection: FakeCollection):
    module_name = "community_board"
    if module_name in sys.modules:
        sys.modules.pop(module_name)
    module = importlib.import_module(module_name)
    monkeypatch.setattr(module, "_get_firestore_collection", lambda: collection)
    monkeypatch.setattr(module, "_ensure_remote_ready", lambda: None)
    module.reset_board_storage_cache()
    return module


def test_list_posts_orders_by_recent(monkeypatch):
    collection = FakeCollection()
    board = _reload_board(monkeypatch, collection)

    base = datetime(2024, 2, 1, 10, 0, tzinfo=timezone.utc)

    first_id = board.add_post(user_id="Alice", content="Hello", client_ip="1.1.1.1")
    second_id = board.add_post(user_id="Bob", content="안녕하세요", client_ip=None)

    collection.store[first_id]["created_at_utc"] = (base + timedelta(minutes=1)).isoformat()
    collection.store[second_id]["created_at_utc"] = (base + timedelta(minutes=2)).isoformat()

    posts = board.list_posts(limit=5)
    assert [post.user_id for post in posts] == ["Bob", "Alice"]
    assert all(post.created_at_utc.tzinfo is not None for post in posts)


def test_add_post_trims_and_limits(monkeypatch):
    collection = FakeCollection()
    board = _reload_board(monkeypatch, collection)

    with pytest.raises(ValueError):
        board.add_post(user_id="", content="내용", client_ip=None)

    long_text = "x" * 1500
    post_id = board.add_post(
        user_id="Charlie",
        content=f"  {long_text}  ",
        client_ip="127.0.0.1",
        max_content_length=1000,
    )

    saved = collection.store[post_id]
    assert saved["user_id"] == "Charlie"
    assert saved["content"].startswith("x") and len(saved["content"]) == 1000
    assert saved["client_ip"] == "127.0.0.1"
    assert isinstance(saved["created_at_utc"], datetime)
