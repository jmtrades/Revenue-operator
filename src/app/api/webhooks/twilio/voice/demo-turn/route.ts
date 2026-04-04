/**
 * POST /api/webhooks/twilio/voice/demo-turn — Twilio demo call turn-taking endpoint.
 *
 * Implements a conversational AI demo using TwiML <Say> + <Gather input="speech">.
 * Each turn:
 *   1. Receives caller's speech transcription from Twilio (SpeechResult param)
 *   2. Loads conversation history from the call_session metadata
 *   3. Calls generateDemoResponse() to get Claude's reply
 *   4. Returns TwiML with <Say> (AI response) + <Gather> (listen for next turn)
 *
 * Conversation state is stored in the call_sessions.metadata.demo_history array.
 *
 * Security: Validated via either:
 *   - Twilio HMAC-SHA1 signature (x-twilio-signature header)
 *   - Valid call session UUID in query param (shared secret between server + Twilio)
 *   - Valid CallSid matching an existing call_session record
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25; // Allow up to 25s for Claude API + DB round-trips

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import {
  generateDemoResponse,
  getRandomGreeting,
  type ConversationMessage,
} from "@/lib/voice/demo-agent";
import { summarizeAndStoreCall } from "@/lib/voice/context-carryover";
import { executePostCallAutomation } from "@/lib/voice/post-call-automation";
import { log } from "@/lib/logger";
import crypto from "crypto";

/* ── Constants ─────────────────────────────────────────────────────────── */

/** Amazon Polly Neural voice — warm, clear, matches "Sarah" persona */
const VOICE = "Polly.Joanna-Neural";

/** Maximum conversation turns before graceful close */
const MAX_TURNS = 30;

/** Maximum call duration guard — after this many minutes, wrap up */
const MAX_CALL_MINUTES = 15;

/** Minimum speech confidence to accept (0-1). Below this, re-prompt. */
const MIN_CONFIDENCE = 0.55;

/** UUID pattern for validating session IDs */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ── Twilio signature verification ──────────────────────────────────────── */

function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "");
  const data = url + sorted;
  const expected = crypto
    .createHmac("sha1", token)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

/* ── TwiML helpers ──────────────────────────────────────────────────────── */

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convert plain text to SSML for more natural speech.
 * Adds prosody, pauses at natural break points, and conversational rhythm.
 */
function textToSsml(text: string): string {
  let ssml = escapeXml(text);

  // Add brief pauses after ellipses (natural thinking pauses)
  ssml = ssml.replace(/\.\.\./g, '<break time="350ms"/>');

  // Add micro-pauses after em-dashes (conversational asides)
  ssml = ssml.replace(/\s*—\s*/g, ' <break time="200ms"/> ');

  // Add brief pauses after "So," "Well," "Honestly," "Look," etc. (conversation starters)
  ssml = ssml.replace(
    /^(So|Well|Honestly|Look|Hey|Now|OK|Okay|Right|Absolutely|Great|Perfect),?\s/,
    '$1<break time="200ms"/> ',
  );

  // Add pause before question marks (natural lead-in)
  ssml = ssml.replace(/\?\s/g, '? <break time="250ms"/>');

  // Sentence-final falling intonation hint: slight rate decrease on last clause
  // This prevents the "robot reading a list" cadence
  const sentences = ssml.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1) {
    const last = sentences[sentences.length - 1];
    sentences[sentences.length - 1] = `<prosody rate="96%">${last}</prosody>`;
    ssml = sentences.join(' ');
  }

  return `<speak><prosody rate="98%" pitch="-2%">${ssml}</prosody></speak>`;
}

