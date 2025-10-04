"""Utilities for generating and uploading Text-to-Speech narrations."""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Iterable, Iterator

from dotenv import load_dotenv

from google_credentials import get_service_account_credentials

load_dotenv()

try:  # pragma: no cover - optional dependency guard
    from google.api_core.exceptions import GoogleAPIError  # type: ignore
    from google.cloud import storage, texttospeech  # type: ignore
except Exception:  # pragma: no cover - degrade gracefully when dependencies missing
    storage = None  # type: ignore
    texttospeech = None  # type: ignore
    GoogleAPIError = Exception  # type: ignore

logger = logging.getLogger(__name__)

GCS_BUCKET_NAME = (os.getenv("GCS_BUCKET_NAME") or "").strip()
GCP_PROJECT = (os.getenv("GCP_PROJECT") or "").strip()
TTS_PREFIX_RAW = (os.getenv("TTS_PREFIX") or "tts").strip()
DEFAULT_VOICE_NAME = (os.getenv("TTS_DEFAULT_VOICE") or "ko-KR-Wavenet-A").strip() or "ko-KR-Wavenet-A"
MAX_CHAR_LIMIT = 3900  # Leave headroom under the API's 5000 byte cap.
_AUDIO_CONTENT_TYPE = "audio/mpeg"


@dataclass(slots=True)
class StoryAudio:
    """Represents a synthesized audio narration stored in GCS."""

    blob_name: str
    public_url: str


def _is_ready() -> bool:
    return bool(GCS_BUCKET_NAME) and bool(storage) and bool(texttospeech)


def is_tts_configured() -> bool:
    """Return True when TTS prerequisites appear to be in place."""

    return _is_ready()


def _normalize_prefix(raw: str) -> str:
    trimmed = raw.strip().strip("/")
    return f"{trimmed}/" if trimmed else ""


def _object_name(story_id: str) -> str:
    return f"{_normalize_prefix(TTS_PREFIX_RAW)}{story_id}.mp3"


def _language_code(voice_name: str) -> str:
    parts = voice_name.split("-")
    return "-".join(parts[:2]) if len(parts) >= 2 else "en-US"


def _chunk_text(text: str, limit: int = MAX_CHAR_LIMIT) -> Iterable[str]:
    normalized = text.replace("\r\n", "\n").strip()
    if not normalized:
        return []

    def _iter() -> Iterator[str]:
        paragraphs = [p.strip() for p in normalized.split("\n\n")]
        buffer: list[str] = []
        current_len = 0
        for paragraph in paragraphs:
            if not paragraph:
                continue
            candidate_len = current_len + (2 if buffer else 0) + len(paragraph)
            if candidate_len <= limit:
                buffer.append(paragraph)
                current_len = candidate_len
                continue
            if buffer:
                yield "\n\n".join(buffer)
                buffer = []
                current_len = 0
            if len(paragraph) <= limit:
                buffer = [paragraph]
                current_len = len(paragraph)
                continue
            start = 0
            while start < len(paragraph):
                yield paragraph[start : start + limit]
                start += limit
        if buffer:
            yield "\n\n".join(buffer)

    return list(_iter())


def _get_tts_client() -> "texttospeech.TextToSpeechClient":
    if not texttospeech:
        raise RuntimeError("google-cloud-texttospeech is not installed")
    credentials = get_service_account_credentials()
    client_kwargs: dict[str, object] = {}
    if credentials is not None:
        client_kwargs["credentials"] = credentials
    return texttospeech.TextToSpeechClient(**client_kwargs)  # type: ignore[arg-type]


def _get_storage_client() -> "storage.Client":
    if not storage:
        raise RuntimeError("google-cloud-storage is not installed")
    client_kwargs: dict[str, object] = {}
    credentials = get_service_account_credentials()
    if credentials is not None:
        client_kwargs["credentials"] = credentials
        project_id = getattr(credentials, "project_id", "")
        if project_id and not GCP_PROJECT:
            client_kwargs["project"] = project_id
    if GCP_PROJECT:
        client_kwargs["project"] = GCP_PROJECT
    return storage.Client(**client_kwargs)  # type: ignore[arg-type]


def _synthesize_chunks(chunks: Iterable[str], voice_name: str) -> bytes:
    client = _get_tts_client()
    language_code = _language_code(voice_name)

    audio_segments: list[bytes] = []
    for chunk in chunks:
        if not chunk.strip():
            continue
        synthesis_input = texttospeech.SynthesisInput(text=chunk)
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name,
        )
        audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
        audio_segments.append(response.audio_content)
    return b"".join(audio_segments)


def generate_story_audio(
    *,
    story_id: str,
    full_text: str,
    voice_name: str | None = None,
    skip_if_exists: bool = True,
) -> StoryAudio | None:
    """Generate or reuse a narration for the provided story.

    Returns ``StoryAudio`` when synthesis succeeds, otherwise ``None``.
    """

    if not _is_ready():
        logger.debug("TTS not configured; skipping audio generation")
        return None

    normalized_story_id = (story_id or "").strip()
    if not normalized_story_id:
        raise ValueError("story_id is required for audio generation")

    text = (full_text or "").strip()
    if not text:
        logger.debug("Empty story text provided; skipping audio generation for %s", story_id)
        return None

    chosen_voice = (voice_name or DEFAULT_VOICE_NAME).strip()
    if not chosen_voice:
        raise ValueError("A voice name must be provided or configured")

    object_name = _object_name(normalized_story_id)

    storage_client = _get_storage_client()
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    blob = bucket.blob(object_name)

    if skip_if_exists:
        try:
            if blob.exists(storage_client):
                logger.debug("Reusing existing narration blob %s", object_name)
                return StoryAudio(blob_name=object_name, public_url=blob.public_url)
        except GoogleAPIError as exc:  # pragma: no cover - network error
            logger.warning("Failed to check existence of %s: %s", object_name, exc)

    chunks = _chunk_text(text)
    if not chunks:
        logger.debug("No text chunks derived for %s", story_id)
        return None

    try:
        audio_bytes = _synthesize_chunks(chunks, chosen_voice)
    except GoogleAPIError as exc:  # pragma: no cover - API error
        logger.warning("TTS synthesis failed for %s: %s", story_id, exc)
        return None
    except Exception as exc:  # pragma: no cover - defensive catch
        logger.warning("Unexpected error during TTS synthesis for %s: %s", story_id, exc)
        return None

    if not audio_bytes:
        logger.debug("Synthesized audio was empty for %s", story_id)
        return None

    try:
        blob.upload_from_string(audio_bytes, content_type=_AUDIO_CONTENT_TYPE)
    except GoogleAPIError as exc:  # pragma: no cover - network error
        logger.warning("Failed to upload narration for %s: %s", story_id, exc)
        return None
    except Exception as exc:  # pragma: no cover - defensive catch
        logger.warning("Unexpected error uploading narration for %s: %s", story_id, exc)
        return None

    logger.info("tts.audio.generated", extra={"story_id": normalized_story_id, "blob_name": object_name})
    return StoryAudio(blob_name=object_name, public_url=blob.public_url)


__all__ = ["generate_story_audio", "StoryAudio", "is_tts_configured"]
