"""
Production Conversation Engine v2.0

Manages real-time bidirectional audio conversations with:
  - Finite state machine for turn-taking (IDLE → LISTENING → PROCESSING → SPEAKING)
  - Voice Activity Detection–driven silence detection
  - Barge-in / interruption handling with audio cancellation
  - Natural backchanneling ("mm-hmm", "I see")
  - Tool calling (book_appointment, capture_lead, send_sms, transfer_call)
  - Conversation memory / transcript persistence
  - Greeting generation per industry
  - Configurable silence thresholds and backchannel timing
"""

# UNTESTED — requires GPU deployment and real call verification

import asyncio
import logging
import random
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class TurnState(Enum):
    IDLE = "idle"
    LISTENING = "listening"
    PROCESSING = "processing"
    SPEAKING = "speaking"


class CallOutcome(str, Enum):
    COMPLETED = "completed"
    VOICEMAIL = "voicemail"
    NO_ANSWER = "no_answer"
    BUSY = "busy"
    FAILED = "failed"
    TRANSFERRED = "transferred"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class TranscriptEntry:
    timestamp: float
    speaker: str  # "user" or "assistant"
    text: str
    confidence: Optional[float] = None
    emotion: Optional[str] = None
    duration: float = 0.0


@dataclass
class ConversationSession:
    conversation_id: str
    start_time: float
    voice_id: str
    system_prompt: str
    transcript: List[TranscriptEntry] = field(default_factory=list)
    state: TurnState = TurnState.IDLE
    last_audio_time: float = field(default_factory=time.time)

    # Configurable thresholds
    silence_timeout: float = 1.2  # seconds — faster than typical 1.5
    end_of_turn_timeout: float = 0.8  # shorter silence = end of turn
    max_duration: float = 600.0  # 10 min max

    current_turn_start: Optional[float] = None
    tool_call_pending: Optional[Dict[str, Any]] = None
    outcome: CallOutcome = CallOutcome.COMPLETED

    # Metadata from Twilio / caller
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Interruption tracking
    barge_in_count: int = 0
    last_barge_in_time: float = 0.0

    # User sentiment tracking (simple)
    user_sentiment: str = "neutral"  # positive, neutral, negative, frustrated

    @property
    def duration(self) -> float:
        return time.time() - self.start_time

    @property
    def is_expired(self) -> bool:
        return self.duration > self.max_duration

    def has_silence(self) -> bool:
        return (time.time() - self.last_audio_time) > self.silence_timeout

    def has_end_of_turn(self) -> bool:
        return (time.time() - self.last_audio_time) > self.end_of_turn_timeout

    def add_transcript(
        self, speaker: str, text: str,
        confidence: Optional[float] = None,
        emotion: Optional[str] = None,
    ):
        self.transcript.append(TranscriptEntry(
            timestamp=time.time(),
            speaker=speaker,
            text=text,
            confidence=confidence,
            emotion=emotion,
        ))
        logger.info(f"[{self.conversation_id[:8]}] {speaker.upper()}: {text}")

    def get_transcript_text(self) -> str:
        return "\n".join(
            f"{e.speaker.upper()}: {e.text}" for e in self.transcript
        )

    def get_last_n_turns(self, n: int = 6) -> str:
        """Get last N transcript entries for context window."""
        recent = self.transcript[-n:] if len(self.transcript) > n else self.transcript
        return "\n".join(f"{e.speaker.upper()}: {e.text}" for e in recent)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "conversation_id": self.conversation_id,
            "duration": round(self.duration, 1),
            "state": self.state.value,
            "outcome": self.outcome.value,
            "turn_count": len(self.transcript),
            "barge_in_count": self.barge_in_count,
            "user_sentiment": self.user_sentiment,
            "transcript": [
                {
                    "timestamp": e.timestamp,
                    "speaker": e.speaker,
                    "text": e.text,
                    "confidence": e.confidence,
                    "emotion": e.emotion,
                }
                for e in self.transcript
            ],
            "metadata": self.metadata,
        }


# ---------------------------------------------------------------------------
# Industry greetings
# ---------------------------------------------------------------------------

