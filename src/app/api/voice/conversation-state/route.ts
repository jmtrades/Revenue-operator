/**
 * POST /api/voice/conversation-state — Called by the voice server after every turn
 * to get intelligent decisions about how to handle the next response.
 *
 * Returns:
 * - Response latency tier (instant / normal / thoughtful)
 * - Recommended filler word (non-repeating)
 * - Current caller emotion
 * - Call phase
 * - Vocabulary to mirror
 *
 * The voice server sends the latest turn and receives back real-time guidance
 * for how the agent should behave next. This is what makes the AI adapt
 * its timing, tone, and word choice throughout the call.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  createConversationState,
  addTurn,
  selectResponseUrgency,
  selectFiller,
  type ConversationState,
} from "@/lib/voice/conversation-state";
import { FILLER_ROTATION } from "@/lib/voice/human-voice-defaults";
import { log } from "@/lib/logger";

// In-memory state store per call session (voice server holds one call at a time)
// In production, this would be Redis — but for single-server it's fine.
const callStates = new Map<string, ConversationState>();

// Clean up old sessions after 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [id, state] of callStates.entries()) {
    if (now - state.startedAt > SESSION_TTL_MS) {
      callStates.delete(id);
    }
  }
}, 60_000);

interface ConversationStateBody {
  call_session_id: string;
  /** The latest turn to add */
  turn: {
    speaker: "assistant" | "user";
    text: string;
  };
  /** Whether to initialize a new session (first turn) */
  init?: boolean;
}

export async function POST(req: NextRequest) {
  let payload: ConversationStateBody;
  try {
    payload = (await req.json()) as ConversationStateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { call_session_id, turn, init } = payload;

  if (!call_session_id || !turn?.text) {
    return NextResponse.json(
      { error: "call_session_id and turn are required" },
      { status: 400 },
    );
  }

  try {
    // Get or create state
    let state = callStates.get(call_session_id);
    if (!state || init) {
      state = createConversationState(call_session_id);
      callStates.set(call_session_id, state);
    }

    // Add the turn
    state = addTurn(state, {
      speaker: turn.speaker,
      text: turn.text,
    });
    callStates.set(call_session_id, state);

    // Calculate response guidance (only relevant after user turns)
    let responseGuidance = null;
    if (turn.speaker === "user") {
      const urgency = selectResponseUrgency(state, turn.text);

      // Select non-repeating filler words
      const acknowledgment = selectFiller(
        state,
        "acknowledgment",
        [...FILLER_ROTATION.acknowledgments],
        FILLER_ROTATION.lookbackTurns,
      );
      const transition = selectFiller(
        state,
        "transition",
        [...FILLER_ROTATION.transitions],
        FILLER_ROTATION.lookbackTurns,
      );

      responseGuidance = {
        /** Which latency tier to use */
        urgency,
        /** Suggested acknowledgment filler (non-repeating) */
        suggested_acknowledgment: acknowledgment,
        /** Suggested transition phrase (non-repeating) */
        suggested_transition: transition,
        /** Whether the caller seems to want to leave */
        exit_intent: state.exitIntentDetected,
        /** Caller's vocabulary to mirror */
        mirror_words: state.callerVocabulary.slice(0, 5),
        /** How fast the caller is talking */
        caller_pace: state.callerPace,
      };
    }

    return NextResponse.json({
      ok: true,
      state: {
        phase: state.phase,
        current_emotion: state.currentEmotion,
        dominant_emotion: state.dominantEmotion,
        turn_count: state.turnCount,
        caller_name_known: state.callerNameKnown,
        caller_name: state.callerName,
        interruption_count: state.interruptionCount,
        call_duration_ms: Date.now() - state.startedAt,
        sentiment_trend: state.sentimentTrend,
        avg_words_per_turn: state.avgWordsPerTurn,
        repeated_question_detected: state.repeatedQuestionDetected,
        topics_mentioned: state.topicsMentioned,
      },
      response_guidance: responseGuidance,
    });
  } catch (err) {
    log("error", "voice.conversation_state_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    // Fail open — return neutral defaults so the call continues
    return NextResponse.json({
      ok: true,
      state: {
        phase: "resolution",
        current_emotion: "neutral",
        dominant_emotion: "neutral",
        turn_count: 0,
        caller_name_known: false,
        caller_name: null,
        interruption_count: 0,
        sentiment_trend: "stable",
        avg_words_per_turn: 0,
        repeated_question_detected: false,
        topics_mentioned: [],
      },
      response_guidance: {
        urgency: "normal",
        suggested_acknowledgment: "Sure thing",
        suggested_transition: "So",
        exit_intent: false,
        mirror_words: [],
        caller_pace: "normal",
      },
    });
  }
}
