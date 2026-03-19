"""
Recall Touch — Self-hosted Voice Synthesis Server v2.0

Production-grade voice AI server that replaces ElevenLabs/Vapi.
Powers real-time phone conversations via Twilio Media Streams.

Architecture:
  TTS: Orpheus TTS (primary) → Fish Speech → Kokoro → placeholder
  STT: Faster-Whisper with Silero VAD
  Conversation: Full-duplex WebSocket with barge-in, backchanneling,
                tool calls (book_appointment, capture_lead, send_sms)
  Audio: 24kHz internal → 8kHz mu-law for Twilio transport
"""

# UNTESTED — requires GPU deployment and real call verification

import asyncio
import base64
import io
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from fastapi import (
    FastAPI,
    WebSocket,
    UploadFile,
    File,
    Form,
    HTTPException,
    WebSocketDisconnect,
    Query,
    Body,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

from conversation_engine import ConversationEngine, TurnState
from voice_library import VoiceManager
from tts_engine import (
    TTSManager,
    TTSConfig,
    TTSModel,
    INDUSTRY_PRESETS,
    EMOTION_TAGS,
    pcm_to_mulaw,
    mulaw_to_pcm,
    resample_audio,
)
from stt_engine import STTEngine
from audio_pipeline import AudioPipeline, PipelineConfig
from ab_testing import ABTestManager
from cost_tracker import CostTracker

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s  %(name)-28s  %(levelname)-7s  %(message)s",
)
logger = logging.getLogger("voice-server")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Recall Touch Voice Server",
    description="Self-hosted voice AI — TTS, STT, real-time conversation",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global state
# ---------------------------------------------------------------------------
voice_manager = VoiceManager()
tts_manager: Optional[TTSManager] = None
stt_engine: Optional[STTEngine] = None
audio_pipeline: Optional[AudioPipeline] = None
ab_test_manager = ABTestManager()
cost_tracker = CostTracker()
conversation_engines: dict[str, ConversationEngine] = {}
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT_CONVERSATIONS", "10"))
usage_records: list[dict] = []  # Track voice usage for analytics


def load_stt_env() -> bool:
    """Whether startup should load Faster-Whisper (heavy on small VMs)."""
    return os.getenv("LOAD_STT_ENGINE", "true").lower() in {"1", "true", "yes"}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class TTSRequest(BaseModel):
    voice_id: str = "us-female-warm-receptionist"
    text: str
    speed: float = 1.0
    stability: float = 0.5
    style: float = 0.4
    emotion: str = "neutral"
    industry: str = "default"
    model: str = "auto"  # auto, orpheus, fish-speech, kokoro


class CloneRequest(BaseModel):
    voice_name: str
    voice_description: str


class VoiceUsageRecord(BaseModel):
    voice_id: str
    tts_model: str
    input_chars: int
    audio_duration_seconds: float
    ttfb_ms: float
    total_latency_ms: float
    timestamp: str


# ============================================================================
# Health & Status
# ============================================================================

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "recall-touch-voice-server",
        "version": "2.0.0",
        "tts_engine": tts_manager.active_model if tts_manager else "not_loaded",
        "stt_engine": (
            "whisper"
            if stt_engine and stt_engine.is_ready
            else ("disabled" if not load_stt_env() else "not_loaded")
        ),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/status")
async def status():
    return {
        "status": "running",
        "tts": {
            "engine": tts_manager.active_model if tts_manager else "none",
            "ready": tts_manager.is_ready if tts_manager else False,
        },
        "stt": {
            "engine": (
                f"whisper-{stt_engine.model_size}"
                if stt_engine
                else ("disabled" if not load_stt_env() else "none")
            ),
            "ready": stt_engine.is_ready if stt_engine else False,
        },
        "voices_available": len(voice_manager.list_voices()),
        "active_conversations": len(conversation_engines),
        "max_concurrent": MAX_CONCURRENT,
        "emotion_tags": list(EMOTION_TAGS.keys()),
        "industry_presets": list(INDUSTRY_PRESETS.keys()),
    }


# ============================================================================
# Voice Management
# ============================================================================

@app.get("/voices")
async def list_voices(
    gender: Optional[str] = None,
    accent: Optional[str] = None,
    tone: Optional[str] = None,
    industry: Optional[str] = None,
):
    voices = voice_manager.search_voices(
        gender=gender, accent=accent, tone=tone, industry=industry,
    )
    return {"voices": [v.to_dict() for v in voices], "total": len(voices)}


@app.get("/voices/{voice_id}")
async def get_voice(voice_id: str):
    voice = voice_manager.get_voice(voice_id)
    if not voice:
        raise HTTPException(404, f"Voice {voice_id} not found")
    return voice.to_dict()


@app.get("/industries")
async def list_industries():
    """List available industry presets with recommended voices."""
    return {
        "presets": INDUSTRY_PRESETS,
        "industries": list(INDUSTRY_PRESETS.keys()),
    }