INDUSTRY_GREETINGS = {
    "hvac": [
        "Hi there! Thanks for calling. How can I help you with your heating or cooling today?",
        "Hello! Welcome. Are you calling about a repair, maintenance, or a new installation?",
    ],
    "dental": [
        "Good {time_of_day}! Thanks for calling. Are you looking to schedule an appointment?",
        "Hello! How can I help you today? Would you like to book a visit?",
    ],
    "plumbing": [
        "Hi! Thanks for calling. Do you have a plumbing emergency, or would you like to schedule service?",
        "Hello! How can I help you today? Tell me about your plumbing needs.",
    ],
    "roofing": [
        "Thanks for calling! Are you looking for a roof inspection or repair estimate?",
        "Hello! How can I help? Are you dealing with a leak or looking for a quote?",
    ],
    "medical": [
        "Good {time_of_day}. How may I assist you today? Are you looking to schedule an appointment?",
        "Hello, thank you for calling. How can I help you today?",
    ],
    "legal": [
        "Good {time_of_day}. Thank you for calling. How may I direct your call?",
        "Hello, thank you for reaching out. Are you calling about an existing matter or a new inquiry?",
    ],
    "salon": [
        "Hi! Thanks for calling. Would you like to book an appointment?",
        "Hello! How can I help? Looking to schedule a visit?",
    ],
    "restaurant": [
        "Thanks for calling! Would you like to make a reservation?",
        "Hello! How can I help you today? Reservation or takeout?",
    ],
    "automotive": [
        "Hi, thanks for calling! Are you looking to schedule service or get a quote?",
        "Hello! How can I help? Do you need to bring your vehicle in?",
    ],
    "real_estate": [
        "Hi there! Thanks for reaching out. Are you looking to buy, sell, or rent?",
        "Hello! How can I help you today with your real estate needs?",
    ],
    "default": [
        "Hi there! Thanks for calling. How can I help you today?",
        "Hello! I appreciate you reaching out. What can I do for you?",
        "Good {time_of_day}! How may I assist you today?",
    ],
}


def _time_of_day() -> str:
    """Get current time of day for greeting."""
    import datetime
    hour = datetime.datetime.now().hour
    if hour < 12:
        return "morning"
    elif hour < 17:
        return "afternoon"
    return "evening"


# ---------------------------------------------------------------------------
# Conversation Engine
# ---------------------------------------------------------------------------

