/**
 * In-call consent revocation detector.
 *
 * TCPA gives consumers an unrestricted right to revoke prior-express consent.
 * The FCC's 2024 order clarified that revocation can be expressed by "any
 * reasonable method" — so the agent must listen for revocation phrases during
 * the call and (a) stop all future outreach and (b) honor the revocation
 * across channels. This module provides:
 *
 *   1. A pure detection function over transcript text.
 *   2. A server-side handler that persists the revocation: adds to DNC,
 *      marks the lead, writes an audit row, and flags the call session.
 *
 * Detection is intentionally high-recall (better to false-positive once than
 * to miss a single revocation — false-positives just stop outreach to that
 * one phone number). Every match is logged with the matched phrase and a
 * confidence score so compliance can audit.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
// Phase 13c — regulator-grade audit log for every revocation.
import {
  buildConsentAuditRow,
  createSupabaseConsentAuditWriter,
} from "@/lib/compliance/consent-audit";
// Phase 78 / Task 7.3 — all DNC writes go through the unified helper so
// the SMS-STOP path, the in-call verbal-revocation path, the wrong-number
// path, and the dashboard all agree on one table (`dnc_entries`), one
// column name (`phone_number`), and one reason enum.
import { addDncEntry } from "@/lib/voice/dnc";

/**
 * Canonical revocation phrases. All comparisons are case-insensitive, and
 * whitespace/punctuation is normalized before matching.
 */