@app.get("/emotions")
async def list_emotions():
    """List available emotion tags for Orpheus TTS."""
    return {
        "emotions": list(EMOTION_TAGS.keys()),
        "tags": EMOTION_TAGS,
        "note": "Emotion tags are native to Orpheus TTS. Other engines approximate via config.",
    }


# ============================================================================
# Text-to-Speech
# ============================================================================

@app.post("/tts")
async def text_to_speech(req: TTSRequest):
    """Convert text to speech. Returns audio/wav."""
    voice = voice_manager.get_voice(req.voice_id)
    if not voice:
        raise HTTPException(404, f"Voice {req.voice_id} not found")

    if not tts_manager:
        raise HTTPException(503, "TTS engine not initialized")

    # Apply industry preset overrides
    preset = INDUSTRY_PRESETS.get(req.industry, INDUSTRY_PRESETS["default"])

    config = TTSConfig(
        voice_id=req.voice_id,
        speed=req.speed or preset["speed"],
        stability=req.stability,
        style=req.style,
        warmth=voice.model_config.warmth,
        emotion=req.emotion or preset.get("emotion", "neutral"),
        industry=req.industry,
        sample_rate=24000,
    )

    logger.info(
        f"TTS: voice={req.voice_id} emotion={config.emotion} "
        f"industry={req.industry} len={len(req.text)}"
    )

    result = await tts_manager.synthesize(req.text, config)

    logger.info(
        f"TTS done: model={result.model_used} ttfb={result.ttfb_ms:.0f}ms "
        f"total={result.total_ms:.0f}ms duration={result.duration_seconds:.1f}s"
    )

    return StreamingResponse(
        iter([result.audio]),
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'attachment; filename="tts_output.wav"',
            "X-TTS-Model": result.model_used,
            "X-TTS-TTFB-Ms": str(int(result.ttfb_ms)),
            "X-TTS-Duration": str(round(result.duration_seconds, 2)),
        },
    )


@app.post("/tts/stream")
async def text_to_speech_streaming(req: TTSRequest):
    """Streaming TTS — yields audio chunks for low-latency playback."""
    voice = voice_manager.get_voice(req.voice_id)
    if not voice:
        raise HTTPException(404, f"Voice {req.voice_id} not found")

    if not tts_manager:
        raise HTTPException(503, "TTS engine not initialized")

    config = TTSConfig(
        voice_id=req.voice_id,
        speed=req.speed,
        stability=req.stability,
        style=req.style,
        warmth=voice.model_config.warmth,
        emotion=req.emotion,
        industry=req.industry,
        sample_rate=24000,
        chunk_duration_ms=40,
    )

    async def stream():
        async for chunk in tts_manager.synthesize_stream(req.text, config):
            yield chunk

    return StreamingResponse(stream(), media_type="audio/pcm")


@app.post("/tts/preview")
async def preview_voice(
    voice_id: str = Query(...),
    text: Optional[str] = Query(None),
    emotion: str = Query("neutral"),
):
    """Quick voice preview with default or custom text."""
    voice = voice_manager.get_voice(voice_id)
    if not voice:
        raise HTTPException(404, f"Voice {voice_id} not found")

    preview_text = text or voice.sample_prompt
    config = TTSConfig(
        voice_id=voice_id,
        speed=voice.model_config.speed,
        stability=voice.model_config.stability,
        style=voice.model_config.style,
        warmth=voice.model_config.warmth,
        emotion=emotion,
        sample_rate=24000,
    )

    if not tts_manager:
        raise HTTPException(503, "TTS engine not initialized")

    result = await tts_manager.synthesize(preview_text, config)
    return StreamingResponse(
        iter([result.audio]),
        media_type="audio/wav",
        headers={"X-TTS-Model": result.model_used},
    )


@app.post("/tts/processed")
async def text_to_speech_processed(req: TTSRequest):
    """TTS with full audio pipeline processing applied."""
    voice = voice_manager.get_voice(req.voice_id)
    if not voice:
        raise HTTPException(404, f"Voice {req.voice_id} not found")

    if not tts_manager:
        raise HTTPException(503, "TTS engine not initialized")

    if not audio_pipeline:
        raise HTTPException(503, "Audio pipeline not initialized")

    preset = INDUSTRY_PRESETS.get(req.industry, INDUSTRY_PRESETS["default"])

    config = TTSConfig(
        voice_id=req.voice_id,
        speed=req.speed or preset["speed"],
        stability=req.stability,
        style=req.style,
        warmth=voice.model_config.warmth,
        emotion=req.emotion or preset.get("emotion", "neutral"),
        industry=req.industry,
        sample_rate=24000,
    )

    logger.info(
        f"TTS (processed): voice={req.voice_id} emotion={config.emotion} "
        f"industry={req.industry} len={len(req.text)}"
    )

    result = await tts_manager.synthesize(req.text, config)

    # Apply pipeline processing
    import wave
    buf = io.BytesIO(result.audio)
    with wave.open(buf, "rb") as wf:
        raw_pcm = wf.readframes(wf.getnframes())
        sr = wf.getframerate()

    audio_np = np.frombuffer(raw_pcm, dtype=np.int16).astype(np.float32) / 32768.0
    audio_processed = audio_pipeline.process(audio_np, sr)

    # Convert back to WAV
    pcm_bytes = (np.clip(audio_processed, -1.0, 1.0) * 32767).astype(np.int16).tobytes()
    output_buf = io.BytesIO()
    with wave.open(output_buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm_bytes)

    processed_audio = output_buf.getvalue()

    logger.info(
        f"TTS processed done: model={result.model_used} ttfb={result.ttfb_ms:.0f}ms "
        f"total={result.total_ms:.0f}ms duration={result.duration_seconds:.1f}s"
    )

    return StreamingResponse(
        iter([processed_audio]),
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'attachment; filename="tts_processed.wav"',
            "X-TTS-Model": result.model_used,
            "X-TTS-TTFB-Ms": str(int(result.ttfb_ms)),
            "X-TTS-Duration": str(round(result.duration_seconds, 2)),
        },
    )


