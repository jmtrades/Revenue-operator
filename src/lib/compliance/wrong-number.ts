/**
 * Wrong-number / reassigned-number detection.
 *
 * Why this matters:
 *   - TCPA "reassigned number" litigation: when a consumer's phone number is
 *     reassigned to someone new, prior consent is void. The FCC Reassigned
 *     Numbers Database exists to protect callers, but only if you CHECK and
 *     then ACT on wrong-number signals when they occur.
 *   - An outbound agent that keeps pitching after the person says "you have
 *     the wrong person" creates both a terrible user experience and real
 *     legal exposure. Wrong numbers must be detected, flagged, and halted.
 *
 * What this module does:
 *   1. Detect wrong-number phrases in transcript text.
 *   2. When detected, mark the lead (phone mismatch) and add to a local
 *      reassigned-numbers list so the number isn't called again on the
 *      assumption that the original consent holder is still reachable.
 *   3. Emit a structured audit event.
 *
 * What this module does NOT do:
 *   - It does not query the FCC RND — that's a paid subscription integration
 *     handled elsewhere. This is the reactive backstop for when RND is
 *     missing, stale, or silent.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
// Phase 78 / Task 7.3 — unified DNC helper. We keep writing the richer
// `workspace_reassigned_numbers` row when that table exists (it's the
// purpose-built store for reassigned numbers), but the DNC fallback — for
// environments where `workspace_reassigned_numbers` is not provisioned —
// goes through the canonical `@/lib/voice/dnc` helper so it lands on
// `dnc_entries(phone_number)` alongside every other DNC write in the
// codebase.
import { addDncEntry } from "@/lib/voice/dnc";

/**
 * Wrong-number phrases. Recall-oriented — we'd rather halt outreach on a
 * false positive than keep calling the wrong person.
 */