/** Build TwiML: speak AI response → gather caller's speech → loop */
function buildConversationTwiml(
  aiResponse: string,
  callbackUrl: string,
  callSessionId: string,
): string {
  const ssml = textToSsml(aiResponse);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    // speechTimeout="3" = wait 3s of silence after caller starts speaking before processing
    // This prevents cutting off mid-thought but doesn't hang forever
    `  <Gather input="speech" speechTimeout="3" speechModel="phone_call" enhanced="true" language="en-US" action="${escapeXml(callbackUrl)}?session=${callSessionId}" method="POST">`,
    `    <Say voice="${VOICE}">${ssml}</Say>`,
    "  </Gather>",
    // If Gather times out (no speech at all), re-prompt after a brief pause
    `  <Pause length="1"/>`,
    `  <Redirect>${escapeXml(callbackUrl)}?session=${callSessionId}&amp;silence=1</Redirect>`,
    "</Response>",
  ].join("\n");
}

/** Build TwiML: speak final message → hang up */
function buildGoodbyeTwiml(aiResponse: string): string {
  const ssml = textToSsml(aiResponse);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Say voice="${VOICE}">${ssml}</Say>`,
    "  <Hangup/>",
    "</Response>",
  ].join("\n");
}

/* ── Conversation analysis helpers ─────────────────────────────────────── */

/** Detect if the caller is saying goodbye */
function isGoodbyeSignal(text: string): boolean {
  // Strong goodbye signals — clear intent to end the call
  const strongGoodbye = /\b(bye|goodbye|hang up|gotta go|end the call|that's all i needed|no more questions)\b/i.test(text);
  if (strongGoodbye) return true;

  // Weak signals — only trigger goodbye if they appear at the START of a short utterance (< 30 chars)
  // This prevents "I'm done researching competitors" from triggering goodbye
  if (text.length < 30) {
    return /^(that's it|i'm good|i'm done|that's all|no thanks)\.?$/i.test(text.trim());
  }

  return false;
}

/** Detect conversation phase from history for analytics */
function detectPhase(turnCount: number, lastUserMsg: string): string {
  if (turnCount <= 1) return "opening";
  if (/\b(sign up|get started|free trial|ready to buy|buy now|subscribe|purchase|let's do it|i'm in|take my money|where do i sign)\b/i.test(lastUserMsg)) return "closing";
  if (/\b(smith\.?ai|ruby|bland|synthflow|retell|dialpad|competitor|alternative|compared|vs|versus)\b/i.test(lastUserMsg)) return "competitive";
  if (/\b(price|cost|plans?\b|how much|pricing|afford|budget|monthly|per month|subscription)\b/i.test(lastUserMsg)) return "pricing";
  if (/\b(but|however|concern|worry|expensive|not sure|think about|hesitat|don't know|maybe later)\b/i.test(lastUserMsg)) return "objection";
  if (/\b(impressive|amazing|wow|cool|nice|love|great|awesome|exactly what|that's what i need|perfect|incredible)\b/i.test(lastUserMsg)) return "value_confirmed";
  if (/\b(how|what|does|can|will|explain|tell me|show me|walk me through)\b/i.test(lastUserMsg)) return "discovery";
  if (turnCount <= 4) return "discovery";
  return "value";
}

/** Detect if the AI response contained a CTA (call-to-action) */
function hasCTA(text: string): boolean {
  return /\b(recall dash touch dot com|sign up|free trial|get started|money.?back|thirty.?day)\b/i.test(text);
}

/* ── Main handler ───────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  const startMs = Date.now();

  try {
    const bodyText = await request.text();
    const formParams = Object.fromEntries(
      new URLSearchParams(bodyText),
    ) as Record<string, string>;

    /* ── Security verification ── */
    const sig = request.headers.get("x-twilio-signature");
    const hasToken = Boolean(process.env.TWILIO_AUTH_TOKEN);
    const sessionParam = request.nextUrl.searchParams.get("session");
    const callSid = formParams.CallSid ?? "unknown";

    // Three-tier verification: valid session UUID → CallSid match → Twilio signature
    const hasValidSessionId = sessionParam ? UUID_RE.test(sessionParam) : false;

    if (hasToken && process.env.NODE_ENV === "production" && !hasValidSessionId) {
      // No valid UUID session — check Twilio signature as fallback
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const urls = [
        `${appUrl}/api/webhooks/twilio/voice/demo-turn`,
        `${appUrl}/api/webhooks/twilio/voice/demo-turn/`,
      ];
      const sigValid = sig && urls.some((u) => verifyTwilioSignature(u, formParams, sig));
      if (!sigValid) {
        // Last resort: check if CallSid matches an existing session
        const db = getDb();
        const { data: callSidSession } = await db
          .from("call_sessions")
          .select("id")
          .eq("external_meeting_id", callSid)
          .maybeSingle();
        if (!callSidSession) {
          log("warn", "demo_turn.auth_failed", { callSid, hasSession: !!sessionParam });
          return new NextResponse("Unauthorized", { status: 401, headers: { "Content-Type": "text/plain" } });
        }
      }
    }

    /* ── Extract Twilio params ── */
    const speechResult = formParams.SpeechResult ?? null;
    const confidence = formParams.Confidence ? parseFloat(formParams.Confidence) : null;
    const isSilence = request.nextUrl.searchParams.get("silence") === "1";

    const db = getDb();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";
    const callbackUrl = `${appUrl}/api/webhooks/twilio/voice/demo-turn`;

    /* ── Resolve call session (3-tier lookup) ── */
    let history: ConversationMessage[] = [];
    let callSessionId: string | null = null;
    let sessionMeta: Record<string, unknown> = {};

    // Tier 1: Direct session ID from query param
    if (sessionParam && UUID_RE.test(sessionParam)) {
      const { data: session } = await db
        .from("call_sessions")
        .select("id, metadata")
        .eq("id", sessionParam)
        .maybeSingle();
      if (session) {
        const row = session as { id: string; metadata?: Record<string, unknown> | null };
        callSessionId = row.id;
        sessionMeta = (row.metadata ?? {}) as Record<string, unknown>;
        if (sessionMeta.demo_history && Array.isArray(sessionMeta.demo_history)) {
          history = sessionMeta.demo_history as ConversationMessage[];
        }
      }
    }

    // Tier 2: Lookup by CallSid
    if (!callSessionId && callSid !== "unknown") {
      const { data: session } = await db
        .from("call_sessions")
        .select("id, metadata")
        .eq("external_meeting_id", callSid)
        .maybeSingle();
      if (session) {
        const row = session as { id: string; metadata?: Record<string, unknown> | null };
        callSessionId = row.id;
        sessionMeta = (row.metadata ?? {}) as Record<string, unknown>;
        if (sessionMeta.demo_history && Array.isArray(sessionMeta.demo_history)) {
          history = sessionMeta.demo_history as ConversationMessage[];
        }
      }
    }

    // Tier 3: Create an ad-hoc session if we can't find one (edge case)
    if (!callSessionId) {
      const DEMO_WS = process.env.DEMO_WORKSPACE_ID ?? "";
      if (DEMO_WS) {
        try {
          const greeting = getRandomGreeting();
          const { data: created } = await db.from("call_sessions").insert({
            workspace_id: DEMO_WS,
            external_meeting_id: callSid,
            provider: "twilio",
            call_started_at: new Date().toISOString(),
            metadata: {
              is_demo: true,
              created_by: "demo_turn_fallback",
              demo_history: [{ role: "assistant", content: greeting }],
            },
          }).select("id").maybeSingle();
          if (created) {
            callSessionId = (created as { id: string }).id;
            history = [{ role: "assistant", content: greeting }];
          }
        } catch (createErr) {
          log("warn", "demo_turn.session_create_failed", {
            error: createErr instanceof Error ? createErr.message : String(createErr),
          });
        }
      }
    }

    log("info", "demo_turn.request", {
      callSid,
      sessionId: callSessionId,
      hasSpeech: !!speechResult,
      isSilence,
      historyLength: history.length,
    });

    /* ── Handle silence (no speech input) ── */
    if (isSilence && !speechResult) {
      const silenceCount = ((sessionMeta.demo_silence_count as number) || 0) + 1;

      if (silenceCount >= 3) {
        // 3rd silence — end gracefully
        const farewell = "Looks like we might have lost you... no worries at all! Head to recall dash touch dot com whenever you're ready. It was great chatting, take care!";
        await persistHistory(db, callSessionId, sessionMeta, [...history, { role: "assistant", content: farewell }], "ended_silence", { demo_silence_count: silenceCount });

        // Fire post-call automation (non-blocking)
        const DEMO_WS = process.env.DEMO_WORKSPACE_ID ?? "";
        if (callSessionId && DEMO_WS) {
          (async () => {
            try {
              const summary = await summarizeAndStoreCall(callSessionId!, DEMO_WS);
              await executePostCallAutomation(callSessionId!, DEMO_WS, summary);
            } catch (e) { log("warn", "demo_turn.post_call_silence_failed", { error: e instanceof Error ? e.message : String(e) }); }
          })();
        }
        return twimlResponse(buildGoodbyeTwiml(farewell));
      }

      // Re-prompt with variety — shorter, warmer, more natural
      const prompts = [
        "Hey, still with me? No rush at all... just tell me a bit about your business whenever you're ready.",
        "Take your time! I'm curious — what kind of business do you run?",
        "I'm right here whenever you're ready. What brings you to Revenue Operator today?",
      ];
      const nudge = prompts[silenceCount % prompts.length]!;
      history.push({ role: "assistant", content: nudge });
      await persistHistory(db, callSessionId, sessionMeta, history, undefined, { demo_silence_count: silenceCount });

      return twimlResponse(
        buildConversationTwiml(nudge, callbackUrl, callSessionId ?? "unknown"),
      );
    }

    /* ── Process caller's speech ── */
    if (speechResult) {
      // Filter out very low-confidence recognition (background noise, garbled audio)
      if (confidence !== null && confidence < MIN_CONFIDENCE) {
        log("info", "demo_turn.low_confidence_speech", {
          callSid,
          text: speechResult.slice(0, 100),
          confidence,
        });
        const clarify = "Sorry, I didn't quite catch that... could you say that again?";
        history.push({ role: "assistant", content: clarify });
        await persistHistory(db, callSessionId, sessionMeta, history);
        return twimlResponse(
          buildConversationTwiml(clarify, callbackUrl, callSessionId ?? "unknown"),
        );
      }

      // Reset silence counter on successful speech
      sessionMeta.demo_silence_count = 0;

      history.push({ role: "user", content: speechResult });
      log("info", "demo_turn.user_speech", {
        callSid,
        text: speechResult.slice(0, 200),
        confidence,
        turn: history.filter((m) => m.role === "user").length,
      });
    }

    /* ── Check conversation end conditions ── */
    const userTurnCount = history.filter((m) => m.role === "user").length;
    const goodbye = speechResult ? isGoodbyeSignal(speechResult) : false;
    const maxTurns = userTurnCount >= MAX_TURNS;

    // Check call duration guard
    const demoStartedAt = sessionMeta.demo_started_at as string | undefined;
    const callMinutes = demoStartedAt
      ? (Date.now() - new Date(demoStartedAt).getTime()) / 60_000
      : 0;
    const maxDurationReached = callMinutes > MAX_CALL_MINUTES;

    /* ── Generate AI response ── */
    let aiResponse: string;
    try {
      if (maxDurationReached && !goodbye) {
        // Inject a natural wrap-up hint into the system context
        history.push({
          role: "user",
          content: "[System note: This call has been going for a while. Naturally wrap up and guide toward signing up in your next response.]",
        });
      }
      aiResponse = await generateDemoResponse(history);
      // Remove the system note from persisted history
      if (maxDurationReached && !goodbye) {
        history.pop(); // Remove the system note we just added
      }
    } catch (err) {
      log("error", "demo_turn.generate_failed", {
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - startMs,
      });
      aiResponse = "I'm having a little technical hiccup, but that actually almost never happens! Head to recall dash touch dot com to try the platform yourself. It was great chatting!";
    }

    // Add AI response to history
    history.push({ role: "assistant", content: aiResponse });

    /* ── Analytics ── */
    const phase = speechResult ? detectPhase(userTurnCount, speechResult) : "silence";
    const ctaDelivered = hasCTA(aiResponse);

    log("info", "demo_turn.ai_response", {
      callSid,
      turn: userTurnCount,
      phase,
      ctaDelivered,
      responseLength: aiResponse.length,
      latencyMs: Date.now() - startMs,
      isGoodbye: goodbye,
      callMinutes: Math.round(callMinutes * 10) / 10,
    });

    /* ── Persist and respond ── */
    const endReason = goodbye ? "goodbye" : maxTurns ? "max_turns" : maxDurationReached ? "max_duration" : null;

    await persistHistory(db, callSessionId, sessionMeta, history, endReason, {
      demo_turns: userTurnCount,
      demo_last_turn_at: new Date().toISOString(),
      demo_phase: phase,
      demo_cta_delivered: ctaDelivered || (sessionMeta.demo_cta_delivered === true),
      demo_latency_ms: Date.now() - startMs,
    });

    if (goodbye || maxTurns || maxDurationReached) {
      // Ensure farewell includes URL if the AI response doesn't already mention it
      let farewell = aiResponse;
      if (goodbye && !/recall.?dash.?touch/i.test(aiResponse)) {
        farewell = `${aiResponse} Whenever you're ready, head to recall dash touch dot com. It was great chatting with you!`;
      }
      // Update the last history entry with the actual farewell
      history[history.length - 1] = { role: "assistant", content: farewell };
      await persistHistory(db, callSessionId, sessionMeta, history, goodbye ? "goodbye" : maxTurns ? "max_turns" : "max_duration", {
        demo_turns: userTurnCount,
        demo_last_turn_at: new Date().toISOString(),
        demo_phase: phase,
        demo_cta_delivered: true,
        demo_latency_ms: Date.now() - startMs,
      });

      // Fire post-call automation (non-blocking — don't delay the TwiML response)
      const DEMO_WS = process.env.DEMO_WORKSPACE_ID ?? "";
      if (callSessionId && DEMO_WS) {
        (async () => {
          try {
            const summary = await summarizeAndStoreCall(callSessionId!, DEMO_WS);
            await executePostCallAutomation(callSessionId!, DEMO_WS, summary);
          } catch (postCallErr) {
            log("warn", "demo_turn.post_call_failed", {
              error: postCallErr instanceof Error ? postCallErr.message : String(postCallErr),
            });
          }
        })();
      }
      return twimlResponse(buildGoodbyeTwiml(farewell));
    }

    return twimlResponse(
      buildConversationTwiml(aiResponse, callbackUrl, callSessionId ?? "unknown"),
    );
  } catch (err) {
    log("error", "demo_turn.handler_error", {
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startMs,
    });
    return twimlResponse(
      buildGoodbyeTwiml(
        "I hit a small snag, but don't let that stop you! Head to recall dash touch dot com to get started. Thanks for calling!",
      ),
    );
  }
}

/* ── Utility: persist conversation history to DB ───────────────────────── */

async function persistHistory(
  db: ReturnType<typeof getDb>,
  callSessionId: string | null,
  existingMeta: Record<string, unknown>,
  history: ConversationMessage[],
  endReason?: string | null,
  extraMeta?: Record<string, unknown>,
) {
  if (!callSessionId) return;
  try {
    const updateData: Record<string, unknown> = {
      metadata: {
        ...existingMeta,
        demo_history: history,
        ...extraMeta,
        ...(endReason ? { demo_end_reason: endReason, demo_ended_at: new Date().toISOString() } : {}),
      },
    };
    if (endReason) {
      updateData.call_ended_at = new Date().toISOString();
    }
    await db.from("call_sessions").update(updateData).eq("id", callSessionId);
  } catch (dbErr) {
    log("warn", "demo_turn.persist_failed", {
      error: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
  }
}

/* ── Utility: return TwiML response ────────────────────────────────────── */

function twimlResponse(twiml: string): NextResponse {
  return new NextResponse(twiml, {
    headers: {
      "Content-Type": "text/xml",
      "Cache-Control": "no-store",
    },
  });
}
