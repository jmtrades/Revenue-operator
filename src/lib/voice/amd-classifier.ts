/**
 * Phase 12c.1 — Transcript-based Answering Machine Detection (AMD).
 *
 * Provider-level AMD (see voicemail-detection.ts) looks at audio cues —
 * silence, long uninterrupted speech, beep tones. It's good but not perfect,
 * and the top complaint across AI voice platforms (Air AI, Synthflow, Bland,
 * Retell, Vapi) is "the AI pitched into my voicemail."
 *
 * This classifier is a SECOND LINE of defense: it classifies the first
 * utterance(s) of the callee's audio as:
 *   - human              — normal greeting ("hello?", "yeah?", "this is Jim")
 *   - machine_greeting   — voicemail greeting ("you've reached ...", "leave a
 *                          message after the tone", carrier auto-greetings)
 *   - beep               — the tone itself transcribed as words ("beep", "tone")
 *   - ambient            — no clear signal; keep listening
 *
 * Usage:
 *   const c = classifyOpeningUtterance(transcript, { elapsedMs: 4200 });
 *   if (c.verdict === "machine_greeting") → stop pitch, drop voicemail
 *
 * Pure function. No DB. No LLM. Regex + phrase-anchor based so it runs
 * in <1ms and can be applied on every partial transcript chunk.
 *
 * Tuning philosophy:
 *   - Prefer false-negatives over false-positives on the `human` verdict:
 *     speaking into a voicemail is much worse than waiting 500ms longer for
 *     a human's second "hello".
 *   - Only emit `human` with >=0.7 confidence. Otherwise emit `ambient` and
 *     let the caller keep listening.
 */

export type AmdVerdict = "human" | "machine_greeting" | "beep" | "ambient";

export interface AmdClassification {
  verdict: AmdVerdict;
  confidence: number;
  matchedPhrase: string | null;
  reason: string;
  /** Suggested action for the calling agent. */
  recommendedAction:
    | "continue_pitch"
    | "wait_for_beep"
    | "drop_voicemail_now"
    | "hang_up"
    | "keep_listening";
}

export interface AmdClassifyContext {
  /** ms since the callee picked up — if <2500 we bias toward `ambient`. */
  elapsedMs?: number;
  /** Did audio detector already signal beep? If so treat as voicemail. */
  providerSaidMachine?: boolean;
}

// ---------------------------------------------------------------------------
// Phrase libraries.
// Voicemail greetings are remarkably formulaic — both carrier-default
// ("the person you have called is not available") and personal-recorded
// ("hi you've reached ..."). We match on high-signal anchors.
// ---------------------------------------------------------------------------

interface Phrase {
  verdict: AmdVerdict;
  pattern: RegExp;
  confidence: number;
  reason: string;
}

