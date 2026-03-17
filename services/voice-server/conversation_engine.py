"""
Real-time conversation engine for bidirectional audio streaming.
Manages turn-taking, silence detection, barge-in, and tool calling.
"""

import asyncio
import logging
import random
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, Callable, List
import time
import uuid

logger = logging.getLogger(__name__)


class TurnState(Enum):
    """State machine for conversation turns."""
    LISTENING = "listening"
    PROCESSING = "processing"
    SPEAKING = "speaking"
    IDLE = "idle"


@dataclass
class ConversationTranscript:
    """Transcript entry for a single turn."""
    timestamp: float
    speaker: str  # "user" or "assistant"
    text: str
    confidence: Optional[float] = None
    duration: float = 0.0


@dataclass
class ConversationSession:
    """Manages a single conversation session."""
    conversation_id: str
    start_time: float
    voice_id: str
    system_prompt: str
    transcript: List[ConversationTranscript] = field(default_factory=list)
    state: TurnState = TurnState.IDLE
    last_audio_time: float = field(default_factory=lambda: time.time())
    silence_timeout: float = 1.5  # seconds
    current_turn_start: Optional[float] = None
    tool_call_pending: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def duration(self) -> float:
        """Get conversation duration in seconds."""
        return time.time() - self.start_time

    def has_silence(self) -> bool:
        """Check if silence threshold exceeded."""
        return (time.time() - self.last_audio_time) > self.silence_timeout

    def add_transcript(self, speaker: str, text: str, confidence: Optional[float] = None):
        """Add entry to transcript."""
        self.transcript.append(ConversationTranscript(
            timestamp=time.time(),
            speaker=speaker,
            text=text,
            confidence=confidence,
            duration=0.0
        ))
        logger.info(f"[{self.conversation_id}] {speaker}: {text}")

    def get_transcript_text(self) -> str:
        """Get conversation transcript as formatted text."""
        lines = []
        for entry in self.transcript:
            lines.append(f"{entry.speaker.upper()}: {entry.text}")
        return "\n".join(lines)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "conversation_id": self.conversation_id,
            "duration": self.duration,
            "state": self.state.value,
            "transcript": [
                {
                    "timestamp": entry.timestamp,
                    "speaker": entry.speaker,
                    "text": entry.text,
                    "confidence": entry.confidence,
                    "duration": entry.duration,
                }
                for entry in self.transcript
            ],
            "metadata": self.metadata,
        }


