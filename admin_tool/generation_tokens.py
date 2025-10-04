"""Admin helpers for inspecting and updating generation tokens."""
from __future__ import annotations

from services.generation_tokens import (
    DEFAULT_AUTO_CAP,
    GenerationTokenStatus,
    get_status,
    set_tokens,
    top_up_tokens,
)


def fetch_user_tokens(uid: str) -> GenerationTokenStatus | None:
    """Return the current token status for the given user."""

    if not uid:
        raise ValueError("uid is required")
    return get_status(uid)


def refill_user_tokens(uid: str) -> GenerationTokenStatus:
    """Top up a user's tokens to their auto-cap, preserving the cap itself."""

    status = fetch_user_tokens(uid)
    if status is None:
        return set_tokens(uid, tokens=DEFAULT_AUTO_CAP)

    amount = status.auto_cap if status.auto_cap > 0 else DEFAULT_AUTO_CAP
    return top_up_tokens(uid, amount=amount, allow_exceed_cap=False)


def set_user_tokens(
    uid: str,
    *,
    tokens: int,
    auto_cap: int | None = None,
) -> GenerationTokenStatus:
    """Directly update a user's token balance (and optionally auto-cap)."""

    return set_tokens(uid, tokens=tokens, auto_cap=auto_cap)


__all__ = [
    "fetch_user_tokens",
    "refill_user_tokens",
    "set_user_tokens",
]