class ConversationEngine:
    """Manages real-time bidirectional conversations."""

    def __init__(
        self,
        voice_id: str,
        system_prompt: str,
        llm_endpoint: str = "http://localhost:3000/api/agent/respond",
        silence_timeout: float = 1.2,
        industry: str = "default",
    ):
        self.voice_id = voice_id
        self.system_prompt = system_prompt
        self.llm_endpoint = llm_endpoint
        self.silence_timeout = silence_timeout
        self.industry = industry
        self.sessions: Dict[str, ConversationSession] = {}

        self.event_handlers: Dict[str, List[Callable]] = {
            "conversation.started": [],
            "conversation.ended": [],
            "tool_call": [],
            "user_speech": [],
            "assistant_speech": [],
            "state_change": [],
            "barge_in": [],
            "error": [],
        }

        self.backchannel_manager = BackChannelingManager()
        logger.info(f"ConversationEngine: voice={voice_id} industry={industry}")

    def create_session(
        self, metadata: Optional[Dict[str, Any]] = None
    ) -> ConversationSession:
        session = ConversationSession(
            conversation_id=str(uuid.uuid4()),
            start_time=time.time(),
            voice_id=self.voice_id,
            system_prompt=self.system_prompt,
            silence_timeout=self.silence_timeout,
            metadata=metadata or {},
        )
        self.sessions[session.conversation_id] = session
        self._emit("conversation.started", {
            "conversation_id": session.conversation_id,
        })
        logger.info(f"Session created: {session.conversation_id[:8]}")
        return session

    def get_session(self, cid: str) -> Optional[ConversationSession]:
        return self.sessions.get(cid)

    def end_session(self, cid: str) -> Optional[Dict[str, Any]]:
        session = self.sessions.pop(cid, None)
        if not session:
            return None

        summary = session.to_dict()

        # Determine outcome based on conversation
        if len(session.transcript) <= 1:
            session.outcome = CallOutcome.NO_ANSWER
        elif any("voicemail" in e.text.lower() for e in session.transcript):
            session.outcome = CallOutcome.VOICEMAIL

        summary["outcome"] = session.outcome.value

        self._emit("conversation.ended", summary)
        logger.info(
            f"Session ended: {cid[:8]} duration={session.duration:.0f}s "
            f"turns={len(session.transcript)} outcome={session.outcome.value}"
        )
        return summary

    def set_state(self, cid: str, state: TurnState):
        session = self.get_session(cid)
        if not session:
            return
        old = session.state
        session.state = state
        if state in (TurnState.LISTENING, TurnState.SPEAKING):
            session.current_turn_start = time.time()
        self._emit("state_change", {
            "conversation_id": cid,
            "old": old.value,
            "new": state.value,
        })

    def record_user_speech(
        self, cid: str, text: str, confidence: Optional[float] = None
    ):
        session = self.get_session(cid)
        if not session:
            return
        session.add_transcript("user", text, confidence)
        session.last_audio_time = time.time()

        # Simple sentiment detection
        lower = text.lower()
        if any(w in lower for w in ["frustrated", "angry", "terrible", "worst", "ridiculous"]):
            session.user_sentiment = "frustrated"
        elif any(w in lower for w in ["bad", "disappointed", "unhappy", "complaint"]):
            session.user_sentiment = "negative"
        elif any(w in lower for w in ["great", "thanks", "wonderful", "perfect", "awesome"]):
            session.user_sentiment = "positive"

        self._emit("user_speech", {
            "conversation_id": cid, "text": text,
            "confidence": confidence, "sentiment": session.user_sentiment,
        })

    def record_assistant_speech(self, cid: str, text: str):
        session = self.get_session(cid)
        if not session:
            return
        session.add_transcript("assistant", text)
        self._emit("assistant_speech", {"conversation_id": cid, "text": text})

    def handle_tool_call(self, cid: str, tool_name: str, tool_args: Dict):
        session = self.get_session(cid)
        if not session:
            return
        session.tool_call_pending = {"name": tool_name, "args": tool_args}
        logger.info(f"[{cid[:8]}] TOOL: {tool_name}({tool_args})")
        self._emit("tool_call", {
            "conversation_id": cid,
            "tool_name": tool_name,
            "tool_args": tool_args,
        })

    def handle_barge_in(self, cid: str) -> bool:
        session = self.get_session(cid)
        if not session or session.state != TurnState.SPEAKING:
            return False

        session.barge_in_count += 1
        session.last_barge_in_time = time.time()
        self.set_state(cid, TurnState.LISTENING)

        logger.info(f"[{cid[:8]}] BARGE-IN #{session.barge_in_count}")
        self._emit("barge_in", {
            "conversation_id": cid,
            "count": session.barge_in_count,
        })
        return True

    def get_greeting(self) -> str:
        """Get an industry-appropriate greeting."""
        greetings = INDUSTRY_GREETINGS.get(
            self.industry, INDUSTRY_GREETINGS["default"]
        )
        greeting = random.choice(greetings)
        return greeting.replace("{time_of_day}", _time_of_day())

    def get_backchannel(self, cid: str) -> Optional[str]:
        """Get a natural backchannel if appropriate."""
        session = self.get_session(cid)
        if not session or session.state != TurnState.LISTENING:
            return None

        if session.current_turn_start is None:
            return None

        time_listening = time.time() - session.current_turn_start
        if self.backchannel_manager.should_backchannel(cid, time_listening):
            return self.backchannel_manager.get_backchannel(cid)
        return None

    def cleanup_old_sessions(self, max_age: float = 3600):
        now = time.time()
        expired = [
            cid for cid, s in self.sessions.items()
            if (now - s.start_time) > max_age
        ]
        for cid in expired:
            logger.info(f"Cleaning expired: {cid[:8]}")
            self.sessions.pop(cid, None)

    def register_handler(self, event: str, handler: Callable):
        if event not in self.event_handlers:
            self.event_handlers[event] = []
        self.event_handlers[event].append(handler)

    def _emit(self, event: str, data: Dict[str, Any]):
        for handler in self.event_handlers.get(event, []):
            try:
                if asyncio.iscoroutinefunction(handler):
                    asyncio.create_task(handler(event, data))
                else:
                    handler(event, data)
            except Exception as e:
                logger.error(f"Handler error ({event}): {e}")


# ---------------------------------------------------------------------------
# Backchanneling Manager
# ---------------------------------------------------------------------------

class BackChannelingManager:
    """Produces natural conversational backchannels."""

    def __init__(self, enabled: bool = True):
        self.enabled = enabled
        # Tiered backchannels by engagement level
        self.light = ["mm-hmm", "uh-huh", "right", "okay"]
        self.medium = ["I see", "got it", "sure", "understood"]
        self.affirming = ["absolutely", "of course", "that makes sense", "I hear you"]
        self.empathetic = ["I understand", "that must be tough", "I'm sorry to hear that"]

        self.last_time: Dict[str, float] = {}
        self.min_interval = 2.5  # seconds
        self.count: Dict[str, int] = {}

    def should_backchannel(self, cid: str, time_speaking: float) -> bool:
        if not self.enabled or time_speaking < 1.0:
            return False
        last = self.last_time.get(cid, 0)
        if (time.time() - last) < self.min_interval:
            return False
        # Probability increases with time since last backchannel
        elapsed = time.time() - last
        probability = min(0.4, elapsed / 15.0)
        return random.random() < probability

    def get_backchannel(self, cid: str) -> str:
        self.last_time[cid] = time.time()
        n = self.count.get(cid, 0)
        self.count[cid] = n + 1

        # Vary by count to avoid repetition
        if n % 4 == 0:
            return random.choice(self.light)
        elif n % 4 == 1:
            return random.choice(self.medium)
        elif n % 4 == 2:
            return random.choice(self.affirming)
        else:
            return random.choice(self.light)
