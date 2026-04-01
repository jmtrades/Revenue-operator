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
 *
 * Security: Verifies voice webhook secret in Authorization header.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import {
  createConversationState,
  addTurn,
  selectResponseUrgency,
  selectFiller,
  type ConversationState,
} from "@/lib/voice/conversation-state";
import { FILLER_ROTATION } from "@/lib/voice/human-voice-defaults";
import { log } from "@/lib/logger";

function verifyWebhookSecret(body: string, authHeader: string | null): boolean {
  const secret = process.env.VOICE_WEBHOOK_SECRET;
  if (!secret) {
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    if (isProduction) {
      log("error", "voice_conversation_state.secret_not_configured", { message: "rejecting webhook — VOICE_WEBHOOK_SECRET must be set in production" });
      return false;
    }
    log("warn", "voice_conversation_state.secret_not_configured", { message: "skipping signature verification in development" });
    return true;
  }

  if (!authHeader) {
    log("error", "voice_conversation_state.missing_auth_header", { message: "Authorization header required" });
    return false;
  }

  // Expected format: "Bearer <signature>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    log("error", "voice_conversation_state.invalid_auth_format", { message: "Invalid Authorization header format" });
    return false;
  }
  const signature = parts[1];

  const expected = createHmac("sha256", secret)
    .update(body, "utf-8")
    .digest("hex");

  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf-8"), Buffer.from(signature, "utf-8"));
  } catch {
    return expected === signature;
  }
}

// In-memory state store per call session (voice server holds one call at a time)
// In production, this would be Redis — but for single-server it's fine.
const callStates = new Map<string, ConversationState>();

// Hard cap to prevent unbounded memory growth under load
const MAX_CONCURRENT_SESSIONS = 500;

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
  // Verify webhook signature
  const body = await req.text();
  const authHeader = req.headers.get("Authorization");

  if (!verifyWebhookSecret(body, authHeader)) {
    log("error", "voice_conversation_state.invalid_signature", { message: "signature verification failed" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ConversationStateBody;
  try {
    payload = JSON.parse(body) as ConversationStateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { call_session_id, turn, init } = payload;

  if (!call_session_id || !turn?.text || typeof call_session_id !== "string") {
    return NextResponse.json(
      { error: "call_session_id and turn are required" },
      { status: 400 },
    );
  }

  // Cap turn text to prevent memory abuse (voice turns are typically <500 chars)
  if (turn.text.length > 5000) {
    turn.text = turn.text.slice(0, 5000);
  }

  try {
    // Get or create state
    let state = callStates.get(call_session_id);
    if (!state || init) {
      // Enforce max concurrent sessions to prevent memory exhaustion
      if (callStates.size >= MAX_CONCURRENT_SESSIONS && !callStates.has(call_session_id)) {
        // Evict oldest session to make room
        let oldestId: string | null = null;
        let oldestTime = Infinity;
        for (const [id, s] of callStates.entries()) {
          if (s.startedAt < oldestTime) {
            oldestTime = s.startedAt;
            oldestId = id;
          }
        }
        if (oldestId) callStates.delete(oldestId);
      }
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
