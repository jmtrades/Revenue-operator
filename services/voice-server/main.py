"""
Self-hosted voice synthesis server to replace ElevenLabs.
Provides TTS, STT, voice cloning, and real-time conversation capabilities.
"""

import asyncio
import base64
import io
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional
import wave
import numpy as np

from fastapi import FastAPI, WebSocket, UploadFile, File, Form, HTTPException, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import uvicorn

from conversation_engine import ConversationEngine, TurnState
from voice_library import VoiceManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Voice Synthesis Server",
    description="Self-hosted voice synthesis and conversation system",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize voice manager
voice_manager = VoiceManager()

# Conversation engines per workspace/assistant
conversation_engines: dict[str, ConversationEngine] = {}


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "voice-synthesis-server",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/status")
async def status():
    """Get server status including active conversations."""
    return {
        "status": "running",
        "voices_available": len(voice_manager.list_voices()),
        "active_conversations": len(conversation_engines),
        "uptime": "monitored",
    }


# ============================================================================
# Voice Management Endpoints
# ============================================================================

@app.get("/voices")
async def list_voices(
    gender: Optional[str] = None,
    accent: Optional[str] = None,
    tone: Optional[str] = None,
):
    """List all available voices with metadata."""
    voices = voice_manager.search_voices(
        gender=gender,
        accent=accent,
        tone=tone,
    )
    return {
        "voices": [voice.to_dict() for voice in voices],
        "total": len(voices),
    }


@app.get("/voices/{voice_id}")
async def get_voice(voice_id: str):
    """Get metadata for a specific voice."""
    voice = voice_manager.get_voice(voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail=f"Voice {voice_id} not found")
    return voice.to_dict()


# ============================================================================
# Text-to-Speech Endpoints
# ============================================================================

@app.post("/tts")
async def text_to_speech(
    voice_id: str,
    text: str,
    speed: float = 1.0,
    stability: float = 0.5,
    style: float = 0.4,
):
    """
    Convert text to speech.
    Returns audio/wav stream.
    """
    voice = voice_manager.get_voice(voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail=f"Voice {voice_id} not found")

    logger.info(f"TTS request: voice={voice_id}, text_len={len(text)}, speed={speed}")

    try:
        # Generate audio (placeholder - would use fishspeech/TTS model in production)
        audio_bytes = await generate_audio(voice_id, text, speed, stability, style)

        return StreamingResponse(
            iter([audio_bytes]),
            media_type="audio/wav",
            headers={
                "Content-Disposition": f'attachment; filename="tts_output.wav"'
            }
        )
    except Exception as e:
        logger.error(f"TTS generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tts/stream")
async def text_to_speech_streaming(
    voice_id: str,
    text: str,
    chunk_size_ms: int = 50,
    speed: float = 1.0,
    stability: float = 0.5,
):
    """
    Streaming TTS endpoint for low-latency playback.
    Yields audio chunks as they become available.
    """
    voice = voice_manager.get_voice(voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail=f"Voice {voice_id} not found")

    logger.info(f"Streaming TTS: voice={voice_id}, chunk_size={chunk_size_ms}ms")

    async def audio_stream():
        try:
            # Generate full audio first (in production, would stream from model)
            audio_bytes = await generate_audio(voice_id, text, speed, stability, 0.4)

            # Yield in chunks
            chunk_size = (chunk_size_ms * 16000) // 1000 * 2  # 16-bit audio
            for i in range(0, len(audio_bytes), chunk_size):
                chunk = audio_bytes[i:i + chunk_size]
                yield chunk
                await asyncio.sleep(chunk_size_ms / 1000)

        except Exception as e:
            logger.error(f"Streaming TTS failed: {e}", exc_info=True)

    return StreamingResponse(audio_stream(), media_type="audio/wav")


# ============================================================================
# Speech-to-Text Endpoint
# ============================================================================