@app.get("/pipeline/config")
async def get_pipeline_config():
    """Get current audio pipeline configuration."""
    if not audio_pipeline:
        raise HTTPException(503, "Audio pipeline not initialized")

    config = audio_pipeline.config
    return {
        "target_lufs": config.target_lufs,
        "comfort_noise_db": config.comfort_noise_db,
        "enable_eq": config.enable_eq,
        "enable_compression": config.enable_compression,
        "enable_comfort_noise": config.enable_comfort_noise,
        "enable_warmth": config.enable_warmth,
        "enable_de_essing": config.enable_de_essing,
        "sentence_pause_ms": config.sentence_pause_ms,
    }


@app.post("/voice/usage/record")
async def record_voice_usage(usage: VoiceUsageRecord):
    """Record voice synthesis usage for analytics."""
    usage_records.append(usage.model_dump())
    logger.info(f"Recorded usage: voice={usage.voice_id} chars={usage.input_chars} duration={usage.audio_duration_seconds:.1f}s")

    return {"status": "recorded", "total_records": len(usage_records)}


@app.get("/usage/recent")
async def get_recent_usage(limit: int = Query(20, ge=1, le=1000)):
    """Get recent voice usage records."""
    recent = usage_records[-limit:] if usage_records else []
    return {
        "records": recent,
        "total": len(usage_records),
        "returned": len(recent),
    }


# ============================================================================
# Speech-to-Text
# ============================================================================

@app.post("/stt")
async def speech_to_text(
    file: UploadFile = File(...),
    language: Optional[str] = Query(None),
):
    """Transcribe audio file to text."""
    audio_data = await file.read()
    max_size = 25 * 1024 * 1024
    if len(audio_data) > max_size:
        raise HTTPException(413, f"File too large ({len(audio_data)} bytes). Max: {max_size}")

    if not stt_engine:
        raise HTTPException(503, "STT engine not initialized")

    logger.info(f"STT: file={file.filename} size={len(audio_data)} lang={language}")
    result = await stt_engine.transcribe(audio_data, language=language)

    logger.info(
        f"STT done: text_len={len(result.text)} lang={result.language} "
        f"conf={result.confidence:.2f} time={result.processing_time_ms:.0f}ms"
    )

    return {
        "text": result.text,
        "language": result.language,
        "confidence": result.confidence,
        "duration": result.duration_seconds,
        "processing_time_ms": result.processing_time_ms,
        "segments": result.segments,
    }


@app.post("/vad")
async def voice_activity_detection(file: UploadFile = File(...)):
    """Detect voice activity in audio. Returns speech timestamps."""
    audio_data = await file.read()
    if not stt_engine:
        raise HTTPException(503, "STT engine not initialized")

    result = stt_engine.detect_voice_activity(audio_data)
    return {
        "has_speech": result.has_speech,
        "speech_probability": result.speech_probability,
        "speech_timestamps": result.speech_timestamps,
    }


# ============================================================================
# Voice Cloning
# ============================================================================

@app.post("/clone")
async def clone_voice(
    voice_name: str = Form(...),
    voice_description: str = Form(...),
    audio_file: UploadFile = File(...),
):
    """Clone a voice from an audio sample (10+ seconds recommended)."""
    audio_data = await audio_file.read()
    logger.info(f"Voice clone: name={voice_name} size={len(audio_data)}")

    # Validate audio length (need ~10s minimum for good cloning)
    duration_estimate = len(audio_data) / (16000 * 2)  # 16kHz 16-bit estimate
    if duration_estimate < 5:
        raise HTTPException(400, "Audio sample too short. Need at least 10 seconds for good quality.")

    # Create cloned voice entry
    cloned_id = f"cloned_{voice_name.lower().replace(' ', '_')}_{int(time.time())}"

    # Store the reference audio for the TTS engine to use
    clone_dir = os.getenv("VOICE_CLONE_DIR", "/app/cloned_voices")
    os.makedirs(clone_dir, exist_ok=True)
    clone_path = os.path.join(clone_dir, f"{cloned_id}.wav")

    with open(clone_path, "wb") as f:
        f.write(audio_data)

    # Register in voice manager
    voice_manager.add_cloned_voice(
        voice_id=cloned_id,
        name=voice_name,
        description=voice_description,
        reference_path=clone_path,
    )

    return {
        "voice_id": cloned_id,
        "name": voice_name,
        "description": voice_description,
        "status": "ready",
        "reference_duration_seconds": round(duration_estimate, 1),
    }


