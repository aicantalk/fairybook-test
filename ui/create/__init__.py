"""Helpers for orchestrating the create flow steps."""
from __future__ import annotations

import importlib
from typing import Callable

from .context import CreatePageContext


_STEP_MODULES: dict[int, str] = {
    1: "ui.create.step1",
    2: "ui.create.step2",
    3: "ui.create.step3",
    4: "ui.create.step4",
    5: "ui.create.step5",
    6: "ui.create.step6",
}

_RENDERER_CACHE: dict[int, Callable[[CreatePageContext], None]] = {}


def _get_renderer(step_number: int) -> Callable[[CreatePageContext], None] | None:
    """Dynamically import the renderer for the given step."""

    if step_number in _RENDERER_CACHE:
        return _RENDERER_CACHE[step_number]

    module_name = _STEP_MODULES.get(step_number)
    if not module_name:
        return None

    module = importlib.import_module(module_name)
    renderer = getattr(module, "render_step", None)
    if not callable(renderer):
        return None

    _RENDERER_CACHE[step_number] = renderer
    return renderer


def render_current_step(context: CreatePageContext, step_number: int) -> None:
    renderer = _get_renderer(step_number)
    if renderer is None:
        return
    renderer(context)


__all__ = ["CreatePageContext", "render_current_step"]