@app.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Convert speech to text.
    Accepts audio file, returns transcription with metadata.
    """
    try:
        audio_data = await file.read()
        max_file_size = 25 * 1024 * 1024  # 25MB limit
        if len(audio_data) > max_file_size:
            raise HTTPException(status_code=413, detail=f"File too large ({len(audio_data)} bytes). Max: {max_file_size} bytes")
        logger.info(f"STT request: filename={file.filename}, size={len(audio_data)} bytes")

        # Transcribe audio (would use faster-whisper in production)
        text, language, confidence = await transcribe_audio(audio_data)

        return {
            "text": text,
            "language": language,
            "confidence": confidence,
            "duration": "estimated",
        }
    except Exception as e:
        logger.error(f"STT transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Voice Cloning Endpoint
# ============================================================================

@app.post("/clone")
async def clone_voice(
    voice_name: str = Form(...),
    voice_description: str = Form(...),
    audio_file: UploadFile = File(...),
):
    """
    Clone a voice from an audio sample.
    Returns a voice_id for the cloned voice.
    """
    try:
        audio_data = await audio_file.read()
        logger.info(f"Voice cloning: name={voice_name}, size={len(audio_data)} bytes")

        # In production, this would use speaker embedding + voice synthesis model
        cloned_voice_id = f"cloned_{voice_name.lower().replace(' ', '_')}"

        return {
            "voice_id": cloned_voice_id,
            "name": voice_name,
            "description": voice_description,
            "status": "ready",
        }
    except Exception as e:
        logger.error(f"Voice cloning failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WebSocket: Real-time Bidirectional Conversation
# ============================================================================

@app.websocket("/ws/conversation")
async def websocket_conversation(websocket: WebSocket):
    """
    WebSocket endpoint for real-time audio streaming conversation.
    Handles audio from Twilio media streams.

    Protocol:
    - Client sends: {"type": "start", "assistant_id": "...", "voice_id": "..."}
    - Client sends: {"type": "audio", "audio_chunk": "<base64>"}
    - Server sends: {"type": "conversation_started", "conversation_id": "..."}
    - Server sends: {"type": "transcript", "speaker": "user|assistant", "text": "..."}
    - Server sends: {"type": "audio", "audio_chunk": "<base64>"}
    - Server sends: {"type": "tool_call", "tool_name": "...", "tool_args": {...}}
    - Server sends: {"type": "conversation_ended", "summary": {...}}
    - Server sends: {"type": "error", "error": "..."}
    """
    await websocket.accept()
    logger.info("WebSocket connection established")

    engine: Optional[ConversationEngine] = None
    conversation_id: Optional[str] = None

    try:
        while True:
            # Receive message from client
            message = await websocket.receive_json()
            message_type = message.get("type")

            if message_type == "start":
                # Start a new conversation
                assistant_id = message.get("assistant_id", "default")
                voice_id = message.get("voice_id", "us-female-warm-receptionist")
                system_prompt = message.get("system_prompt", "You are a helpful assistant.")

                # Get or create conversation engine
                if assistant_id not in conversation_engines:
                    engine = ConversationEngine(
                        voice_id=voice_id,
                        system_prompt=system_prompt,
                    )
                    conversation_engines[assistant_id] = engine
                else:
                    engine = conversation_engines[assistant_id]

                # Create session
                session = engine.create_session({
                    "assistant_id": assistant_id,
                    "client_type": "twilio",
                })
                conversation_id = session.conversation_id

                await websocket.send_json({
                    "type": "conversation_started",
                    "conversation_id": conversation_id,
                    "voice_id": voice_id,
                })
                logger.info(f"Conversation started: {conversation_id}")

            elif message_type == "audio":
                # Receive audio chunk from client (Twilio media stream)
                if not conversation_id or not engine:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Conversation not started"
                    })
                    continue

                audio_chunk = message.get("audio_chunk")
                if audio_chunk:
                    engine.set_state(conversation_id, TurnState.LISTENING)

                    # Decode base64 audio chunk to bytes for transcription
                    if isinstance(audio_chunk, str):
                        audio_bytes_in = base64.b64decode(audio_chunk)
                    else:
                        audio_bytes_in = audio_chunk

                    # Transcribe audio
                    text, language, confidence = await transcribe_audio(audio_bytes_in)

                    if text.strip():
                        engine.record_user_speech(conversation_id, text, confidence)

                        # Send transcript to client
                        await websocket.send_json({
                            "type": "transcript",
                            "speaker": "user",
                            "text": text,
                            "confidence": confidence,
                        })

                        # Check for silence and get LLM response
                        engine.set_state(conversation_id, TurnState.PROCESSING)
                        llm_response = await get_llm_response(
                            conversation_id,
                            engine,
                            text,
                        )

                        if llm_response:
                            # Check for tool calls
                            if llm_response.get("tool_call"):
                                tool_info = llm_response["tool_call"]
                                engine.handle_tool_call(
                                    conversation_id,
                                    tool_info.get("name"),
                                    tool_info.get("args", {}),
                                )
                                await websocket.send_json({
                                    "type": "tool_call",
                                    "tool_name": tool_info.get("name"),
                                    "tool_args": tool_info.get("args", {}),
                                })
                            else:
                                # Regular response: convert to speech
                                response_text = llm_response.get("text", "")
                                if response_text:
                                    engine.record_assistant_speech(conversation_id, response_text)

                                    # Send transcript
                                    await websocket.send_json({
                                        "type": "transcript",
                                        "speaker": "assistant",
                                        "text": response_text,
                                    })

                                    # Generate and stream audio
                                    engine.set_state(conversation_id, TurnState.SPEAKING)
                                    audio_bytes = await generate_audio(
                                        engine.voice_id,
                                        response_text,
                                        speed=1.0,
                                    )

                                    # Send audio in chunks (base64-encoded for JSON transport)
                                    chunk_size = 4000
                                    for i in range(0, len(audio_bytes), chunk_size):
                                        chunk = audio_bytes[i:i + chunk_size]
                                        await websocket.send_json({
                                            "type": "audio",
                                            "audio_chunk": base64.b64encode(chunk).decode("ascii"),
                                            "final": i + chunk_size >= len(audio_bytes),
                                        })
                                        await asyncio.sleep(0.01)

                                    engine.set_state(conversation_id, TurnState.LISTENING)

            elif message_type == "interrupt":
                # Handle user interruption (barge-in)
                if conversation_id and engine:
                    engine.handle_barge_in(conversation_id)
                    logger.info(f"Barge-in handled for {conversation_id}")

            elif message_type == "end":
                # End conversation
                if conversation_id and engine:
                    summary = engine.end_session(conversation_id)
                    await websocket.send_json({
                        "type": "conversation_ended",
                        "summary": summary,
                    })
                    logger.info(f"Conversation ended: {conversation_id}")
                    break

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
        if conversation_id and engine:
            engine.end_session(conversation_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e)
            })
        except Exception:
            logger.debug("Failed to send error message to WebSocket client")


# ============================================================================
# Helper Functions
# ============================================================================

async def generate_audio(
    voice_id: str,
    text: str,
    speed: float = 1.0,
    stability: float = 0.5,
    style: float = 0.4,
) -> bytes:
    """
    Generate audio from text.
    In production, would use fishspeech or similar TTS model.
    For now, returns a placeholder WAV.
    """
    # Create a simple WAV file
    sample_rate = 16000
    duration = max(0.5, len(text) / 150)  # Estimate duration
    samples = int(sample_rate * duration)

    # Generate simple tone for demo
    t = np.linspace(0, duration, samples)
    frequency = 440  # A note
    audio = np.sin(2 * np.pi * frequency * t) * 0.3
    audio = (audio * 32767).astype(np.int16)

    # Create WAV
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())

    return wav_buffer.getvalue()


async def transcribe_audio(audio_data: bytes) -> tuple[str, str, float]:
    """
    Transcribe audio to text.
    In production, would use faster-whisper.
    For now, returns placeholder.
    """
    # Placeholder transcription
    return "Hello, this is a transcribed message.", "en", 0.95


async def get_llm_response(
    conversation_id: str,
    engine: ConversationEngine,
    user_text: str,
) -> Optional[dict]:
    """
    Get response from LLM.
    In production, would call the LLM endpoint configured in the engine.
    """
    try:
        import httpx

        # Build prompt with conversation context
        session = engine.get_session(conversation_id)
        if not session:
            return None

        transcript = session.get_transcript_text()
        messages = [
            {"role": "system", "content": engine.system_prompt},
            {"role": "user", "content": f"Conversation history:\n{transcript}\n\nRespond naturally and concisely."},
        ]

        # Call LLM endpoint (default: local agent endpoint)
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                engine.llm_endpoint,
                json={"messages": messages},
            )
            response.raise_for_status()
            data = response.json()

            # Extract response text
            response_text = data.get("text", data.get("content", ""))
            return {"text": response_text}

    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return {"text": "I apologize, I encountered an error. Please try again."}


# ============================================================================
# Startup/Shutdown
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup."""
    logger.info("Voice synthesis server starting up")
    logger.info(f"Loaded {len(voice_manager.list_voices())} voices")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Voice synthesis server shutting down")
    for engine in conversation_engines.values():
        engine.cleanup_old_sessions()


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8100"))
    host = os.getenv("HOST", "0.0.0.0")

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
    )