@app.get("/session/{conversation_id}/quality")
async def get_session_quality(conversation_id: str):
    """Get quality metrics for a conversation session."""
    engine = conversation_engines.get(conversation_id)
    if not engine:
        raise HTTPException(404, f"Session {conversation_id} not found")

    session = engine.get_session(conversation_id)
    if not session:
        raise HTTPException(404, f"Session {conversation_id} not found")

    # Compute quality metrics from session state
    ttfb_times = getattr(session, "ttfb_times", [])
    avg_ttfb = sum(ttfb_times) / len(ttfb_times) if ttfb_times else 0
    max_ttfb = max(ttfb_times) if ttfb_times else 0

    tts_calls = getattr(session, "tts_call_count", 0)
    stt_calls = getattr(session, "stt_call_count", 0)
    barge_ins = getattr(session, "barge_in_count", 0)
    errors = getattr(session, "error_count", 0)

    return {
        "conversation_id": conversation_id,
        "avg_ttfb_ms": round(avg_ttfb, 1),
        "max_ttfb_ms": round(max_ttfb, 1),
        "total_tts_calls": tts_calls,
        "total_stt_calls": stt_calls,
        "barge_in_count": barge_ins,
        "error_count": errors,
    }


# ============================================================================
# WebSocket: Real-time Twilio Media Stream Conversation
# ============================================================================

