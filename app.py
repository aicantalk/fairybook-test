# app.py
from __future__ import annotations

import base64
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

import streamlit as st

from activity_log import init_activity_log
from app_constants import STORY_PHASES
from services.generation_tokens import (
    GenerationTokenStatus,
    sync_on_login,
    status_from_mapping,
    status_to_dict,
)
from session_state import ensure_state, reset_all_state
from session_proxy import StorySessionProxy
from story_library import init_story_library
from telemetry import emit_log_event
from ui.auth import render_auth_gate
from ui.board import render_board_page
from ui.create import CreatePageContext, render_current_step
from ui.create.progress import count_completed_stages, compute_progress_value
from ui.home import render_home_screen
from ui.library import render_library_view
from ui.settings import render_account_settings
from ui.styles import render_app_styles
from utils.auth import (
    auth_display_name,
    auth_email,
    clear_auth_session,
    ensure_active_auth_session,
)
from utils.network import get_client_ip
from utils.time_utils import format_kst
from motd_store import get_motd

st.set_page_config(page_title="동화책 생성기", page_icon="📖", layout="centered")

JSON_PATH = BASE_DIR / "storytype.json"
STYLE_JSON_PATH = BASE_DIR / "illust_styles.json"
STORY_JSON_PATH = BASE_DIR / "story.json"
ENDING_JSON_PATH = BASE_DIR / "ending.json"
ILLUST_DIR = BASE_DIR / "illust"
HOME_BACKGROUND_IMAGE_PATH = BASE_DIR / "assets/illus-home-hero.png"

STORY_LIBRARY_INIT_ERROR: str | None = None
try:
    init_story_library()
except Exception as exc:  # pragma: no cover - initialization failure surfaced later
    STORY_LIBRARY_INIT_ERROR = str(exc)

init_activity_log()


def _clear_generation_token_state() -> None:
    st.session_state["generation_token_status"] = None
    st.session_state["generation_token_error"] = None
    st.session_state["generation_token_synced_at"] = None
    st.session_state["generation_token_uid"] = None
    st.session_state["generation_token_refill_delta"] = 0


def _store_generation_token_state(
    *,
    uid: str,
    status: GenerationTokenStatus,
    refilled_by: int,
) -> None:
    st.session_state["generation_token_status"] = status_to_dict(status)
    st.session_state["generation_token_uid"] = uid
    st.session_state["generation_token_synced_at"] = datetime.now(timezone.utc).isoformat()
    st.session_state["generation_token_refill_delta"] = refilled_by
    st.session_state["generation_token_error"] = None


def _current_generation_token_status() -> GenerationTokenStatus | None:
    raw_status = st.session_state.get("generation_token_status")
    return status_from_mapping(raw_status)


def _maybe_sync_generation_tokens(auth_user: Mapping[str, Any] | None) -> None:
    if not auth_user:
        _clear_generation_token_state()
        return

    uid = str(auth_user.get("uid") or "").strip()
    if not uid:
        _clear_generation_token_state()
        return

    cached_uid = st.session_state.get("generation_token_uid")
    if cached_uid != uid:
        _clear_generation_token_state()

    if st.session_state.get("generation_token_status") is not None:
        return

    try:
        sync_result = sync_on_login(uid=uid)
    except Exception as exc:  # noqa: BLE001
        st.session_state["generation_token_error"] = str(exc)
        return

    _store_generation_token_state(uid=uid, status=sync_result.status, refilled_by=sync_result.refilled_by)