const REVOCATION_PHRASES: Array<{ pattern: RegExp; confidence: number; kind: string }> = [
  // High-confidence unambiguous
  { pattern: /\bdo not call\b/i, confidence: 0.99, kind: "explicit_dnc" },
  { pattern: /\bdont call\b/i, confidence: 0.95, kind: "explicit_dnc" },
  { pattern: /\bstop calling\b/i, confidence: 0.99, kind: "explicit_dnc" },
  { pattern: /\bquit calling\b/i, confidence: 0.97, kind: "explicit_dnc" },
  { pattern: /\bnever call (me|this number)\b/i, confidence: 0.98, kind: "explicit_dnc" },
  { pattern: /\btake me off (your|the|this) list\b/i, confidence: 0.99, kind: "list_removal" },
  { pattern: /\bremove me from (your|the|this) list\b/i, confidence: 0.99, kind: "list_removal" },
  { pattern: /\bput me on (your|the) do.?not.?call\b/i, confidence: 0.99, kind: "list_removal" },
  { pattern: /\badd me to (your|the) do.?not.?call\b/i, confidence: 0.99, kind: "list_removal" },
  { pattern: /\blose my number\b/i, confidence: 0.95, kind: "explicit_dnc" },
  { pattern: /\bi revoke (my )?consent\b/i, confidence: 0.99, kind: "explicit_revocation" },
  { pattern: /\bi withdraw (my )?consent\b/i, confidence: 0.99, kind: "explicit_revocation" },
  { pattern: /\bunsubscribe\b/i, confidence: 0.9, kind: "unsubscribe" },
  { pattern: /\bopt me out\b/i, confidence: 0.95, kind: "opt_out" },
  { pattern: /\bopt-?out\b/i, confidence: 0.85, kind: "opt_out" },

  // Softer revocation (context-dependent)
  { pattern: /\bi('ll| am|'m) (report(ing)?|suing) you\b/i, confidence: 0.8, kind: "threat_plus_stop" },
  { pattern: /\bi('ll| am|'m) block(ing)? (this|your) number\b/i, confidence: 0.8, kind: "blocking" },
  { pattern: /\bdon'?t (ever |you )?(call|contact) me (again|back)?\b/i, confidence: 0.98, kind: "explicit_dnc" },
];

export interface RevocationDetection {
  revoked: boolean;
  confidence: number;
  matchedPhrase: string | null;
  kind: string | null;
  /** The raw substring from the transcript that matched — useful for audit logs. */
  excerpt: string | null;
}

/** Normalize transcript text for more forgiving matching. */
function normalize(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Scan a transcript (full call or last turn) for consent-revocation signals.
 * Returns the HIGHEST-confidence match (not all matches — any one is sufficient).
 */
export function detectConsentRevocation(transcript: string): RevocationDetection {
  if (!transcript || transcript.length < 3) {
    return { revoked: false, confidence: 0, matchedPhrase: null, kind: null, excerpt: null };
  }
  const text = normalize(transcript);

  let best: RevocationDetection = {
    revoked: false,
    confidence: 0,
    matchedPhrase: null,
    kind: null,
    excerpt: null,
  };

  for (const { pattern, confidence, kind } of REVOCATION_PHRASES) {
    const m = text.match(pattern);
    if (m && confidence > best.confidence) {
      // Capture 40 chars of context around the match for the audit log
      const idx = m.index ?? text.indexOf(m[0]);
      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + m[0].length + 20);
      const excerpt = text.slice(start, end);
      best = {
        revoked: true,
        confidence,
        matchedPhrase: m[0],
        kind,
        excerpt,
      };
    }
  }

  return best;
}

export interface RevocationRecordResult {
  ok: boolean;
  error?: string;
  dncRecordId?: string;
}

/**
 * Persist a detected revocation. Idempotent: safe to call multiple times
 * per call session — duplicates are de-duped on (workspace_id, phone_number)
 * in the dnc_list table's unique constraint.
 *
 * What this does:
 *   1. Inserts/upserts a dnc_list row with reason = 'consent_revoked'
 *   2. Updates the lead to state = 'opted_out' (so campaigns skip them)
 *   3. Annotates the call_sessions row with revocation metadata
 *   4. Writes a sync_log row for audit/compliance trail
 *
 * Non-fatal: individual step failures are logged but don't abort. The DNC
 * insert is the most important — if that fails, the whole op returns !ok so
 * the caller can retry.
 */
export async function recordConsentRevocation(params: {
  workspaceId: string;
  leadId?: string | null;
  callSessionId?: string | null;
  phoneNumber: string;
  detection: RevocationDetection;
  userId?: string | null;
}): Promise<RevocationRecordResult> {
  const { workspaceId, leadId, callSessionId, phoneNumber, detection, userId } = params;
  if (!detection.revoked) {
    return { ok: false, error: "No revocation detected" };
  }

  const phoneNormalized = phoneNumber.replace(/\D/g, "");
  if (phoneNormalized.length < 10) {
    return { ok: false, error: "Invalid phone number" };
  }

  const db = getDb();
  let dncRecordId: string | undefined;

  // Step 1: DNC upsert (the most important — this is the compliance record).
  // Delegates to the unified helper: writes to `dnc_entries(phone_number)`
  // with `onConflict: "workspace_id,phone_number"`, so SMS STOP, in-call
  // verbal revocation, wrong-number, and dashboard adds all converge on the
  // same canonical row.
  try {
    const addResult = await addDncEntry({
      workspaceId,
      phone: phoneNormalized,
      reason: "consent_revoked",
      source: "in_call_verbal",
      notes: `Revocation detected: "${detection.matchedPhrase}" (kind=${detection.kind}, confidence=${detection.confidence.toFixed(2)})${callSessionId ? ` [session=${callSessionId}]` : ""}`,
      addedBy: userId ?? null,
    });

    if (!addResult.ok) {
      log("error", "consent_revocation.dnc_insert_failed", {
        workspaceId,
        error: addResult.error ?? "unknown",
      });
      return {
        ok: false,
        error: `DNC insert failed: ${addResult.error ?? "unknown"}`,
      };
    }
    dncRecordId = addResult.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "consent_revocation.dnc_unexpected", { workspaceId, error: msg });
    return { ok: false, error: msg };
  }

  // Step 2: Mark lead as opted out (best-effort)
  if (leadId) {
    try {
      await db
        .from("leads")
        .update({
          state: "OPTED_OUT",
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", leadId)
        .eq("workspace_id", workspaceId);
    } catch (err) {
      log("warn", "consent_revocation.lead_update_failed", {
        workspaceId,
        leadId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Step 3: Annotate call session (best-effort)
  if (callSessionId) {
    try {
      await db
        .from("call_sessions")
        .update({
          outcome: "revoked",
          summary:
            detection.excerpt ?? `Consent revoked: "${detection.matchedPhrase}"`,
        })
        .eq("id", callSessionId)
        .eq("workspace_id", workspaceId);
    } catch (err) {
      log("warn", "consent_revocation.session_annotate_failed", {
        workspaceId,
        callSessionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Step 4a: Regulator-grade consent audit log (Phase 13c).
  try {
    const auditWriter = createSupabaseConsentAuditWriter(db);
    const row = buildConsentAuditRow({
      workspaceId,
      leadId: leadId ?? null,
      phoneNumber: phoneNormalized,
      action: "revoke",
      channel: "voice",
      method: "in_call_verbal",
      source: "consent_revocation_detector",
      evidence: {
        type: "transcript_excerpt",
        value: {
          matched_phrase: detection.matchedPhrase,
          kind: detection.kind,
          confidence: detection.confidence,
          excerpt: detection.excerpt,
          call_session_id: callSessionId ?? null,
        },
      },
      userId: userId ?? null,
      notes: `In-call verbal revocation (confidence ${detection.confidence.toFixed(2)})`,
    });
    await auditWriter.insertConsentAudit(row);
  } catch {
    // Non-blocking — the sync_log fallback below still runs.
  }

  // Step 4: Audit log
  try {
    await db.from("sync_log").insert({
      workspace_id: workspaceId,
      provider: "voice",
      direction: "inbound",
      entity_type: "consent",
      action: "revocation_recorded",
      summary: `Consent revoked via in-call phrase "${detection.matchedPhrase}" (kind=${detection.kind})`,
      payload_snapshot: {
        phone_last4: phoneNormalized.slice(-4),
        lead_id: leadId,
        call_session_id: callSessionId,
        detection,
        dnc_record_id: dncRecordId,
      },
    });
  } catch {
    // Non-blocking — audit log is observability.
  }

  log("info", "consent_revocation.recorded", {
    workspaceId,
    leadId,
    callSessionId,
    kind: detection.kind,
    confidence: detection.confidence,
  });

  return { ok: true, dncRecordId };
}
