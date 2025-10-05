from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

from story_library import StoryRecord

import ui.library as library


def make_record(uid: str, created_at: datetime) -> StoryRecord:
    return StoryRecord(
        id="1",
        story_id="story-1",
        user_id=uid,
        title="첫 번째 이야기",
        html_filename="story1.html",
        local_path="/tmp/story1.html",
        gcs_object="exports/story1.html",
        gcs_url="https://example.com/story1.html",
        author_name="홍길동",
        created_at_utc=created_at,
    )


def test_load_library_entries_merges_records_and_remote(monkeypatch):
    created_at_record = datetime(2024, 1, 3, tzinfo=timezone.utc)
    record = make_record("user-1", created_at_record)

    captured: dict[str, object | None] = {}

    def fake_list_story_records(*, user_id: str | None = None, limit: int | None = None):
        captured["user_id"] = user_id
        captured["limit"] = limit
        return [record]

    remote_exports = [
        SimpleNamespace(
            object_name="exports/story1.html",
            filename="story1.html",
            public_url="https://example.com/story1.html",
            updated=datetime(2024, 1, 2, tzinfo=timezone.utc),
        ),
        SimpleNamespace(
            object_name="exports/story2.html",
            filename="story2.html",
            public_url="https://example.com/story2.html",
            updated=datetime(2024, 1, 1, tzinfo=timezone.utc),
        ),
    ]

    monkeypatch.setattr(library, "list_story_records", fake_list_story_records)
    monkeypatch.setattr(library, "list_gcs_exports", lambda: remote_exports)

    entries, error = library.load_library_entries(
        auth_user={"uid": "user-1"},
        only_mine=True,
        include_legacy=True,
    )

    assert error is None
    assert captured["user_id"] == "user-1"
    assert captured["limit"] == 100

    # Deduped duplicate object and sorted by updated timestamp
    assert [entry.token for entry in entries] == ["record:1", "legacy-remote:exports/story2.html"]
    assert entries[0].created_at == created_at_record
    assert entries[1].gcs_url == "https://example.com/story2.html"


def test_load_library_entries_legacy_remote_only(monkeypatch):
    remote_exports = [
        SimpleNamespace(
            object_name="exports/story3.html",
            filename="story3.html",
            public_url="https://example.com/story3.html",
            updated=datetime(2024, 1, 5, tzinfo=timezone.utc),
        )
    ]

    monkeypatch.setattr(library, "list_story_records", lambda **_: [])
    monkeypatch.setattr(library, "list_gcs_exports", lambda: remote_exports)

    entries, error = library.load_library_entries(
        auth_user=None,
        only_mine=False,
        include_legacy=True,
    )

    assert error is None
    assert len(entries) == 1
    entry = entries[0]
    assert entry.origin == "legacy-remote"
    assert entry.gcs_object == "exports/story3.html"
    assert entry.html_filename == "story3.html"
