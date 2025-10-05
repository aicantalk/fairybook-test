"""Progress helpers for the story creation flow."""
from __future__ import annotations

from collections.abc import Sequence


def count_completed_stages(stages: Sequence[object] | None) -> int:
    """Return the number of completed stage payloads in the session list."""

    if not stages:
        return 0
    return sum(1 for stage in stages if stage)


def compute_progress_value(
    *,
    mode: str | None,
    current_step: int,
    completed_stages: int,
    total_phases: int,
) -> float | None:
    """Compute progress ratio for the creation wizard."""

    if mode != "create" or current_step <= 0:
        return None

    stage_share = 0.0
    if total_phases > 0:
        stage_share = max(min(completed_stages / total_phases, 1.0), 0.0)

    if current_step == 1:
        return 0.15
    if current_step == 2:
        return 0.25
    if current_step == 3:
        return 0.35
    if current_step in (4, 5):
        return min(0.35 + stage_share * 0.6, 1.0)
    if current_step == 6:
        if completed_stages >= total_phases > 0:
            return 1.0
        return min(0.35 + stage_share * 0.6, 1.0)
    return None


__all__ = ["count_completed_stages", "compute_progress_value"]
