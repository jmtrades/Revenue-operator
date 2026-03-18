"""
Recall Touch — Self-hosted Pipecat orchestration (Phase 2)

This server is responsible for:
- Accepting Twilio Media Streams WebSocket audio.
- Running: Deepgram STT → Claude (Anthropic) LLM → Deepgram TTS.
- Streaming the bot audio back to Twilio in real time.

Phase 2 keeps Deepgram + Claude as providers while replacing Vapi with Pipecat.
"""

import os
import asyncio
import json
import time
import hmac
import hashlib
from typing import Any, Dict, List

import httpx

from fastapi import FastAPI, WebSocket
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.services.llm_service import FunctionCallParams
from pipecat.runner.utils import parse_telephony_websocket
from pipecat.serializers.twilio import TwilioFrameSerializer
from pipecat.services.anthropic import AnthropicLLMService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.kokoro.tts import KokoroTTSService
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from llm.confidence_router import ConfidenceRouter
from llm.llama_service import create_llama_llm_service


app = FastAPI(title="Recall Touch — Pipecat Voice Orchestration", version="phase2")


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "recall-touch-pipecat-server",
        "version": os.getenv("PIPECAT_SERVER_VERSION", "phase2"),
    }


def _required_env(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val


@app.websocket("/ws/conversation")
async def ws_conversation(websocket: WebSocket):
    await websocket.accept()

    # Parse Twilio handshake to get stream/call ids and custom parameters.
    transport_type, call_data = await parse_telephony_websocket(websocket)
    if transport_type != "twilio":
        logger.warning(f"Unsupported transport: {transport_type}. Closing websocket.")
        await websocket.close()
        return

    stream_id = call_data.get("stream_id")
    call_id = call_data.get("call_id")
    custom_params = call_data.get("body") or {}
    workspace_id = custom_params.get("workspace_id") or None
    voice_id = custom_params.get("voice_id") or None

    # Ensure these variables exist even if we fail early.
    context = None
    tts = None
    tool_calls: List[Dict[str, Any]] = []

    async def post_voice_event(event_name: str, payload: Dict[str, Any]) -> None:
        """
        Best-effort voice event persistence.

        We keep this non-blocking (called via asyncio.create_task where possible)
        so the voice pipeline can still meet answer latency requirements.
        """
        app_base = os.getenv("NEXT_PUBLIC_APP_URL") or ""
        if not app_base or not workspace_id or not call_id:
            return

        url = f"{app_base}/api/voice/events"
        secret = os.getenv("VOICE_WEBHOOK_SECRET") or ""

        body = {
            "event": event_name,
            "workspace_id": workspace_id,
            "call_sid": call_id,
            "voice_id": voice_id or "unknown",
            "entity_type": "call",
            "entity_id": call_id,
            "payload": payload,
        }

        raw = json.dumps(body)
        headers = {"Content-Type": "application/json"}
        if secret:
            sig = hmac.new(secret.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
            headers["x-voice-webhook-signature"] = sig

        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                await client.post(url, content=raw, headers=headers)
        except Exception as e:
            logger.debug(f"[pipecat] voice event post failed: {e}")

    if not stream_id:
        logger.warning("Missing Twilio stream_id; closing websocket.")
        await websocket.close()
        return

    logger.info(f"[pipecat] Twilio connected stream_id={stream_id} call_id={call_id}")
    if not call_id:
        logger.warning("Missing Twilio call_id; closing websocket.")
        await websocket.close()
        return

    # Best-effort: log that the call was answered to the contact timeline.
    try:
        asyncio.create_task(post_voice_event("answered", {"stream_id": stream_id}))
    except Exception:
        pass

    serializer = TwilioFrameSerializer(
        stream_sid=stream_id,
        call_sid=call_id,
        account_sid=os.getenv("TWILIO_ACCOUNT_SID", ""),
        auth_token=os.getenv("TWILIO_AUTH_TOKEN", ""),
        params=TwilioFrameSerializer.InputParams(auto_hang_up=False),
    )

    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            vad_analyzer=SileroVADAnalyzer(),
            serializer=serializer,
        ),
    )

    deepgram_api_key = _required_env("DEEPGRAM_API_KEY")
    anthropic_api_key = _required_env("ANTHROPIC_API_KEY")

    # Phase 2: use existing Deepgram + Claude wiring.
    stt = DeepgramSTTService(
        api_key=deepgram_api_key,
        settings=DeepgramSTTService.Settings(
            model="nova-2",
            interim_results=True,
            punctuate=True,
        ),
    )

    # Kokoro voices are local and lightweight; use the requested `voice_id` as a best-effort voice selector.
    # Fallback keeps the pipeline functional when `voice_id` is missing.
    tts = KokoroTTSService(
        settings=KokoroTTSService.Settings(
            voice=str(voice_id or "af_heart"),
        ),
    )

    claude_llm = AnthropicLLMService(
        api_key=anthropic_api_key,
        model="claude-haiku-4-5-20251001",
        # Keep deterministic behavior for business phone conversations.
        settings=AnthropicLLMService.Settings(temperature=0.35),
    )

    # Priority 17: Llama 3.3 8B (local via OpenAI-compatible endpoint)
    # Route 90% to Llama and 10% to Claude baseline, with threshold hook
    # prepared in `ConfidenceRouter`.
    router = ConfidenceRouter()
    llama_confidence = router.estimate_llama_confidence()

    llama_llm = None
    try:
        llama_llm = create_llama_llm_service(temperature=0.35)
    except Exception as e:
        # Best-effort: if the local Llama endpoint isn't configured yet,
        # keep the pipeline functional via Claude.
        logger.warning(f"[pipecat] Llama unavailable, falling back to Claude: {e}")

    use_claude = llama_llm is None or router.should_use_claude(
        routing_key=str(call_id or ""),
        llama_confidence=llama_confidence,
    )

    llm = claude_llm if use_claude else llama_llm

    # The Next.js side passes `system_prompt` via TwiML <Parameter>.
    system_prompt = custom_params.get("system_prompt")
    if not system_prompt:
        raise RuntimeError("Missing `system_prompt` custom parameter in TwiML <Parameter>.")

    context = OpenAILLMContext(
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            }
        ],
    )

    # -----------------------------------------------------------------------
    # Function calling (tool calls)
    # -----------------------------------------------------------------------
    async def capture_lead_handler(params: FunctionCallParams):
        args = params.arguments or {}
        name = args.get("name") or "Caller"
        phone = args.get("phone")
        email = args.get("email")
        company = args.get("company")

        tool_calls.append(
            {
                "name": "capture_lead",
                "args": {"name": name, "phone": phone, "email": email, "company": company},
                "result": "success",
            }
        )

        try:
            asyncio.create_task(
                post_voice_event(
                    "intent_detected",
                    {
                        "intent": "capture_lead",
                        "name": name,
                        "phone": phone,
                        "email": email,
                        "company": company,
                    },
                )
            )
        except Exception:
            pass

        await params.result_callback({"ok": True})

    async def book_appointment_handler(params: FunctionCallParams):
        args = params.arguments or {}
        date = args.get("date")
        time_str = args.get("time")
        service = args.get("service") or "Appointment"
        notes = args.get("notes")

        tool_calls.append(
            {
                "name": "book_appointment",
                "args": {"date": date, "time": time_str, "service": service, "notes": notes},
                "result": "success",
            }
        )

        try:
            asyncio.create_task(
                post_voice_event(
                    "booking_made",
                    {
                        "intent": "book_appointment",
                        "date": date,
                        "time": time_str,
                        "service": service,
                        "notes": notes,
                    },
                )
            )
        except Exception:
            pass

        await params.result_callback({"ok": True})

    capture_lead_schema = FunctionSchema(
        name="capture_lead",
        description="Capture caller identity details for lead creation.",
        properties={
            "name": {"type": "string", "description": "Caller full name"},
            "phone": {"type": "string", "description": "Caller phone number (E.164 or digits)"},
            "email": {"type": "string", "description": "Caller email address"},
            "company": {"type": "string", "description": "Business/company name (if any)"},
        },
        required=["name"],
    )

    book_appt_schema = FunctionSchema(
        name="book_appointment",
        description="Book an appointment with a date and time.",
        properties={
            "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
            "time": {"type": "string", "description": "Time in HH:mm format"},
            "service": {"type": "string", "description": "Service name"},
            "notes": {"type": "string", "description": "Optional notes"},
        },
        required=["date", "time"],
    )

    tools = ToolsSchema(standard_tools=[capture_lead_schema, book_appt_schema])

    # Create context with tools so the LLM service can emit function calls.
    context = OpenAILLMContext(
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            }
        ],
        tools=tools,
    )
    context_aggregator = llm.create_context_aggregator(context)

    # Register handlers so tool calls are executed in-process.
    llm.register_function("capture_lead", capture_lead_handler, cancel_on_interruption=False)
    llm.register_function("book_appointment", book_appointment_handler, cancel_on_interruption=False)

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            audio_in_sample_rate=8000,
            audio_out_sample_rate=8000,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(_transport, _client):
        # Start the assistant immediately using the system prompt context.
        await task.queue_frame(LLMRunFrame())

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(_transport, _client):
        await task.cancel()

    call_started_at = time.time()
    user_transcript_text = ""

    runner = PipelineRunner(handle_sigint=False)
    try:
        await runner.run(task)
    except Exception as e:
        logger.exception(f"[pipecat] Pipeline error: {e}")
    finally:
        # Best-effort: build a user transcript from context messages.
        try:
            msgs = getattr(context, "messages", []) or []
            user_chunks: List[str] = []
            for m in msgs:
                if (m.get("role") or "").lower() != "user":
                    continue
                content = m.get("content")
                if isinstance(content, str):
                    if content.strip():
                        user_chunks.append(content.strip())
                    continue
                # OpenAI-style message content can be a list of parts
                if isinstance(content, list):
                    for part in content:
                        if not isinstance(part, dict):
                            continue
                        if part.get("type") == "text" and isinstance(part.get("text"), str) and part["text"].strip():
                            user_chunks.append(part["text"].strip())
            user_transcript_text = " ".join(user_chunks).strip()
        except Exception:
            user_transcript_text = ""

        duration_seconds = max(0.0, time.time() - call_started_at)

        outcome = "completed"
        lower = (user_transcript_text or "").lower()
        if not user_transcript_text.strip():
            outcome = "no_answer"
        elif "voicemail" in lower or "leave a message" in lower:
            outcome = "voicemail"

        app_base = os.getenv("NEXT_PUBLIC_APP_URL") or ""
        voice_webhook_secret = os.getenv("VOICE_WEBHOOK_SECRET") or ""
        if not app_base or not workspace_id:
            # Can't persist; still return gracefully.
            return

        voice_webhook_url = f"{app_base}/api/voice/webhook"
        inbound_post_call_url = f"{app_base}/api/inbound/post-call"

        transcript_payload = (
            [{"timestamp": int(time.time()), "speaker": "user", "text": user_transcript_text or "", "confidence": None}]
            if user_transcript_text
            else []
        )

        tts_model = "deepgram-aura"
        if tts and getattr(tts, "settings", None):
            try:
                tts_model = tts.settings.voice  # type: ignore[attr-defined]
            except Exception:
                pass

        payload = {
            "event": "conversation_ended",
            "conversation_id": "pipecat",
            "call_sid": call_id,
            "workspace_id": workspace_id,
            "voice_id": voice_id or "unknown",
            "tts_model": tts_model,
            "duration_seconds": duration_seconds,
            "outcome": outcome,
            "transcript": transcript_payload,
            "tool_calls": [
                {"name": tc["name"], "args": tc["args"], "result": tc["result"]} for tc in tool_calls
            ],
            "quality_metrics": {
                "avg_ttfb_ms": 0,
                "max_ttfb_ms": 0,
                "barge_in_count": 0,
                "error_count": 0,
                "user_sentiment": "neutral",
            },
            "usage": {
                "total_tts_chars": 0,
                "total_tts_duration_ms": 0,
                "total_stt_duration_ms": 0,
                "tts_calls": 0,
                "stt_calls": 0,
            },
        }

        try:
            raw = json.dumps(payload)
            headers = {"Content-Type": "application/json"}
            if voice_webhook_secret:
                sig = hmac.new(voice_webhook_secret.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
                headers["x-voice-webhook-signature"] = sig

            async with httpx.AsyncClient(timeout=20.0) as client:
                await client.post(voice_webhook_url, content=raw, headers=headers)

                # Ensure call_sessions transcript_text + summary + outcome email flow.
                await client.post(
                    inbound_post_call_url,
                    json={
                        "workspace_id": workspace_id,
                        "call_sid": call_id,
                        "transcript": user_transcript_text or None,
                        "summary": None,
                        "send_confirmation_sms": True,
                    },
                )
        except Exception as post_err:
            logger.error(f"[pipecat] Failed to persist call summary: {post_err}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8101")),
    )