const PHRASES: Phrase[] = [
  // --- Carrier/system voicemail greetings (very high confidence) ---
  { verdict: "machine_greeting", pattern: /\b(the (person|number|subscriber) you (are|have) (calling|called|tried)\b)/i, confidence: 0.98, reason: "carrier_unavailable_notice" },
  { verdict: "machine_greeting", pattern: /\b(is (not|un)available|cannot (come to|take) (the|your) (call|phone))\b/i, confidence: 0.95, reason: "carrier_unavailable_notice" },
  { verdict: "machine_greeting", pattern: /\bplease leave (a|your) (message|name and number)\b/i, confidence: 0.99, reason: "leave_a_message" },
  { verdict: "machine_greeting", pattern: /\bafter (the|this) (tone|beep)\b/i, confidence: 0.99, reason: "after_the_tone" },
  { verdict: "machine_greeting", pattern: /\byour call has been forwarded to (an automated|voicemail)\b/i, confidence: 0.99, reason: "forwarded_to_voicemail" },
  { verdict: "machine_greeting", pattern: /\b(at the tone|record your message)\b/i, confidence: 0.95, reason: "at_the_tone" },
  { verdict: "machine_greeting", pattern: /\b(when you (are|have) finished recording|hang up or press)\b/i, confidence: 0.98, reason: "when_finished" },

  // --- Personal-recorded voicemail openings ---
  { verdict: "machine_greeting", pattern: /\b(hi|hello|hey),?\s+(it'?s|this is)\s+[a-z]+,?\s+(i can'?t|i'?m unable|i'?m not)\s+(come to the phone|get to the phone|answer)\b/i, confidence: 0.96, reason: "personal_cant_answer" },
  { verdict: "machine_greeting", pattern: /\byou'?ve reached (the voicemail|the mailbox|[a-z]+'?s? (phone|cell|voicemail))/i, confidence: 0.97, reason: "youve_reached" },
  { verdict: "machine_greeting", pattern: /\b(sorry )?i (missed|can'?t take) your call\b/i, confidence: 0.85, reason: "missed_your_call" },
  { verdict: "machine_greeting", pattern: /\bi'?ll (call|get back to) you (back )?as soon as/i, confidence: 0.9, reason: "ill_call_back" },
  { verdict: "machine_greeting", pattern: /\b(leave|send) (me )?(a message|your name)/i, confidence: 0.85, reason: "leave_me_message" },

  // --- Beep/tone tokens (often appear in noisy transcripts) ---
  { verdict: "beep", pattern: /\b(beep|tone)\b.{0,30}\b(beep|tone|message)\b/i, confidence: 0.7, reason: "beep_token" },
  { verdict: "beep", pattern: /^[\s.]*b+e+e+p[\s.]*$/i, confidence: 0.85, reason: "beep_only" },

  // --- Human greetings (conservative — only confident short openings) ---
  { verdict: "human", pattern: /^\s*(hello|hi|hey|yeah|yes|speaking|this is)\s*[?.!,]?\s*$/i, confidence: 0.8, reason: "short_human_hello" },
  { verdict: "human", pattern: /^\s*(hello|hi|hey)[, ]+(this is|it'?s)\s+[a-z]+\s*[?.!]?\s*$/i, confidence: 0.85, reason: "hello_this_is_name" },
  { verdict: "human", pattern: /^\s*(who'?s (this|calling)|who is this)\s*[?.!]?\s*$/i, confidence: 0.9, reason: "who_is_this" },
  { verdict: "human", pattern: /^\s*(can i help you|how can i help)\b/i, confidence: 0.75, reason: "how_can_i_help" },
];

/**
 * Classify the first utterance of the callee side of a call.
 *
 * @param transcript  The callee text so far. Typically 1–3 seconds of audio.
 * @param ctx         Optional metadata to refine the decision.
 */
export function classifyOpeningUtterance(
  transcript: string,
  ctx: AmdClassifyContext = {},
): AmdClassification {
  const text = (transcript ?? "").trim();
  if (!text) {
    return {
      verdict: "ambient",
      confidence: 0,
      matchedPhrase: null,
      reason: "empty_transcript",
      recommendedAction: "keep_listening",
    };
  }

  // Provider-level beep trumps everything
  if (ctx.providerSaidMachine) {
    return {
      verdict: "machine_greeting",
      confidence: 0.99,
      matchedPhrase: null,
      reason: "provider_amd_positive",
      recommendedAction: "drop_voicemail_now",
    };
  }

  let best: { phrase: Phrase; matched: string } | null = null;
  for (const p of PHRASES) {
    const m = text.match(p.pattern);
    if (!m) continue;
    if (!best || p.confidence > best.phrase.confidence) {
      best = { phrase: p, matched: m[0] };
    }
  }

  if (!best) {
    // Length heuristic: anything >35 chars with no human match during first
    // ~4s of audio is suspiciously like a voicemail greeting preamble.
    if ((ctx.elapsedMs ?? 0) < 5000 && text.length > 35 && !/[?!]/.test(text)) {
      return {
        verdict: "machine_greeting",
        confidence: 0.55,
        matchedPhrase: null,
        reason: "long_monologue_early",
        recommendedAction: "wait_for_beep",
      };
    }
    return {
      verdict: "ambient",
      confidence: 0,
      matchedPhrase: null,
      reason: "no_signal",
      recommendedAction: "keep_listening",
    };
  }

  const { phrase, matched } = best;

  let action: AmdClassification["recommendedAction"] = "keep_listening";
  if (phrase.verdict === "machine_greeting") {
    // Long greetings → wait for beep; short canned ones → drop immediately
    action = phrase.reason === "after_the_tone" || phrase.reason === "at_the_tone"
      ? "drop_voicemail_now"
      : "wait_for_beep";
  } else if (phrase.verdict === "beep") {
    action = "drop_voicemail_now";
  } else if (phrase.verdict === "human") {
    action = phrase.confidence >= 0.7 ? "continue_pitch" : "keep_listening";
  }

  return {
    verdict: phrase.verdict,
    confidence: phrase.confidence,
    matchedPhrase: matched,
    reason: phrase.reason,
    recommendedAction: action,
  };
}

/**
 * Helper: aggregate a series of partial classifications into a final verdict.
 *
 * As audio streams in, the calling agent gets classifications every ~500ms.
 * This folds them into one decision:
 *   - Any machine_greeting ≥0.8 wins (drop voicemail).
 *   - First human ≥0.7 wins (continue pitch).
 *   - Otherwise keep listening.
 */
export function foldAmdClassifications(series: AmdClassification[]): AmdClassification {
  const latest = series[series.length - 1] ?? null;
  for (const c of series) {
    if (c.verdict === "machine_greeting" && c.confidence >= 0.8) return c;
    if (c.verdict === "beep" && c.confidence >= 0.7) return c;
  }
  for (const c of series) {
    if (c.verdict === "human" && c.confidence >= 0.7) return c;
  }
  return (
    latest ?? {
      verdict: "ambient",
      confidence: 0,
      matchedPhrase: null,
      reason: "no_observations",
      recommendedAction: "keep_listening",
    }
  );
}
