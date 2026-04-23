/**
 * Crisis / emergency detection.
 *
 * When an outbound or inbound caller expresses a mental-health crisis,
 * medical emergency, domestic violence, or imminent harm signal, the sales
 * script STOPS. Full stop. The agent acknowledges the person, offers
 * appropriate resources (988, 911, DV hotline), and flags the session for
 * immediate human review.
 *
 * This module:
 *   1. Classifies transcript text into crisis categories with confidence.
 *   2. Emits an appropriate response script the agent can read verbatim.
 *   3. Persists an escalation record so ops sees this within seconds.
 *
 * Tuning philosophy:
 *   - High recall at the cost of some false positives. The cost of a single
 *     missed genuine crisis is catastrophic; the cost of a false positive
 *     is a polite "are you okay?" mid-sales-call.
 *   - Resources are US-focused. International deployments should override
 *     the RESPONSE_SCRIPTS table per-locale.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export type CrisisCategory =
  | "suicide_self_harm"
  | "medical_emergency"
  | "domestic_violence"
  | "imminent_harm"
  | "none";

export interface CrisisDetection {
  category: CrisisCategory;
  confidence: number;
  matchedPhrase: string | null;
  excerpt: string | null;
  /** Script the agent should read verbatim before ending the call. */
  recommendedResponse: string | null;
}

interface CrisisPattern {
  category: CrisisCategory;
  pattern: RegExp;
  confidence: number;
}