@app.websocket("/ws/conversation")
async def websocket_conversation(websocket: WebSocket):
    """
    Real-time bidirectional audio conversation via WebSocket.

    Protocol (Twilio Media Streams compatible):
    → Client: {"event": "start", "start": {"streamSid": "...", "callSid": "...", "customParameters": {...}}}
    → Client: {"event": "media", "media": {"payload": "<base64 mulaw>"}}
    → Client: {"event": "stop"}

    ← Server: {"event": "media", "media": {"payload": "<base64 mulaw>"}}
    ← Server: {"event": "mark", "mark": {"name": "utterance_end"}}

    Also supports our native protocol:
    → {"type": "start", "assistant_id": "...", "voice_id": "...", "system_prompt": "..."}
    → {"type": "audio", "audio_chunk": "<base64>"}
    → {"type": "interrupt"}
    → {"type": "end"}
    """
    await websocket.accept()
    logger.info("WebSocket connection established")

    engine: Optional[ConversationEngine] = None
    conversation_id: Optional[str] = None
    is_twilio = False
    stream_sid: Optional[str] = None

    # Audio accumulation buffer for STT
    audio_buffer = bytearray()
    BUFFER_DURATION_MS = 500  # Accumulate 500ms before transcribing
    last_transcribe_time = time.time()

    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)

            # ----- Twilio Media Streams protocol -----
            if "event" in message:
                event = message["event"]

                if event == "start":
                    is_twilio = True
                    start_data = message.get("start", {})
                    stream_sid = start_data.get("streamSid")
                    call_sid = start_data.get("callSid", "")
                    custom = start_data.get("customParameters", {})

                    assistant_id = custom.get("assistant_id", "default")
                    voice_id = custom.get("voice_id", "us-female-warm-receptionist")
                    system_prompt = custom.get(
                        "system_prompt",
                        "You are a helpful AI phone assistant for a service business. "
                        "Be warm, professional, and concise. Help the caller with "
                        "scheduling, questions, and information.",
                    )

                    engine = ConversationEngine(
                        voice_id=voice_id,
                        system_prompt=system_prompt,
                        llm_endpoint=os.getenv(
                            "LLM_ENDPOINT", "http://localhost:3000/api/agent/respond"
                        ),
                    )

                    session = engine.create_session({
                        "call_sid": call_sid,
                        "stream_sid": stream_sid,
                        "assistant_id": assistant_id,
                        "client_type": "twilio",
                    })
                    conversation_id = session.conversation_id

                    logger.info(
                        f"Twilio stream started: sid={stream_sid} "
                        f"call={call_sid} voice={voice_id}"
                    )

                    # Send greeting
                    greeting = engine.get_greeting()
                    if greeting and tts_manager:
                        config = TTSConfig(
                            voice_id=voice_id,
                            speed=1.0,
                            emotion="happy",
                            sample_rate=24000,
                        )
                        result = await tts_manager.synthesize(greeting, config)
                        await _send_twilio_audio(websocket, result.audio, stream_sid)

                        engine.record_assistant_speech(conversation_id, greeting)

                elif event == "media" and engine and conversation_id:
                    # Receive mu-law audio from Twilio (8kHz)
                    payload = message.get("media", {}).get("payload", "")
                    if payload:
                        mulaw_bytes = base64.b64decode(payload)
                        pcm_bytes = mulaw_to_pcm(mulaw_bytes)
                        audio_buffer.extend(pcm_bytes)

                        # Process accumulated audio every BUFFER_DURATION_MS
                        now = time.time()
                        buffer_ms = len(audio_buffer) / (8000 * 2) * 1000
                        if buffer_ms >= BUFFER_DURATION_MS:
                            await _process_audio_buffer(
                                websocket, engine, conversation_id,
                                bytes(audio_buffer), stream_sid, is_twilio,
                            )
                            audio_buffer.clear()
                            last_transcribe_time = now

                elif event == "stop":
                    logger.info(f"Twilio stream stopped: {stream_sid}")
                    if engine and conversation_id:
                        engine.end_session(conversation_id)
                    break

            # ----- Native protocol -----
            else:
                msg_type = message.get("type")

                if msg_type == "start":
                    assistant_id = message.get("assistant_id", "default")
                    voice_id = message.get("voice_id", "us-female-warm-receptionist")
                    system_prompt = message.get(
                        "system_prompt", "You are a helpful AI phone assistant."
                    )

                    engine = ConversationEngine(
                        voice_id=voice_id,
                        system_prompt=system_prompt,
                    )
                    session = engine.create_session({
                        "assistant_id": assistant_id,
                        "client_type": "native",
                    })
                    conversation_id = session.conversation_id

                    await websocket.send_json({
                        "type": "conversation_started",
                        "conversation_id": conversation_id,
                        "voice_id": voice_id,
                        "tts_engine": tts_manager.active_model if tts_manager else "none",
                    })

                elif msg_type == "audio" and engine and conversation_id:
                    chunk = message.get("audio_chunk", "")
                    if chunk:
                        pcm = base64.b64decode(chunk)
                        audio_buffer.extend(pcm)

                        buffer_ms = len(audio_buffer) / (16000 * 2) * 1000
                        if buffer_ms >= BUFFER_DURATION_MS:
                            await _process_audio_buffer(
                                websocket, engine, conversation_id,
                                bytes(audio_buffer), None, False,
                            )
                            audio_buffer.clear()

                elif msg_type == "interrupt" and engine and conversation_id:
                    engine.handle_barge_in(conversation_id)
                    logger.info(f"Barge-in: {conversation_id}")

                elif msg_type == "end":
                    if engine and conversation_id:
                        summary = engine.end_session(conversation_id)
                        await websocket.send_json({
                            "type": "conversation_ended",
                            "summary": summary,
                        })
                    break

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
        if engine and conversation_id:
            engine.end_session(conversation_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "error": str(e)})
        except Exception:
            pass


