from __future__ import annotations

from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import tts_client


def test_generate_story_audio_skips_when_unavailable(monkeypatch):
    monkeypatch.setattr(tts_client, "storage", None)
    monkeypatch.setattr(tts_client, "texttospeech", None)
    monkeypatch.setattr(tts_client, "GCS_BUCKET_NAME", "")

    result = tts_client.generate_story_audio(story_id="abc", full_text="동화")

    assert result is None
    assert not tts_client.is_tts_configured()
