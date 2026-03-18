import io
import os
from concurrent import futures
from typing import Dict, Optional


def _env(name: str, fallback: str) -> str:
  return os.getenv(name) or fallback


# Keep imports inside functions so `pip install -r requirements.txt` isn't required
# for the Node/TS test suite to pass.
_pipeline_cache: Dict[str, object] = {}


def get_pipeline(lang_code: str) -> object:
  """
  Lazily initialize Kokoro pipeline for the given language code.
  """
  key = lang_code.trim() if hasattr(lang_code, "trim") else str(lang_code)
  if key in _pipeline_cache:
    return _pipeline_cache[key]

  from kokoro import KPipeline  # type: ignore

  pipeline = KPipeline(lang_code=key)
  _pipeline_cache[key] = pipeline
  return pipeline


def synthesize_wav_bytes(text: str, voice_preset: Optional[str], lang_code: str, speed: float, volume: float) -> bytes:
  """
  Best-effort synthesize Kokoro output to WAV bytes.

  Note: Kokoro's API shape can evolve; this implementation uses the common
  generator form: `pipeline(text, voice=...)` yielding `(gs, ps, audio)` chunks.
  """
  # Kokoro expects a voice name. We accept the caller's preset and fall back.
  voice = voice_preset or _env("KOKORO_DEFAULT_VOICE", "af_heart")

  import numpy as np  # type: ignore
  import soundfile as sf  # type: ignore

  pipeline = get_pipeline(lang_code)
  sample_rate = int(_env("KOKORO_SAMPLE_RATE", "24000"))

  # Generator yields audio chunks.
  chunks = []
  for _gs, _ps, audio in pipeline(text, voice=voice, speed=speed, volume=volume):
    arr = np.asarray(audio, dtype=np.float32)
    if arr.size > 0:
      chunks.append(arr)

  if chunks:
    audio_full = np.concatenate(chunks)
  else:
    audio_full = np.zeros((1,), dtype=np.float32)

  buf = io.BytesIO()
  sf.write(buf, audio_full, sample_rate, format="WAV", subtype="PCM_16")
  return buf.getvalue()


def main() -> None:
  import grpc  # type: ignore
  # Generated at Docker build time.
  try:
    from .kokoro_pb2 import SynthesizeResponse  # type: ignore
    from .kokoro_pb2_grpc import add_KokoroTTSServicer_to_server, KokoroTTSServicer  # type: ignore
  except ImportError:
    # Fallback when running as a standalone script.
    from kokoro_pb2 import SynthesizeResponse  # type: ignore
    from kokoro_pb2_grpc import add_KokoroTTSServicer_to_server, KokoroTTSServicer  # type: ignore

  class KokoroTTSHandler(KokoroTTSServicer):
    def Synthesize(self, request, context):
      try:
        text = request.text or ""
        if not text.strip():
          context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
          context.set_details("text is required")
          return SynthesizeResponse(audio_wav=b"", mime_type="")

        lang_code = request.workspace_id or _env("KOKORO_LANG_CODE", "a")
        audio_bytes = synthesize_wav_bytes(
          text=text,
          voice_preset=request.voice_preset or None,
          lang_code=lang_code,
          speed=float(request.speed or 1.0),
          volume=float(request.volume or 1.0),
        )

        return SynthesizeResponse(audio_wav=audio_bytes, mime_type="audio/wav")
      except Exception as e:
        context.set_code(grpc.StatusCode.INTERNAL)
        context.set_details(str(e))
        return SynthesizeResponse(audio_wav=b"", mime_type="")

  port = int(_env("KOKORO_GRPC_PORT", "50051"))
  server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
  add_KokoroTTSServicer_to_server(KokoroTTSHandler(), server)
  server.add_insecure_port(f"[::]:{port}")

  server.start()
  print(f"KokoroTTS gRPC listening on {port}")
  server.wait_for_termination()


if __name__ == "__main__":
  main()