async def _process_audio_buffer(
    websocket: WebSocket,
    engine: ConversationEngine,
    conversation_id: str,
    audio_bytes: bytes,
    stream_sid: Optional[str],
    is_twilio: bool,
):
    """Process accumulated audio: transcribe → LLM → TTS → send back."""
    if not stt_engine or not tts_manager:
        return

    engine.set_state(conversation_id, TurnState.LISTENING)

    # Determine sample rate based on source
    sample_rate = 8000 if is_twilio else 16000

    # Transcribe
    result = await stt_engine.transcribe(audio_bytes, sample_rate=sample_rate)

    if not result.text.strip():
        return

    engine.record_user_speech(conversation_id, result.text, result.confidence)

    # Send user transcript
    if is_twilio:
        # Twilio doesn't have transcript events — log only
        logger.info(f"[{conversation_id}] USER: {result.text}")
    else:
        await websocket.send_json({
            "type": "transcript",
            "speaker": "user",
            "text": result.text,
            "confidence": result.confidence,
        })

    # Get LLM response
    engine.set_state(conversation_id, TurnState.PROCESSING)
    llm_response = await _get_llm_response(conversation_id, engine, result.text)

    if not llm_response:
        engine.set_state(conversation_id, TurnState.LISTENING)
        return

    # Handle tool calls
    if llm_response.get("tool_call"):
        tool = llm_response["tool_call"]
        engine.handle_tool_call(conversation_id, tool["name"], tool.get("args", {}))

        if is_twilio:
            logger.info(f"[{conversation_id}] TOOL: {tool['name']}")
        else:
            await websocket.send_json({
                "type": "tool_call",
                "tool_name": tool["name"],
                "tool_args": tool.get("args", {}),
            })

        # If tool has a spoken confirmation, synthesize it
        if tool.get("spoken_response"):
            response_text = tool["spoken_response"]
        else:
            return

    else:
        response_text = llm_response.get("text", "")

    if not response_text:
        engine.set_state(conversation_id, TurnState.LISTENING)
        return

    # Record and send assistant transcript
    engine.record_assistant_speech(conversation_id, response_text)

    if not is_twilio:
        await websocket.send_json({
            "type": "transcript",
            "speaker": "assistant",
            "text": response_text,
        })

    # Synthesize and send audio
    engine.set_state(conversation_id, TurnState.SPEAKING)

    # Detect appropriate emotion from response
    emotion = _detect_emotion(response_text)

    config = TTSConfig(
        voice_id=engine.voice_id,
        speed=1.0,
        emotion=emotion,
        sample_rate=24000,
    )

    # Check if response is multi-sentence for streaming optimization
    sentences = audio_pipeline.split_sentences(response_text) if audio_pipeline else [response_text]
    is_multi_sentence = len(sentences) > 1

    if is_twilio and stream_sid:
        # Stream to Twilio: need 8kHz mu-law
        if is_multi_sentence and len(sentences) <= 5:
            # Synthesize and send first sentence immediately
            first_result = await tts_manager.synthesize(sentences[0], config)
            await _send_twilio_audio(websocket, first_result.audio, stream_sid)

            # Start synthesizing remaining sentences in background while first plays
            for sentence in sentences[1:]:
                tts_result = await tts_manager.synthesize(sentence, config)
                await _send_twilio_audio(websocket, tts_result.audio, stream_sid)

            # Record usage for first sentence
            _record_usage(
                voice_id=engine.voice_id,
                tts_model=first_result.model_used,
                input_chars=len(sentences[0]),
                audio_duration=first_result.duration_seconds,
                ttfb_ms=first_result.ttfb_ms,
                total_latency_ms=first_result.total_ms,
            )
        else:
            # Single sentence or too many: synthesize full response at once
            tts_result = await tts_manager.synthesize(response_text, config)
            await _send_twilio_audio(websocket, tts_result.audio, stream_sid)

            # Record usage
            _record_usage(
                voice_id=engine.voice_id,
                tts_model=tts_result.model_used,
                input_chars=len(response_text),
                audio_duration=tts_result.duration_seconds,
                ttfb_ms=tts_result.ttfb_ms,
                total_latency_ms=tts_result.total_ms,
            )
    else:
        # Native: stream 24kHz PCM chunks
        if is_multi_sentence and len(sentences) <= 5:
            # Sentence-level streaming for multi-sentence responses
            for i, sentence in enumerate(sentences):
                sentence_start = time.time()
                async for chunk in tts_manager.synthesize_stream(sentence, config):
                    await websocket.send_json({
                        "type": "audio",
                        "audio_chunk": base64.b64encode(chunk).decode("ascii"),
                        "final": False,
                    })
                    await asyncio.sleep(0.01)

                # Record usage per sentence
                sentence_duration = time.time() - sentence_start
                _record_usage(
                    voice_id=engine.voice_id,
                    tts_model="unknown",
                    input_chars=len(sentence),
                    audio_duration=sentence_duration,
                    ttfb_ms=0,
                    total_latency_ms=(time.time() - sentence_start) * 1000,
                )

            await websocket.send_json({"type": "audio", "audio_chunk": "", "final": True})
        else:
            # Standard streaming for single sentence
            async for chunk in tts_manager.synthesize_stream(response_text, config):
                await websocket.send_json({
                    "type": "audio",
                    "audio_chunk": base64.b64encode(chunk).decode("ascii"),
                    "final": False,
                })
                await asyncio.sleep(0.01)

            await websocket.send_json({"type": "audio", "audio_chunk": "", "final": True})

    engine.set_state(conversation_id, TurnState.LISTENING)


async def _send_twilio_audio(
    websocket: WebSocket, wav_bytes: bytes, stream_sid: Optional[str]
):
    """Convert WAV to mu-law and send via Twilio Media Stream protocol."""
    try:
        import wave

        # Parse WAV
        buf = io.BytesIO(wav_bytes)
        with wave.open(buf, "rb") as wf:
            raw_pcm = wf.readframes(wf.getnframes())
            sr = wf.getframerate()

        # Convert to numpy for processing
        audio_np = np.frombuffer(raw_pcm, dtype=np.int16).astype(np.float32) / 32768.0

        # Apply audio pipeline if available
        if audio_pipeline:
            audio_np = audio_pipeline.process(audio_np, sr)

        # Resample to 8kHz for Twilio
        if sr != 8000:
            audio_np = resample_audio(audio_np, sr, 8000)

        # Convert back to 16-bit PCM then to mu-law
        pcm_8k = (np.clip(audio_np, -1.0, 1.0) * 32767).astype(np.int16).tobytes()
        mulaw = pcm_to_mulaw(pcm_8k)

        # Send in ~20ms chunks (160 bytes at 8kHz mu-law)
        chunk_size = 160
        for i in range(0, len(mulaw), chunk_size):
            chunk = mulaw[i:i + chunk_size]
            payload = base64.b64encode(chunk).decode("ascii")
            await websocket.send_json({
                "event": "media",
                "streamSid": stream_sid,
                "media": {"payload": payload},
            })
            await asyncio.sleep(0.02)  # 20ms pacing

        # Send mark to indicate utterance complete
        await websocket.send_json({
            "event": "mark",
            "streamSid": stream_sid,
            "mark": {"name": "utterance_end"},
        })

    except Exception as e:
        logger.error(f"Twilio audio send failed: {e}", exc_info=True)


