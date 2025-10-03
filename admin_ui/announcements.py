"""Admin page for managing the message of the day announcement."""
from __future__ import annotations

from typing import Any, Callable, Mapping

import streamlit as st

from motd_store import Motd, clear_motd, get_motd, save_motd
from utils.time_utils import format_kst


def _admin_identifier(admin_session: Mapping[str, Any]) -> str:
    email = str(admin_session.get("email") or "").strip()
    display = str(admin_session.get("display_name") or "").strip()
    return display or email or "admin"


def render_announcements(
    admin_session: Mapping[str, Any],
    *,
    log_admin_event: Callable[..., None],
    trigger_rerun,
    admin_email_lookup: Callable[[Mapping[str, Any]], str | None],
) -> None:
    st.title("📢 공지 관리")
    st.caption("서비스 접속 시 노출되는 MOTD를 수정합니다.")

    current = get_motd()
    if not current or not current.message:
        st.info("등록된 공지가 없습니다. 아래에서 새 공지를 등록하세요.")
    st.divider()

    with st.form("motd_form", clear_on_submit=False):
        default_message = current.message if current else ""
        default_active = current.is_active if current else True

        message = st.text_area(
            "공지 내용 (Markdown 지원)",
            value=default_message,
            height=180,
            placeholder="예) 이번 주 서비스 점검은 금요일 밤 10시에 진행됩니다.",
        )
        is_active = st.toggle("공지 활성화", value=default_active)
        submitted = st.form_submit_button("공지 저장", type="primary", use_container_width=True)

    identifier = admin_email_lookup(admin_session) or _admin_identifier(admin_session)

    if submitted:
        try:
            updated = save_motd(message=message, is_active=is_active, updated_by=identifier)
        except Exception as exc:  # noqa: BLE001
            st.error(f"공지를 저장하지 못했어요: {exc}")
            log_admin_event(
                "motd update",
                "fail",
                admin_identifier=identifier,
                params=[identifier, "save", str(exc), None, None],
            )
        else:
            st.success("공지를 저장했습니다.")
            log_admin_event(
                "motd update",
                "success",
                admin_identifier=identifier,
                params=[identifier, "save", updated.message, str(updated.is_active), None],
            )
            trigger_rerun()

    st.divider()

    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown("#### 공지 미리보기")
        preview = get_motd()
        if preview and preview.message:
            st.markdown(preview.message)
            status_prefix = "🟢 활성" if preview.is_active else "⚪ 비활성"
            meta = _format_meta(preview)
            st.caption(" · ".join(bit for bit in (status_prefix, meta) if bit))
        else:
            st.caption("저장된 공지가 없습니다.")
    with col2:
        st.markdown("#### 빠른 작업")
        if st.button("공지 비활성화", use_container_width=True):
            try:
                clear_motd(updated_by=identifier)
            except Exception as exc:  # noqa: BLE001
                st.error(f"공지를 비활성화하지 못했습니다: {exc}")
                log_admin_event(
                    "motd deactivate",
                    "fail",
                    admin_identifier=identifier,
                    params=[identifier, "deactivate", str(exc), None, None],
                )
            else:
                st.success("공지를 비활성화했습니다.")
                log_admin_event(
                    "motd deactivate",
                    "success",
                    admin_identifier=identifier,
                    params=[identifier, "deactivate", None, None, None],
                )
                trigger_rerun()


def _format_meta(current: Motd) -> str:
    parts: list[str] = []
    if current.updated_at:
        parts.append(f"업데이트: {format_kst(current.updated_at)}")
    if current.updated_by:
        parts.append(f"작성자: {current.updated_by}")
    return " · ".join(parts) if parts else ""


__all__ = ["render_announcements"]
