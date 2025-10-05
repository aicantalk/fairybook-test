from ui.create.progress import count_completed_stages, compute_progress_value


def test_count_completed_stages_handles_none_and_truthy():
    assert count_completed_stages(None) == 0
    assert count_completed_stages([]) == 0
    assert count_completed_stages([None, {"ok": True}, "", 0, [1]]) == 2


def test_compute_progress_value_returns_expected_steps():
    total_phases = 5
    assert compute_progress_value(mode=None, current_step=1, completed_stages=0, total_phases=total_phases) is None
    assert compute_progress_value(mode="view", current_step=3, completed_stages=0, total_phases=total_phases) is None
    assert compute_progress_value(mode="create", current_step=0, completed_stages=0, total_phases=total_phases) is None

    assert compute_progress_value(mode="create", current_step=1, completed_stages=0, total_phases=total_phases) == 0.15
    assert compute_progress_value(mode="create", current_step=2, completed_stages=0, total_phases=total_phases) == 0.25
    assert compute_progress_value(mode="create", current_step=3, completed_stages=0, total_phases=total_phases) == 0.35

    step4_value = compute_progress_value(mode="create", current_step=4, completed_stages=2, total_phases=total_phases)
    assert step4_value == 0.35 + (2 / total_phases) * 0.6

    step5_value = compute_progress_value(mode="create", current_step=5, completed_stages=4, total_phases=total_phases)
    assert step5_value == 0.35 + (4 / total_phases) * 0.6

    assert compute_progress_value(mode="create", current_step=6, completed_stages=total_phases, total_phases=total_phases) == 1.0
    assert compute_progress_value(mode="create", current_step=6, completed_stages=total_phases + 2, total_phases=total_phases) == 1.0