def _detect_emotion(text: str) -> str:
    """Simple keyword-based emotion detection for TTS."""
    text_lower = text.lower()

    if any(w in text_lower for w in ["sorry", "apologize", "unfortunately", "concerned"]):
        return "empathetic"
    if any(w in text_lower for w in ["great", "wonderful", "excellent", "perfect", "awesome"]):
        return "happy"
    if any(w in text_lower for w in ["understand", "hear you", "of course", "absolutely"]):
        return "calm"
    if any(w in text_lower for w in ["exciting", "amazing", "incredible", "love"]):
        return "excited"
    if any(w in text_lower for w in ["urgent", "important", "immediately", "critical"]):
        return "neutral"  # Stay professional for urgency

    return "neutral"


async def _get_llm_response(
    conversation_id: str,
    engine: ConversationEngine,
    user_text: str,
) -> Optional[dict]:
    """Get response from the LLM endpoint."""
    try:
        import httpx

        session = engine.get_session(conversation_id)
        if not session:
            return None

        transcript = session.get_transcript_text()

        messages = [
            {"role": "system", "content": engine.system_prompt},
            {
                "role": "user",
                "content": (
                    f"Conversation so far:\n{transcript}\n\n"
                    f"Caller just said: {user_text}\n\n"
                    "Respond naturally and concisely (1-3 sentences). "
                    "You are on a phone call — keep responses short and conversational."
                ),
            },
        ]

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                engine.llm_endpoint,
                json={"messages": messages, "conversation_id": conversation_id},
            )
            resp.raise_for_status()
            data = resp.json()

            # Handle tool calls
            if data.get("tool_call") or data.get("tool_calls"):
                tool = data.get("tool_call") or (data["tool_calls"][0] if data.get("tool_calls") else None)
                if tool:
                    return {
                        "tool_call": {
                            "name": tool.get("name", tool.get("function", {}).get("name")),
                            "args": tool.get("args", tool.get("arguments", tool.get("function", {}).get("arguments", {}))),
                            "spoken_response": tool.get("spoken_response"),
                        }
                    }

            return {"text": data.get("text", data.get("content", ""))}

    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return {
            "text": "I apologize, I'm having a brief technical issue. Could you repeat that?"
        }


