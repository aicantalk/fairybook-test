"""Story library viewer helpers."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping

from gcs_storage import download_gcs_export, list_gcs_exports
from services.story_service import HTML_EXPORT_PATH, list_html_exports
from session_proxy import StorySessionProxy
from story_library import StoryRecord, list_story_records
from telemetry import emit_log_event
from utils.time_utils import format_kst

_EPOCH = datetime.fromtimestamp(0, tz=timezone.utc)


@dataclass(slots=True)
class LibraryEntry:
    token: str
    title: str
    author: str | None
    story_id: str | None
    created_at: datetime | None
    local_path: str | None
    gcs_object: str | None
    gcs_url: str | None
    html_filename: str | None
    origin: str


def _normalize_timestamp(timestamp: datetime | None) -> datetime:
    if timestamp is None:
        return _EPOCH
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=timezone.utc)
    return timestamp.astimezone(timezone.utc)


def load_library_entries(
    *,
    auth_user: Mapping[str, Any] | None,
    only_mine: bool,
    use_remote_exports: bool,
    include_legacy: bool,
    limit: int = 100,
) -> tuple[list[LibraryEntry], str | None]:
    """Load story entries for the library view."""

    records_error: str | None = None
    try:
        if only_mine and auth_user:
            uid = str(auth_user.get("uid") or "").strip()
            records = list_story_records(user_id=uid, limit=limit)
        else:
            records = list_story_records(limit=limit)
    except Exception as exc:  # pragma: no cover - defensive catch
        records_error = str(exc)
        records = []

    entries: list[LibraryEntry] = []
    recorded_keys: set[str] = set()

    for record in records:
        key_candidate = (record.gcs_object or record.local_path or record.html_filename or "").lower()
        if key_candidate:
            recorded_keys.add(key_candidate)
        entries.append(
            LibraryEntry(
                token=f"record:{record.id}",
                title=record.title,
                author=record.author_name,
                story_id=record.story_id,
                created_at=record.created_at_utc,
                local_path=record.local_path,
                gcs_object=record.gcs_object,
                gcs_url=record.gcs_url,
                html_filename=record.html_filename,
                origin="record",
            )
        )

    if include_legacy:
        legacy_candidates: Iterable[Any]
        if use_remote_exports:
            legacy_candidates = list_gcs_exports()
        else:
            legacy_candidates = list_html_exports()

        for item in legacy_candidates:
            if use_remote_exports:
                object_name = (getattr(item, "object_name", "") or "").strip()
                filename = (getattr(item, "filename", "") or "").strip()
                key = (object_name or filename).lower()
                if key in recorded_keys:
                    continue
                recorded_keys.add(key)
                created_at = getattr(item, "updated", None)
                if created_at and getattr(created_at, "tzinfo", None) is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                created_at = created_at or _EPOCH
                entries.append(
                    LibraryEntry(
                        token=f"legacy-remote:{object_name or filename}",
                        title=Path(filename).stem,
                        author=None,
                        story_id=None,
                        created_at=created_at,
                        local_path=None,
                        gcs_object=object_name or None,
                        gcs_url=getattr(item, "public_url", None),
                        html_filename=filename or None,
                        origin="legacy-remote",
                    )
                )
            else:
                path = Path(item)
                key = str(path).lower()
                if key in recorded_keys:
                    continue
                recorded_keys.add(key)
                try:
                    mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
                except Exception:
                    mtime = _EPOCH
                entries.append(
                    LibraryEntry(
                        token=f"legacy-local:{path}",
                        title=path.stem,
                        author=None,
                        story_id=None,
                        created_at=mtime,
                        local_path=str(path),
                        gcs_object=None,
                        gcs_url=None,
                        html_filename=path.name,
                        origin="legacy-local",
                    )
                )

    entries.sort(key=lambda entry: _normalize_timestamp(entry.created_at), reverse=True)
    return entries, records_error


def _resolve_entry_html(entry: LibraryEntry) -> tuple[str | None, str | None, str | None]:
    """Return HTML content and source metadata for a library entry."""

    local_candidates: list[Path] = []
    if entry.local_path:
        local_candidates.append(Path(entry.local_path))
    if entry.html_filename:
        local_candidates.append(HTML_EXPORT_PATH / entry.html_filename)

    last_error: str | None = None
    last_path: str | None = None
    for candidate in local_candidates:
        last_path = str(candidate)
        try:
            if candidate.exists():
                return candidate.read_text("utf-8"), None, last_path
        except Exception as exc:
            last_error = str(exc)

    if entry.gcs_object:
        html_content = download_gcs_export(entry.gcs_object)
        if html_content is None:
            return None, "원격 저장소에서 파일을 불러오지 못했어요.", None
        return html_content, None, None

    if last_error:
        return None, last_error, last_path
    return None, "동화 파일을 찾을 수 없습니다.", None


def _format_entry_caption(entry: LibraryEntry, *, include_author: bool) -> str:
    created_display = format_kst(entry.created_at) if entry.created_at else "시간 정보 없음"
    if include_author and entry.author:
        return f"{entry.title} · {entry.author} · {created_display}"
    return f"{entry.title} · {created_display}"


def render_library_view(
    *,
    session: StorySessionProxy,
    auth_user: Mapping[str, Any] | None,
    use_remote_exports: bool,
    library_init_error: str | None = None,
) -> None:
    import streamlit as st
    import streamlit.components.v1 as components

    st.subheader("저장한 동화 보기")
    if library_init_error:
        st.warning(f"동화 기록 저장소 초기화 중 문제가 발생했어요: {library_init_error}")

    filter_options = ["모두의 동화"]
    if auth_user:
        filter_options.append("내 동화")

    view_filter = st.radio(
        "어떤 동화를 살펴볼까요?",
        filter_options,
        horizontal=True,
        key="story_view_filter",
    )
    only_mine = view_filter == "내 동화" and auth_user is not None
    if not auth_user:
        st.caption("로그인하면 내가 만든 동화만 모아볼 수 있어요.")

    entries, load_error = load_library_entries(
        auth_user=auth_user,
        only_mine=only_mine,
        use_remote_exports=use_remote_exports,
        include_legacy=not only_mine,
    )

    if load_error:
        st.error(f"동화 기록을 불러오지 못했어요: {load_error}")

    if not entries:
        if only_mine:
            st.info("아직 내가 만든 동화가 없어요. 새 동화를 만들어보세요.")
        else:
            st.info("저장된 동화가 없습니다. 먼저 동화를 생성해주세요.")
        return

    tokens = [entry.token for entry in entries]
    selected_token = session.get("selected_export")
    default_index = tokens.index(selected_token) if selected_token in tokens else 0

    def _format_entry(idx: int) -> str:
        entry = entries[idx]
        include_author = not only_mine
        return _format_entry_caption(entry, include_author=include_author)

    selected_index = st.selectbox(
        "읽고 싶은 동화를 선택하세요",
        list(range(len(entries))),
        index=default_index,
        format_func=_format_entry,
        key="story_entry_select",
    )

    selected_entry = entries[selected_index]
    session["selected_export"] = selected_entry.token
    session["view_story_id"] = selected_entry.story_id
    session["story_export_remote_blob"] = selected_entry.gcs_object
    session["story_export_remote_url"] = selected_entry.gcs_url

    html_content, html_error, local_path_used = _resolve_entry_html(selected_entry)
    session["story_export_path"] = local_path_used

    token = selected_entry.token
    story_origin = selected_entry.origin
    story_title_display = selected_entry.title
    story_id_value = selected_entry.story_id

    if html_content is None:
        if html_error:
            st.error(f"동화를 여는 데 실패했습니다: {html_error}")
        else:
            st.error("동화를 여는 데 실패했습니다.")
        if selected_entry.gcs_url:
            st.caption(f"파일 URL: {selected_entry.gcs_url}")
        elif selected_entry.local_path:
            st.caption(f"파일 경로: {selected_entry.local_path}")
        log_key = f"fail:{token}"
        if session.get("story_view_logged_token") != log_key:
            emit_log_event(
                type="story",
                action="story view",
                result="fail",
                params=[
                    story_id_value or token,
                    story_title_display,
                    story_origin,
                    selected_entry.gcs_url or selected_entry.local_path,
                    html_error or "missing content",
                ],
            )
            session["story_view_logged_token"] = log_key
    else:
        st.download_button(
            "동화 다운로드",
            data=html_content,
            file_name=selected_entry.html_filename or "story.html",
            mime="text/html",
            width='stretch',
        )
        if selected_entry.gcs_url:
            st.caption(f"파일 URL: {selected_entry.gcs_url}")
        elif selected_entry.local_path:
            st.caption(f"파일 경로: {selected_entry.local_path}")
        components.html(html_content, height=700, scrolling=True)
        log_key = f"success:{token}"
        if session.get("story_view_logged_token") != log_key:
            emit_log_event(
                type="story",
                action="story view",
                result="success",
                params=[
                    story_id_value or token,
                    story_title_display,
                    story_origin,
                    selected_entry.gcs_url or selected_entry.local_path,
                    None,
                ],
            )
            session["story_view_logged_token"] = log_key

    c1, c2 = st.columns(2)
    with c1:
        if st.button("← 선택 화면으로", width='stretch'):
            session.mode = None
            session.step = 0
            session["selected_export"] = None
            session["story_export_path"] = None
            session["view_story_id"] = None
            session["story_view_logged_token"] = None
            session["story_export_remote_blob"] = None
            session["story_export_remote_url"] = None
            st.rerun()
    with c2:
        if st.button("✏️ 새 동화 만들기", width='stretch'):
            session.mode = "create"
            session.step = 1
            session["story_view_logged_token"] = None
            session["view_story_id"] = None
            st.rerun()


__all__ = [
    "LibraryEntry",
    "load_library_entries",
    "render_library_view",
]