def _maybe_show_motd(active_motd: Mapping[str, Any] | None, *, mode: str | None) -> None:
    if not active_motd or mode == "auth":
        return

    signature = str(active_motd.get("signature") or "").strip()
    message = str(active_motd.get("message") or "").strip()
    if not signature or not message:
        return

    seen_signature = st.session_state.get("motd_seen_signature")
    if mode == "board" and seen_signature != signature:
        st.session_state["motd_seen_signature"] = signature
        return

    if seen_signature == signature:
        return

    meta_parts: list[str] = []
    updated_kst = active_motd.get("updated_at_kst")
    if updated_kst:
        meta_parts.append(f"업데이트: {updated_kst}")
    updated_by = active_motd.get("updated_by")
    if updated_by:
        meta_parts.append(f"작성자: {updated_by}")

    def _render_content() -> None:
        st.markdown(message)
        if meta_parts:
            st.caption(" · ".join(meta_parts))

    def _acknowledge() -> None:
        st.session_state["motd_seen_signature"] = signature
        st.rerun()

    if hasattr(st, "modal"):
        with st.modal("📢 공지사항", key="motd_modal"):
            _render_content()
            if st.button("확인했어요", use_container_width=True, key="motd_ack_modal"):
                _acknowledge()
    elif hasattr(st, "experimental_dialog"):
        @st.experimental_dialog("📢 공지사항")
        def _motd_dialog() -> None:
            _render_content()
            if st.button("확인했어요", use_container_width=True, key="motd_ack_experimental"):
                _acknowledge()

        _motd_dialog()
    elif hasattr(st, "dialog"):
        @st.dialog("📢 공지사항")
        def _motd_dialog() -> None:
            _render_content()
            if st.button("확인했어요", use_container_width=True, key="motd_ack_dialog"):
                _acknowledge()

        _motd_dialog()
    else:
        st.info(message)
        if meta_parts:
            st.caption(" · ".join(meta_parts))
        st.session_state["motd_seen_signature"] = signature