const CRISIS_PATTERNS: CrisisPattern[] = [
  // Suicide / self-harm
  { category: "suicide_self_harm", pattern: /\b(i want to|i'?m going to|thinking about) (kill|end) (myself|my life|it all)\b/i, confidence: 0.99 },
  { category: "suicide_self_harm", pattern: /\b(i'?m |i am )?suicidal\b/i, confidence: 0.97 },
  { category: "suicide_self_harm", pattern: /\b(want to|going to) (die|end it)\b/i, confidence: 0.9 },
  { category: "suicide_self_harm", pattern: /\bi can'?t go on\b/i, confidence: 0.75 },
  { category: "suicide_self_harm", pattern: /\bno (reason|point) (in |to )?liv(e|ing)\b/i, confidence: 0.9 },
  { category: "suicide_self_harm", pattern: /\b(hurt|harm|cut|cutting) myself\b/i, confidence: 0.95 },
  { category: "suicide_self_harm", pattern: /\b(overdose|take (all )?the pills)\b/i, confidence: 0.9 },

  // Medical emergency
  { category: "medical_emergency", pattern: /\b(i'?m |i am |having (a|an)?|chest) (heart attack|stroke)\b/i, confidence: 0.99 },
  { category: "medical_emergency", pattern: /\bcan'?t breathe\b/i, confidence: 0.95 },
  { category: "medical_emergency", pattern: /\bi('?m| am) (bleeding|hemorrhag)/i, confidence: 0.95 },
  { category: "medical_emergency", pattern: /\b(call )?9.?1.?1\b/i, confidence: 0.7 },
  { category: "medical_emergency", pattern: /\b(ambulance|paramedic)s?\b/i, confidence: 0.6 },
  { category: "medical_emergency", pattern: /\bchoking\b/i, confidence: 0.85 },
  { category: "medical_emergency", pattern: /\bi('?m| am) having a seizure\b/i, confidence: 0.97 },

  // Domestic violence / abuse
  { category: "domestic_violence", pattern: /\b(he|she|my (husband|wife|boyfriend|girlfriend|partner)) (is |'s )?(hitting|beating|hurting|abusing) me\b/i, confidence: 0.95 },
  { category: "domestic_violence", pattern: /\bi'?m (being |getting )?(abused|hit|beat)\b/i, confidence: 0.9 },
  { category: "domestic_violence", pattern: /\bhelp me,? please\b/i, confidence: 0.6 },
  { category: "domestic_violence", pattern: /\bthey'?re going to (kill|hurt) me\b/i, confidence: 0.95 },

  // Generic imminent harm
  { category: "imminent_harm", pattern: /\b(someone|he|she|they) (has|have) a (gun|knife|weapon)\b/i, confidence: 0.95 },
  { category: "imminent_harm", pattern: /\b(i'?m |we'?re )?in danger\b/i, confidence: 0.85 },
  { category: "imminent_harm", pattern: /\bintruder\b/i, confidence: 0.7 },
];

const RESPONSE_SCRIPTS: Record<CrisisCategory, string> = {
  suicide_self_harm:
    "I'm really glad you told me. You don't have to go through this alone. Please call or text 988 — it's the Suicide & Crisis Lifeline and someone's there right now, 24 hours a day. If you're in immediate danger, please call 911. I'm going to end this call so the line stays free for you to reach them. Take care.",
  medical_emergency:
    "I want you to hang up and call 911 right now. That's the fastest way to get help. If you can't call, ask someone nearby. I'll end the call so you can reach them. Please take care of yourself.",
  domestic_violence:
    "I hear you, and I want you to be safe. If you can speak freely, please call 911. If you can't talk, you can text 'START' to 88788 to reach the National Domestic Violence Hotline, or call 1-800-799-7233. I'm going to end this call so you can reach them. Take care.",
  imminent_harm:
    "This sounds urgent. Please call 911 right away — they can get help to you fast. I'll end the call so the line stays open for emergency services. Take care.",
  none: "",
};

function normalize(text: string): string {
  return text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Detect a crisis signal in transcript text. Returns the HIGHEST-severity
 * match — suicide/self-harm beats medical, medical beats DV, DV beats
 * imminent-harm, when confidences are close. When confidences differ by
 * more than 0.1, the higher-confidence match wins regardless of category.
 */
export function detectCrisis(transcript: string): CrisisDetection {
  if (!transcript || transcript.length < 3) {
    return { category: "none", confidence: 0, matchedPhrase: null, excerpt: null, recommendedResponse: null };
  }
  const text = normalize(transcript);

  const categoryPriority: Record<CrisisCategory, number> = {
    suicide_self_harm: 4,
    medical_emergency: 3,
    domestic_violence: 2,
    imminent_harm: 1,
    none: 0,
  };

  let best: { category: CrisisCategory; confidence: number; phrase: string; excerpt: string } | null = null;

  for (const p of CRISIS_PATTERNS) {
    const m = text.match(p.pattern);
    if (!m) continue;
    const idx = m.index ?? text.indexOf(m[0]);
    const start = Math.max(0, idx - 20);
    const end = Math.min(text.length, idx + m[0].length + 20);
    const candidate = {
      category: p.category,
      confidence: p.confidence,
      phrase: m[0],
      excerpt: text.slice(start, end),
    };
    if (!best) {
      best = candidate;
      continue;
    }
    // Prefer higher confidence by >0.1, otherwise prefer higher-priority category
    if (candidate.confidence - best.confidence > 0.1) {
      best = candidate;
    } else if (Math.abs(candidate.confidence - best.confidence) <= 0.1) {
      if (categoryPriority[candidate.category] > categoryPriority[best.category]) {
        best = candidate;
      }
    }
  }

  if (!best) {
    return { category: "none", confidence: 0, matchedPhrase: null, excerpt: null, recommendedResponse: null };
  }

  return {
    category: best.category,
    confidence: best.confidence,
    matchedPhrase: best.phrase,
    excerpt: best.excerpt,
    recommendedResponse: RESPONSE_SCRIPTS[best.category] || null,
  };
}

/**
 * Persist a crisis detection so ops is alerted immediately and compliance
 * has an audit trail.
 *
 * Flags the call_sessions row as "crisis_escalated" and writes a sync_log
 * event that ops dashboards subscribe to.
 */
export async function recordCrisisDetection(params: {
  workspaceId: string;
  leadId?: string | null;
  callSessionId?: string | null;
  detection: CrisisDetection;
}): Promise<{ ok: boolean; error?: string }> {
  const { workspaceId, leadId, callSessionId, detection } = params;
  if (detection.category === "none") {
    return { ok: false, error: "No crisis detected" };
  }

  const db = getDb();

  if (callSessionId) {
    try {
      await db
        .from("call_sessions")
        .update({
          outcome: "crisis_escalated",
          show_status: "escalated",
          show_reason: `${detection.category}: ${detection.matchedPhrase ?? ""}`.slice(0, 255),
        })
        .eq("id", callSessionId)
        .eq("workspace_id", workspaceId);
    } catch (err) {
      log("warn", "crisis.session_annotate_failed", {
        workspaceId,
        callSessionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  try {
    await db.from("sync_log").insert({
      workspace_id: workspaceId,
      provider: "voice",
      direction: "inbound",
      entity_type: "safety",
      action: "crisis_detected",
      summary: `CRISIS: ${detection.category} — "${detection.matchedPhrase ?? ""}"`,
      payload_snapshot: {
        category: detection.category,
        confidence: detection.confidence,
        matched_phrase: detection.matchedPhrase,
        excerpt: detection.excerpt,
        lead_id: leadId,
        call_session_id: callSessionId,
      },
    });
  } catch (err) {
    log("warn", "crisis.audit_log_failed", {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Always log at error-level so alerts fire
  log("error", "crisis.detected", {
    workspaceId,
    leadId,
    callSessionId,
    category: detection.category,
    confidence: detection.confidence,
  });

  return { ok: true };
}