class ConversationEngine:
    """Manages real-time bidirectional audio streaming conversations."""

    def __init__(
        self,
        voice_id: str,
        system_prompt: str,
        llm_endpoint: str = "http://localhost:3000/api/agent/respond",
        silence_timeout: float = 1.5,
    ):
        self.voice_id = voice_id
        self.system_prompt = system_prompt
        self.llm_endpoint = llm_endpoint
        self.silence_timeout = silence_timeout
        self.sessions: Dict[str, ConversationSession] = {}
        self.event_handlers: Dict[str, List[Callable]] = {
            "conversation.started": [],
            "conversation.ended": [],
            "tool_call": [],
            "user_speech": [],
            "assistant_speech": [],
            "state_change": [],
            "error": [],
        }
        logger.info(
            f"Initialized ConversationEngine for voice {voice_id} "
            f"with LLM endpoint {llm_endpoint}"
        )

    def create_session(self, metadata: Optional[Dict[str, Any]] = None) -> ConversationSession:
        """Create a new conversation session."""
        session = ConversationSession(
            conversation_id=str(uuid.uuid4()),
            start_time=time.time(),
            voice_id=self.voice_id,
            system_prompt=self.system_prompt,
            silence_timeout=self.silence_timeout,
            metadata=metadata or {},
        )
        self.sessions[session.conversation_id] = session
        logger.info(f"Created conversation session {session.conversation_id}")
        self._emit_event("conversation.started", {
            "conversation_id": session.conversation_id,
            "timestamp": session.start_time,
        })
        return session

    def get_session(self, conversation_id: str) -> Optional[ConversationSession]:
        """Get a conversation session by ID."""
        return self.sessions.get(conversation_id)

    def end_session(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """End a conversation session and return summary."""
        session = self.sessions.pop(conversation_id, None)
        if not session:
            logger.warning(f"Session {conversation_id} not found")
            return None

        summary = session.to_dict()
        logger.info(f"Ended conversation session {conversation_id} "
                   f"(duration: {session.duration:.1f}s, turns: {len(session.transcript)})")

        self._emit_event("conversation.ended", summary)
        return summary

    def set_state(self, conversation_id: str, state: TurnState):
        """Update conversation state."""
        session = self.get_session(conversation_id)
        if not session:
            return

        old_state = session.state
        session.state = state
        session.current_turn_start = time.time() if state in [TurnState.LISTENING, TurnState.SPEAKING] else None

        logger.debug(f"[{conversation_id}] State: {old_state.value} -> {state.value}")
        self._emit_event("state_change", {
            "conversation_id": conversation_id,
            "old_state": old_state.value,
            "new_state": state.value,
        })

    def record_user_speech(
        self,
        conversation_id: str,
        text: str,
        confidence: Optional[float] = None,
    ):
        """Record user speech in the conversation."""
        session = self.get_session(conversation_id)
        if not session:
            logger.warning(f"Session {conversation_id} not found")
            return

        session.add_transcript("user", text, confidence)
        session.last_audio_time = time.time()

        self._emit_event("user_speech", {
            "conversation_id": conversation_id,
            "text": text,
            "confidence": confidence,
        })

    def record_assistant_speech(self, conversation_id: str, text: str):
        """Record assistant speech in the conversation."""
        session = self.get_session(conversation_id)
        if not session:
            logger.warning(f"Session {conversation_id} not found")
            return

        session.add_transcript("assistant", text)
        self._emit_event("assistant_speech", {
            "conversation_id": conversation_id,
            "text": text,
        })

    def handle_tool_call(
        self,
        conversation_id: str,
        tool_name: str,
        tool_args: Dict[str, Any],
    ):
        """Record a tool call request from the LLM."""
        session = self.get_session(conversation_id)
        if not session:
            logger.warning(f"Session {conversation_id} not found")
            return

        session.tool_call_pending = {
            "name": tool_name,
            "args": tool_args,
        }
        logger.info(f"[{conversation_id}] Tool call: {tool_name}({tool_args})")

        self._emit_event("tool_call", {
            "conversation_id": conversation_id,
            "tool_name": tool_name,
            "tool_args": tool_args,
        })

    def handle_barge_in(self, conversation_id: str) -> bool:
        """
        Handle user interruption of assistant speech.
        Returns True if barge-in was successful.
        """
        session = self.get_session(conversation_id)
        if not session:
            return False

        if session.state != TurnState.SPEAKING:
            logger.debug(f"[{conversation_id}] Barge-in ignored: not in SPEAKING state")
            return False

        logger.info(f"[{conversation_id}] Barge-in detected, stopping TTS and returning to LISTENING")
        self.set_state(conversation_id, TurnState.LISTENING)
        return True

    async def check_silence_and_transition(self, conversation_id: str) -> bool:
        """
        Check if silence timeout exceeded and transition to PROCESSING.
        Returns True if transition occurred.
        """
        session = self.get_session(conversation_id)
        if not session:
            return False

        if session.state != TurnState.LISTENING:
            return False

        if not session.has_silence():
            return False

        logger.info(f"[{conversation_id}] Silence detected, transitioning to PROCESSING")
        self.set_state(conversation_id, TurnState.PROCESSING)
        return True

    def insert_backchannel(self, conversation_id: str) -> Optional[str]:
        """
        Insert natural backchanneling ("mm-hmm", "I see", etc.) during user speech.
        Returns the backchannel text or None if not appropriate.
        """
        session = self.get_session(conversation_id)
        if not session:
            return None

        if session.state != TurnState.LISTENING:
            return None

        # Don't backchannel if we just started listening
        if session.current_turn_start and (time.time() - session.current_turn_start) < 0.5:
            return None

        # Simple probability-based selection
        backchannels = ["mm-hmm", "I see", "right", "got it", "okay", "understood"]
        return random.choice(backchannels)

    def register_event_handler(self, event_type: str, handler: Callable):
        """Register a callback for an event type."""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        self.event_handlers[event_type].append(handler)
        logger.debug(f"Registered handler for {event_type}")

    def _emit_event(self, event_type: str, data: Dict[str, Any]):
        """Emit an event to all registered handlers."""
        handlers = self.event_handlers.get(event_type, [])
        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    asyncio.create_task(handler(event_type, data))
                else:
                    handler(event_type, data)
            except Exception as e:
                logger.error(f"Error in event handler for {event_type}: {e}", exc_info=True)

    def get_session_summary(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get a summary of a conversation session."""
        session = self.get_session(conversation_id)
        if not session:
            return None

        return {
            "conversation_id": conversation_id,
            "duration": session.duration,
            "turn_count": len(session.transcript),
            "state": session.state.value,
            "transcript": session.get_transcript_text(),
            "metadata": session.metadata,
        }

    def cleanup_old_sessions(self, max_age_seconds: float = 3600):
        """Remove sessions older than max_age_seconds."""
        now = time.time()
        expired = [
            cid for cid, session in self.sessions.items()
            if (now - session.start_time) > max_age_seconds
        ]
        for cid in expired:
            logger.info(f"Cleaning up expired session {cid}")
            self.sessions.pop(cid, None)


class BackChannelingManager:
    """Manages natural backchanneling during conversations."""

    def __init__(self, enabled: bool = True):
        self.enabled = enabled
        self.backchannels = [
            "mm-hmm",
            "I see",
            "right",
            "got it",
            "okay",
            "understood",
            "yes",
            "uh-huh",
            "I hear you",
        ]
        self.last_backchannel_time: Dict[str, float] = {}
        self.min_backchannel_interval = 2.0  # seconds

    def should_backchannel(
        self,
        conversation_id: str,
        time_speaking: float,
    ) -> bool:
        """Determine if backchanneling is appropriate."""
        if not self.enabled:
            return False

        if time_speaking < 0.5:
            return False

        last_time = self.last_backchannel_time.get(conversation_id, 0)
        if (time.time() - last_time) < self.min_backchannel_interval:
            return False

        return True

    def get_backchannel(self, conversation_id: str) -> str:
        """Get a random backchannel utterance."""
        self.last_backchannel_time[conversation_id] = time.time()
        return random.choice(self.backchannels)