def _load_json_entries_from_file(path: str | Path, key: str) -> list[dict]:
    """Safely load a list of dict entries from a JSON file."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

    items = payload.get(key)
    if not isinstance(items, list):
        return []
    return [item for item in items if isinstance(item, dict)]

@st.cache_data
def load_story_types():
    return _load_json_entries_from_file(JSON_PATH, "story_types")

@st.cache_data
def load_illust_styles():
    return _load_json_entries_from_file(STYLE_JSON_PATH, "illust_styles")


@st.cache_data
def load_story_cards():
    return _load_json_entries_from_file(STORY_JSON_PATH, "cards")


@st.cache_data
def load_ending_cards():
    return _load_json_entries_from_file(ENDING_JSON_PATH, "story_endings")


@st.cache_data(show_spinner=False)
def load_image_as_base64(path: str) -> str | None:
    """지정된 경로의 이미지를 base64 문자열로 반환."""
    if not path:
        return None
    try:
        data = Path(path).read_bytes()
    except FileNotFoundError:
        return None
    except IsADirectoryError:
        return None
    return base64.b64encode(data).decode("utf-8")


story_types = load_story_types()
if not story_types:
    st.error("storytype.json에서 story_types를 찾지 못했습니다.")
    st.stop()

illust_styles = load_illust_styles()
story_cards = load_story_cards()
ending_cards = load_ending_cards()

ensure_state(story_types)
session_proxy = StorySessionProxy(st.session_state)



def logout_user() -> None:
    previous_user = st.session_state.get("auth_user")
    display_name = None
    user_email = None
    if isinstance(previous_user, Mapping):
        display_name = auth_display_name(previous_user)
        user_email = auth_email(previous_user)
    client_ip = get_client_ip()
    clear_auth_session()
    reset_all_state()
    st.session_state["board_user_alias"] = None
    st.session_state["board_content"] = ""
    st.session_state["auth_next_action"] = None
    _clear_generation_token_state()
    emit_log_event(
        type="user",
        action="logout",
        result="success",
        params=[client_ip, display_name, None, None, None],
        client_ip=client_ip,
        user_email=user_email,
    )
# ─────────────────────────────────────────────────────────────────────
# 헤더/인증/진행
# ─────────────────────────────────────────────────────────────────────
home_bg = load_image_as_base64(str(HOME_BACKGROUND_IMAGE_PATH))
auth_user = ensure_active_auth_session()
_maybe_sync_generation_tokens(auth_user)
mode = st.session_state.get("mode")
current_step = st.session_state["step"]

motd_record = get_motd()
active_motd: dict[str, Any] | None = None
if motd_record and motd_record.is_active and motd_record.message.strip():
    active_motd = {
        "message": motd_record.message,
        "signature": motd_record.signature,
        "updated_at": motd_record.updated_at,
        "updated_at_kst": format_kst(motd_record.updated_at),
        "updated_by": motd_record.updated_by,
    }

_maybe_show_motd(active_motd, mode=mode)

if mode in {"create", "board", "settings"} and not auth_user:
    st.session_state["auth_next_action"] = mode
    st.session_state["mode"] = "auth"
    st.rerun()

if mode == "auth":
    render_auth_gate(home_bg)
    st.stop()

st.title("📖 동화책 생성기")
header_cols = st.columns([6, 1])

with header_cols[0]:
    if auth_user:
        st.caption(f"👋 **{auth_display_name(auth_user)}**님 반가워요.")
    else:
        st.caption("로그인하면 동화 만들기와 게시판을 이용할 수 있어요.")

with header_cols[1]:
    menu = st.popover("⚙️", width='stretch')
    with menu:
        st.markdown("#### 메뉴")
        if auth_user:
            st.write(f"현재 사용자: **{auth_display_name(auth_user)}**")
            if st.button("로그아웃", width='stretch'):
                logout_user()
                st.rerun()
            if st.button("계정 설정", width='stretch'):
                st.session_state["mode"] = "settings"
                st.session_state["step"] = 0
                st.session_state["auth_next_action"] = None
                st.rerun()
            st.caption("계정 정보와 비밀번호를 관리할 수 있어요.")
        else:
            if st.button("로그인 / 회원가입", width='stretch'):
                st.session_state["auth_next_action"] = None
                st.session_state["mode"] = "auth"
                st.session_state["auth_form_mode"] = "signin"
                st.session_state["auth_error"] = None
                st.rerun()
            st.button("설정 (로그인 필요)", disabled=True, width='stretch')
            st.caption("로그인하면 더 많은 기능을 사용할 수 있어요.")

progress_placeholder = st.empty()
stages_data = st.session_state.get("stages_data")
completed_stages = count_completed_stages(stages_data if isinstance(stages_data, list) else None)
progress_value = compute_progress_value(
    mode=mode,
    current_step=current_step,
    completed_stages=completed_stages,
    total_phases=len(STORY_PHASES),
)
if progress_value is not None:
    progress_placeholder.progress(progress_value)
else:
    progress_placeholder.empty()

if mode == "board":
    render_board_page(home_bg, auth_user=auth_user, motd=active_motd)
    st.stop()

if mode == "settings":
    render_account_settings(home_bg, auth_user=auth_user)
    st.stop()

render_app_styles(home_bg, show_home_hero=current_step == 0)

create_context = CreatePageContext(
    session=session_proxy,
    story_types=story_types,
    illust_styles=illust_styles,
    story_cards=story_cards,
    ending_cards=ending_cards,
    auth_user=auth_user,
    home_background=home_bg,
    illust_dir=str(ILLUST_DIR),
    generation_tokens=st.session_state.get("generation_token_status"),
    generation_token_error=st.session_state.get("generation_token_error"),
)

if current_step == 0:
    render_home_screen(
        auth_user=auth_user,
        story_types=story_types,
        motd=active_motd,
        generation_tokens=st.session_state.get("generation_token_status"),
        generation_token_error=st.session_state.get("generation_token_error"),
    )
elif mode == "create" and current_step in {1, 2, 3, 4, 5, 6}:
    render_current_step(create_context, current_step)
    st.stop()
elif current_step == 5 and mode == "view":
    render_library_view(
        session=session_proxy,
        auth_user=auth_user,
        library_init_error=STORY_LIBRARY_INIT_ERROR,
    )
    st.stop()
