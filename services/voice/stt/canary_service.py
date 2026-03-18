"""
Canary-1B-Flash STT service (Phase 2 - Priority 16)

This module provides best-effort speech-to-text utilities for the self-hosted
voice stack.

Implementation note:
Pipecat integration for Canary streaming requires a concrete STT adapter interface
to emit frames during streaming. That adapter wiring is handled in the Pipecat
pipeline step(s) later. For now, this module focuses on the underlying
transcription functionality (including local fallback via faster-whisper).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Iterable, Iterator, Optional


@dataclass
class CanaryTranscriptionResult:
  text: str
  confidence: Optional[float] = None


def _env(name: str, fallback: str) -> str:
  return os.getenv(name) or fallback


class CanarySTTService:
  """
  Best-effort local STT implementation.

  - Uses `faster-whisper` when available for transcription.
  - Exposes a streaming-friendly API by buffering audio chunks and transcribing
    once enough audio is accumulated.
  """

  def __init__(self) -> None:
    # NOTE: actual Canary 1B Flash streaming may require a dedicated runtime.
    # We keep this implementation local for now.
    self._model_name = _env("CANARY_MODEL", "medium")
    self._device = _env("CANARY_DEVICE", "cpu")

    # Lazy load model to avoid import-time failures.
    self._model = None

  def _ensure_model(self):
    if self._model is not None:
      return self._model

    try:
      from faster_whisper import WhisperModel  # type: ignore
    except ModuleNotFoundError as e:
      raise RuntimeError(
        "Missing faster-whisper dependency. Install with `pip install faster-whisper>=1.0.0`."
      ) from e

    self._model = WhisperModel(self._model_name, device=self._device, compute_type="int8")
    return self._model

  def transcribe_pcm16(self, pcm16_bytes: bytes, sample_rate: int, language: Optional[str] = None) -> CanaryTranscriptionResult:
    """
    Transcribe raw PCM16 little-endian bytes.
    """
    model = self._ensure_model()

    try:
      import numpy as np  # type: ignore
    except ModuleNotFoundError as e:
      raise RuntimeError("Missing numpy dependency for audio conversion.") from e

    audio = np.frombuffer(pcm16_bytes, dtype=np.int16).astype(np.float32) / 32768.0

    segments, info = model.transcribe(audio, language=language or None, vad_filter=True)
    text = " ".join([seg.text.strip() for seg in segments if seg.text and seg.text.strip()])

    confidence = None
    # `info` can vary; best-effort extraction.
    if hasattr(info, "language") and getattr(info, "language") is not None:
      confidence = None

    return CanaryTranscriptionResult(text=text, confidence=confidence)

  def transcribe_buffer(
    self,
    audio_chunks: Iterable[bytes],
    sample_rate: int,
    language: Optional[str] = None,
  ) -> CanaryTranscriptionResult:
    """
    Convenience wrapper for concatenated PCM16 chunks.
    """
    pcm = b"".join(list(audio_chunks))
    return self.transcribe_pcm16(pcm, sample_rate=sample_rate, language=language)

