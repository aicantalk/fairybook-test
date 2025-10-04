"""Helpers for rendering generation token status inside the create flow."""
from __future__ import annotations

from typing import Optional

import streamlit as st

from services.generation_tokens import GenerationTokenStatus, status_from_mapping
from utils.time_utils import format_kst

from .context import CreatePageContext


def render_token_status(
    context: CreatePageContext,
    *,
    show_error: bool = True,
) -> GenerationTokenStatus | None:
    """Render the current token balance and return the parsed status."""

    status = status_from_mapping(context.generation_tokens)
    error = context.generation_token_error

    if error and show_error:
        st.warning(f"토큰 정보를 불러오지 못했어요: {error}")
        return status

    if status is None:
        return None

    message = f"남은 생성 토큰: **{status.tokens}개** (자동 충전 한도 {status.auto_cap}개)"
    if status.last_refill_at:
        message += f" · 최근 자동 충전: {format_kst(status.last_refill_at)}"
    st.caption(message)

    if status.tokens <= 0 and show_error:
        st.error("생성 토큰이 모두 소진되었어요. 내일 자정(KST)에 1개씩 충전돼요.")

    return status


__all__ = ["render_token_status"]

