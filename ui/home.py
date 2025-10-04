"""Home screen for selecting the app mode."""
from __future__ import annotations

from typing import Any, Mapping, Sequence

import streamlit as st

from gcs_storage import is_gcs_available, list_gcs_exports
from services.generation_tokens import status_from_mapping
from services.story_service import list_html_exports
from story_library import list_story_records
from session_state import ensure_state, reset_all_state
from utils.time_utils import format_kst

def render_home_screen(
    *,
    auth_user: Mapping[str, object] | None,
    use_remote_exports: bool,
    story_types: Sequence[Mapping[str, object]],
    motd: Mapping[str, Any] | None = None,
    generation_tokens: Mapping[str, Any] | None = None,
    generation_token_error: str | None = None,
) -> None:
    st.subheader("어떤 작업을 하시겠어요?")
    try:
        exports_available = bool(list_story_records(limit=1))
    except Exception:
        if use_remote_exports and is_gcs_available():
            exports_available = bool(list_gcs_exports())
        else:
            exports_available = bool(list_html_exports())

    token_status = status_from_mapping(generation_tokens)
    allow_create = True
    if auth_user:
        if generation_token_error:
            st.warning(f"토큰 정보를 불러오지 못했어요: {generation_token_error}")
        elif token_status:
            token_caption = f"남은 생성 토큰: **{token_status.tokens}개** (자동 충전 한도 {token_status.auto_cap}개)"
            if token_status.last_refill_at:
                token_caption += f" · 최근 자동 충전: {format_kst(token_status.last_refill_at)}"
            st.caption(token_caption)
            if token_status.tokens <= 0:
                allow_create = False
                st.error("생성 토큰이 모두 소진되었어요. 자정 이후 자동 충전되면 다시 시도해 주세요.")

    c1, c2 = st.columns(2)
    with c1:
        if st.button(
            "✏️ 동화 만들기",
            width='stretch',
            disabled=auth_user is not None and not allow_create,
        ):
            if auth_user:
                reset_all_state()
                ensure_state(story_types)
                st.session_state["mode"] = "create"
                st.session_state["step"] = 1
            else:
                st.session_state["auth_next_action"] = "create"
                st.session_state["mode"] = "auth"
            st.rerun()
        elif auth_user and not allow_create:
            st.caption("토큰이 충전되면 자동으로 다시 시작할 수 있어요.")
    with c2:
        view_clicked = st.button(
            "📖 동화책 읽기",
            width='stretch',
            disabled=not exports_available,
        )
        if view_clicked:
            st.session_state["mode"] = "view"
            st.session_state["step"] = 5

    board_clicked = st.button("💬 동화 작업실 게시판", width='stretch')
    if board_clicked:
        if auth_user:
            st.session_state["mode"] = "board"
            st.session_state["step"] = 0
            st.session_state["board_submit_error"] = None
            st.session_state["board_submit_success"] = None
        else:
            st.session_state["auth_next_action"] = "board"
            st.session_state["mode"] = "auth"
        st.rerun()


__all__ = ["render_home_screen"]