const WRONG_NUMBER_PHRASES: Array<{ pattern: RegExp; confidence: number }> = [
  { pattern: /\byou have the wrong (person|number|guy|lady|gal)\b/i, confidence: 0.99 },
  { pattern: /\bwrong number\b/i, confidence: 0.95 },
  { pattern: /\bthere('s| is) no ([A-Z][a-z]+ )?(here|at this number)\b/i, confidence: 0.9 },
  { pattern: /\bnobody (by that name|named [A-Z]) (lives here|at this number)\b/i, confidence: 0.95 },
  { pattern: /\bi don'?t know (anyone|who) (named|called) [A-Z]/i, confidence: 0.85 },
  { pattern: /\bthat'?s not me\b/i, confidence: 0.75 },
  { pattern: /\bthis is not ([A-Z][a-z]+)('s)? (phone|number|line)\b/i, confidence: 0.9 },
  { pattern: /\bi (just )?got this (phone )?(number|line)\b/i, confidence: 0.85 },
  { pattern: /\bthis (phone )?number (used to|was previously) belong\b/i, confidence: 0.95 },
];

export interface WrongNumberDetection {
  isWrongNumber: boolean;
  confidence: number;
  matchedPhrase: string | null;
  excerpt: string | null;
}

function normalize(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Scan a transcript (or a single turn of user speech) for wrong-number signals.
 */
export function detectWrongNumber(transcript: string): WrongNumberDetection {
  if (!transcript || transcript.length < 3) {
    return { isWrongNumber: false, confidence: 0, matchedPhrase: null, excerpt: null };
  }
  const text = normalize(transcript);
  let best: WrongNumberDetection = {
    isWrongNumber: false,
    confidence: 0,
    matchedPhrase: null,
    excerpt: null,
  };
  for (const { pattern, confidence } of WRONG_NUMBER_PHRASES) {
    const m = text.match(pattern);
    if (m && confidence > best.confidence) {
      const idx = m.index ?? text.indexOf(m[0]);
      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + m[0].length + 20);
      best = {
        isWrongNumber: true,
        confidence,
        matchedPhrase: m[0],
        excerpt: text.slice(start, end),
      };
    }
  }
  return best;
}

/**
 * Persist a wrong-number signal:
 *   - Flag the lead with a `wrong_number` metadata tag and neutral state
 *     (not "opted out" — the consent was never theirs; distinguish).
 *   - Add the number to workspace_reassigned_numbers (best-effort — table
 *     may not exist yet; we swallow the error).
 *   - Annotate call_sessions.
 *   - Emit audit log.
 *
 * Idempotent — safe to call multiple times on the same session.
 */
export async function recordWrongNumber(params: {
  workspaceId: string;
  leadId?: string | null;
  callSessionId?: string | null;
  phoneNumber: string;
  detection: WrongNumberDetection;
}): Promise<{ ok: boolean; error?: string }> {
  const { workspaceId, leadId, callSessionId, phoneNumber, detection } = params;
  if (!detection.isWrongNumber) {
    return { ok: false, error: "No wrong-number signal" };
  }

  const phoneNormalized = phoneNumber.replace(/\D/g, "");
  if (phoneNormalized.length < 10) {
    return { ok: false, error: "Invalid phone number" };
  }

  const db = getDb();

  // Flag the lead (metadata + state = 'WRONG_NUMBER'). Consent did not attach
  // to this person, so don't muddy opted-out stats.
  if (leadId) {
    try {
      // Read current metadata first to merge
      const { data } = await db
        .from("leads")
        .select("metadata")
        .eq("id", leadId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      const prevMeta = (data as { metadata?: Record<string, unknown> | null } | null)?.metadata ?? {};
      await db
        .from("leads")
        .update({
          state: "WRONG_NUMBER",
          metadata: {
            ...prevMeta,
            wrong_number: true,
            wrong_number_detected_at: new Date().toISOString(),
            wrong_number_phrase: detection.matchedPhrase,
          },
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", leadId)
        .eq("workspace_id", workspaceId);
    } catch (err) {
      log("warn", "wrong_number.lead_flag_failed", {
        workspaceId,
        leadId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Append to reassigned-numbers list so no future campaign calls this number.
  // Table schema (suggested migration):
  //   CREATE TABLE workspace_reassigned_numbers (
  //     workspace_id uuid, phone_number text, detected_at timestamptz default now(),
  //     confidence numeric, phrase text, source text,
  //     PRIMARY KEY (workspace_id, phone_number)
  //   );
  // We soft-handle the case where the table doesn't exist yet.
  try {
    await db
      .from("workspace_reassigned_numbers")
      .upsert(
        {
          workspace_id: workspaceId,
          phone_number: phoneNormalized,
          confidence: detection.confidence,
          phrase: detection.matchedPhrase,
          source: "in_call_verbal",
          detected_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,phone_number" },
      );
  } catch {
    // Table may not exist — we log but don't fail. Still record a DNC entry
    // as a fallback so the number isn't called again. Routes through the
    // canonical unified helper so column names / reason enum / normalization
    // match the rest of the codebase.
    const fallback = await addDncEntry({
      workspaceId,
      phone: phoneNormalized,
      reason: "wrong_number",
      source: "in_call_verbal",
      notes: `Wrong-number detected: "${detection.matchedPhrase}" (confidence=${detection.confidence.toFixed(2)})`,
    });
    if (!fallback.ok) {
      log("warn", "wrong_number.dnc_fallback_failed", {
        workspaceId,
        error: fallback.error ?? "unknown",
      });
    }
  }

  if (callSessionId) {
    try {
      await db
        .from("call_sessions")
        .update({
          outcome: "wrong_number",
          summary: detection.excerpt ?? `Wrong number: "${detection.matchedPhrase}"`,
        })
        .eq("id", callSessionId)
        .eq("workspace_id", workspaceId);
    } catch {
      // Non-blocking
    }
  }

  try {
    await db.from("sync_log").insert({
      workspace_id: workspaceId,
      provider: "voice",
      direction: "inbound",
      entity_type: "consent",
      action: "wrong_number_recorded",
      summary: `Wrong-number: "${detection.matchedPhrase}"`,
      payload_snapshot: {
        phone_last4: phoneNormalized.slice(-4),
        lead_id: leadId,
        call_session_id: callSessionId,
        detection,
      },
    });
  } catch {
    // Non-blocking
  }

  log("info", "wrong_number.recorded", {
    workspaceId,
    leadId,
    callSessionId,
    confidence: detection.confidence,
  });

  return { ok: true };
}