def _record_usage(
    voice_id: str,
    tts_model: str,
    input_chars: int,
    audio_duration: float,
    ttfb_ms: float,
    total_latency_ms: float,
):
    """Record voice synthesis usage for analytics."""
    record = {
        "voice_id": voice_id,
        "tts_model": tts_model,
        "input_chars": input_chars,
        "audio_duration_seconds": round(audio_duration, 2),
        "ttfb_ms": round(ttfb_ms, 1),
        "total_latency_ms": round(total_latency_ms, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    usage_records.append(record)
    logger.debug(f"Usage recorded: {record}")

    # Also track cost
    try:
        cost_tracker.record_synthesis(
            model=tts_model,
            duration_ms=int(audio_duration * 1000),
            gpu_time_ms=int(total_latency_ms),
            success=True,
        )
    except Exception:
        pass  # Cost tracking is non-critical


# ============================================================================
# A/B Testing Endpoints
# ============================================================================


@app.post("/ab-tests")
async def create_ab_test(
    test_id: str = Body(...),
    voice_a: str = Body(...),
    voice_b: str = Body(...),
    traffic_split: float = Body(0.5),
):
    """Create a new A/B test."""
    test = ab_test_manager.create_test(test_id, voice_a, voice_b, traffic_split)
    return JSONResponse({"ok": True, "test_id": test_id, "voice_a": voice_a, "voice_b": voice_b})


@app.get("/ab-tests")
async def list_ab_tests():
    """List all active A/B tests."""
    tests = []
    for tid, test in ab_test_manager.tests.items():
        tests.append({
            "test_id": tid,
            "voice_a": test.voice_a,
            "voice_b": test.voice_b,
            "traffic_split": test.traffic_split,
            "total_calls": test.metrics_a.total_calls + test.metrics_b.total_calls,
        })
    return JSONResponse({"tests": tests})


@app.get("/ab-tests/{test_id}/assign")
async def assign_ab_variant(test_id: str, call_sid: str = Query(...)):
    """Assign a variant for a specific call using deterministic hashing."""
    if test_id not in ab_test_manager.tests:
        raise HTTPException(status_code=404, detail="Test not found")
    test = ab_test_manager.tests[test_id]
    variant = test.assign_variant(call_sid)
    voice_id = test.voice_a if variant.value == "voice_a" else test.voice_b
    return JSONResponse({"variant": variant.value, "voice_id": voice_id})


@app.get("/ab-tests/{test_id}/results")
async def get_ab_test_results(test_id: str):
    """Get results and significance analysis for an A/B test."""
    if test_id not in ab_test_manager.tests:
        raise HTTPException(status_code=404, detail="Test not found")
    test = ab_test_manager.tests[test_id]
    try:
        stats = test.get_stats()
        significant, winner = test.is_significant()
        stats["is_significant"] = significant
        stats["winner"] = winner
        return JSONResponse(stats)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/ab-tests/{test_id}/record")
async def record_ab_test_result(
    test_id: str,
    call_sid: str = Body(...),
    variant: str = Body(...),
    satisfaction: float = Body(0.0),
    converted: bool = Body(False),
    duration_seconds: float = Body(0.0),
    ttfb_ms: float = Body(0.0),
    error: bool = Body(False),
):
    """Record the result of a call for an A/B test."""
    if test_id not in ab_test_manager.tests:
        raise HTTPException(status_code=404, detail="Test not found")
    test = ab_test_manager.tests[test_id]
    test.record_result(
        call_sid=call_sid,
        variant=variant,
        satisfaction=satisfaction,
        converted=converted,
        duration_seconds=duration_seconds,
        ttfb_ms=ttfb_ms,
        error=error,
    )
    return JSONResponse({"ok": True})


# ============================================================================
# Cost Tracking Endpoints
# ============================================================================


@app.get("/costs/summary")
async def get_cost_summary(period_days: int = Query(30)):
    """Get cost analysis summary."""
    try:
        summary = cost_tracker.get_cost_summary(period_days=period_days)
        return JSONResponse(summary.to_dict())
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/costs/comparison")
async def get_cost_comparison():
    """Compare self-hosted costs vs external providers."""
    try:
        savings = cost_tracker.get_savings_vs_external()
        return JSONResponse(savings)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/costs/roi")
async def get_cost_roi(monthly_calls: int = Query(1000), avg_duration_minutes: float = Query(3.0)):
    """Project ROI vs external providers."""
    try:
        roi = cost_tracker.project_roi_vs_external(
            monthly_calls=monthly_calls,
            avg_duration_minutes=avg_duration_minutes,
        )
        return JSONResponse(roi)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ============================================================================
# Startup / Shutdown
# ============================================================================

@app.on_event("startup")
async def startup_event():
    global tts_manager, stt_engine, audio_pipeline

    logger.info("=" * 60)
    logger.info("Recall Touch Voice Server v2.0 starting")
    logger.info("=" * 60)

    # Initialize audio pipeline
    audio_pipeline = AudioPipeline(PipelineConfig(
        target_lufs=-14.0,
        comfort_noise_db=-50.0,
        enable_eq=True,
        enable_compression=True,
        enable_comfort_noise=True,
    ))
    logger.info("Audio pipeline initialized")

    # Initialize TTS
    # Support both env names to avoid config drift across deploy targets.
    preferred_tts = os.getenv("TTS_ENGINE", os.getenv("TTS_MODEL", "orpheus")).lower()
    if "fish" in preferred_tts:
        preferred_tts = "fish-speech"
    elif "kokoro" in preferred_tts:
        preferred_tts = "kokoro"
    else:
        preferred_tts = "orpheus"

    tts_manager = TTSManager(preferred_model=preferred_tts)
    try:
        await tts_manager.initialize()
    except Exception as e:
        logger.error(f"TTS initialization failed: {e}")

    # Initialize STT (optional — skip on tiny VMs to avoid OOM during model load)
    load_stt = load_stt_env()
    stt_model = os.getenv("STT_MODEL", "base")
    if "whisper-" in stt_model:
        stt_model = stt_model.replace("whisper-", "")

    if load_stt:
        stt_engine = STTEngine(model_size=stt_model)
        try:
            await stt_engine.load()
        except Exception as e:
            logger.error(f"STT initialization failed: {e}")
    else:
        logger.warning("LOAD_STT_ENGINE=false — STT disabled (no whisper load)")
        stt_engine = None

    # Initialize A/B test manager and cost tracker
    logger.info(f"A/B test manager initialized: {len(ab_test_manager.tests)} active tests")
    logger.info(f"Cost tracker initialized")

    logger.info(f"TTS engine: {tts_manager.active_model}")
    if stt_engine:
        logger.info(f"STT engine: whisper-{stt_engine.model_size}")
    else:
        logger.info("STT engine: disabled")
    logger.info(f"Voices loaded: {len(voice_manager.list_voices())}")
    logger.info("Voice server ready")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Voice server shutting down")
    for eng in conversation_engines.values():
        eng.cleanup_old_sessions()


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8100")),
        log_level="info",
    )
