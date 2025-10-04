"""Quick smoke test for Google Cloud Text-to-Speech using local .env settings."""
from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from google_credentials import get_service_account_credentials

try:  # pragma: no cover - optional dependency guard
    from google.cloud import texttospeech  # type: ignore
except Exception as exc:  # pragma: no cover - degrade gracefully when package missing
    texttospeech = None  # type: ignore
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None

LOGGER = logging.getLogger("tts_smoke_test")
DEFAULT_TEXT = "옛날 옛적 한 마을에 용감한 아이가 살았어요."
DEFAULT_VOICE = "ko-KR-Wavenet-A"
DEFAULT_OUTPUT = "tts_smoke_test.mp3"


def _language_code_from_voice(voice_name: str) -> str:
    parts = voice_name.split("-")
    if len(parts) >= 2:
        return "-".join(parts[:2])
    return "en-US"


def _build_client() -> "texttospeech.TextToSpeechClient":
    if texttospeech is None:  # pragma: no cover - runtime guard
        raise RuntimeError(
            "google-cloud-texttospeech is not installed"
        ) from _IMPORT_ERROR

    credentials = get_service_account_credentials()
    client_kwargs: dict[str, object] = {}
    if credentials is not None:
        client_kwargs["credentials"] = credentials
    return texttospeech.TextToSpeechClient(**client_kwargs)  # type: ignore[arg-type]


def synthesize(text: str, voice_name: str, output_path: Path) -> Path:
    client = _build_client()

    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice_params = texttospeech.VoiceSelectionParams(
        language_code=_language_code_from_voice(voice_name),
        name=voice_name,
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
    )

    LOGGER.info("Requesting Text-to-Speech synthesis with voice %s", voice_name)
    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice_params,
        audio_config=audio_config,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(response.audio_content)
    LOGGER.info("Saved audio to %s (%d bytes)", output_path, output_path.stat().st_size)
    return output_path


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--text", help="Text to synthesize; defaults to env or preset.")
    parser.add_argument("--voice", help="Voice name (e.g. ko-KR-Wavenet-A).")
    parser.add_argument("--output", help="Output MP3 path.")
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    load_dotenv()

    args = parse_args(argv)
    text = args.text or os.getenv("TTS_TEST_TEXT") or DEFAULT_TEXT
    voice_name = args.voice or os.getenv("TTS_TEST_VOICE") or DEFAULT_VOICE
    output_raw = args.output or os.getenv("TTS_TEST_OUTPUT") or DEFAULT_OUTPUT
    output_path = Path(output_raw).expanduser().resolve()

    try:
        synthesize(text, voice_name, output_path)
    except Exception as exc:  # pragma: no cover - CLI diagnostic path
        LOGGER.error("TTS test failed: %s", exc)
        return 1

    LOGGER.info("TTS test finished successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
