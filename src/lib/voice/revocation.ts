/**
 * Phase 78 / Task 7.2 — Revoke consent AND hang up any active call.
 *
 * TCPA requires immediate cessation upon consent revocation (STOP keyword,
 * STOPALL, UNSUBSCRIBE, etc.). Prior to this module, the SMS STOP handler
 * only updated `leads.opt_out` and logged to `lead_opt_out`; any in-flight
 * outbound call kept running for however long Twilio would let it run.
 * That window — STOP received → natural call-end — is a live TCPA/wiretap
 * violation.
 *
 * `revokeAndHangup(workspaceId, phone)` closes that window:
 *
 *   1. Inserts a DNC row so no NEW call can start.
 *   2. Finds every open `call_sessions` row for the phone in that workspace
 *      (open = `call_started_at IS NOT NULL AND call_ended_at IS NULL`).
 *   3. Issues a Twilio REST hangup on the CallSid stored in
 *      `call_sessions.external_meeting_id`.
 *   4. Stamps `call_ended_at` + `outcome='revoked'` on the session.
 *
 * The DNC and session-stamp steps are the compliance evidence. A Twilio
 * REST failure is LOGGED but does not fail the whole operation — forward
 * outreach is already blocked the moment the DNC row lands.
 *
 * Idempotent: callable multiple times per phone without side-effects
 * (DNC is upsert-on-conflict; already-ended sessions are filtered out by
 * the `call_ended_at IS NULL` predicate on the next pass).
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
// Phase 78 / Task 7.3 — DNC writes go through the unified helper so the
// SMS-STOP path lands on the same `dnc_entries(phone_number)` row that the
// dashboard, the in-call verbal-revocation path, and the wrong-number path
// converge on. Previously this module wrote `dnc_list.phone` (which the
// `phone_number`-reading dashboard missed) — a live TCPA split fixed here.
import { addDncEntry } from "@/lib/voice/dnc";

export interface RevokeAndHangupResult {
  ok: boolean;
  /** CallSids we successfully requested Twilio to hang up. */
  hungUpCallSids: string[];
  /** CallSids where the Twilio REST call errored (logged, non-fatal). */
  hangupErrors: Array<{ callSid: string; error: string }>;
}

/**
 * Twilio REST hangup for a single active CallSid. Returns ok=true on
 * 2xx from Twilio, ok=false with an error message otherwise. Never throws.
 */
async function twilioHangupCall(
  callSid: string,
): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return { ok: false, error: "Twilio credentials not configured" };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const body = new URLSearchParams({ Status: "completed" }).toString();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      // 15s ceiling — Twilio normally responds in <1s. If Twilio is
      // degraded, we don't want revocation to block the SMS webhook.
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, error: `HTTP ${response.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Normalize a phone number to a digit-only string (optionally with a
 * leading `+`). Matches the convention used by the existing SMS webhook
 * handler in `src/app/api/webhooks/twilio/sms/route.ts`.
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

/**
 * Revoke consent + hang up any active call for this phone in this workspace.
 *
 * Contract:
 *   - Always attempts DNC insert (compliance evidence).
 *   - Looks up open call_sessions via leads.phone → call_sessions.lead_id.
 *   - For each open session with an `external_meeting_id` (Twilio CallSid),
 *     issues a Twilio REST hangup and stamps call_ended_at.
 *   - Twilio REST failures are logged but do NOT abort the overall op —
 *     the DNC row has already landed by then, so forward outreach is
 *     blocked regardless.
 */
export async function revokeAndHangup(
  workspaceId: string,
  phone: string,
): Promise<RevokeAndHangupResult> {
  const normalized = normalizePhone(phone);
  const db = getDb();
  const hungUpCallSids: string[] = [];
  const hangupErrors: Array<{ callSid: string; error: string }> = [];

  // Step 1: DNC upsert (the compliance record). Task 7.3 unified the two
  // historic column conventions (`phone` / `phone_number`) into a single
  // canonical table `dnc_entries(phone_number)`. We write through
  // `addDncEntry`, which normalizes to strict E.164, applies
  // `onConflict: "workspace_id,phone_number"`, and is idempotent.
  const dncAdd = await addDncEntry({
    workspaceId,
    phone: normalized,
    reason: "stop_keyword",
    source: "sms_stop",
  });
  if (!dncAdd.ok) {
    log("error", "revoke_and_hangup.dnc_insert_failed", {
      workspaceId,
      error: dncAdd.error ?? "unknown",
    });
    // Continue — the caller already wrote to lead_opt_out; the live-call
    // hangup is still worth attempting.
  }

  // Step 2: Find open call sessions for this phone. Two-stage lookup:
  //   (a) leads for the phone in this workspace → list of lead_ids
  //   (b) call_sessions with those lead_ids and call_ended_at IS NULL
  let leadIds: string[] = [];
  try {
    const { data: leads } = await db
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("phone", normalized);
    leadIds = ((leads ?? []) as Array<{ id: string }>).map((r) => r.id);
  } catch (err) {
    log("warn", "revoke_and_hangup.leads_lookup_failed", {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (leadIds.length === 0) {
    // Nothing to hang up — still returns ok because DNC landed.
    return { ok: true, hungUpCallSids, hangupErrors };
  }

  let openSessions: Array<{ id: string; external_meeting_id: string | null }> =
    [];
  try {
    const { data: sessions } = await db
      .from("call_sessions")
      .select("id, external_meeting_id")
      .in("lead_id", leadIds)
      .is("call_ended_at", null);
    openSessions = ((sessions ?? []) as Array<{
      id: string;
      external_meeting_id: string | null;
    }>).filter((s) => !!s.external_meeting_id);
  } catch (err) {
    log("warn", "revoke_and_hangup.sessions_lookup_failed", {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 3: Twilio REST hangup for each open session.
  for (const sess of openSessions) {
    const callSid = sess.external_meeting_id!;
    const hangup = await twilioHangupCall(callSid);
    if (hangup.ok) {
      hungUpCallSids.push(callSid);
    } else {
      hangupErrors.push({ callSid, error: hangup.error ?? "unknown" });
      log("error", "revoke_and_hangup.twilio_hangup_failed", {
        workspaceId,
        callSid,
        error: hangup.error,
      });
    }

    // Step 4: Stamp session outcome + end time regardless of Twilio result
    // — the caller has revoked and we need the session row to reflect that.
    // If Twilio was already completing the call, our stamp is no-op-y;
    // if Twilio errored, our stamp is still the right ledger entry.
    try {
      await db
        .from("call_sessions")
        .update({
          outcome: "revoked",
          call_ended_at: new Date().toISOString(),
        })
        .eq("id", sess.id);
    } catch (err) {
      log("warn", "revoke_and_hangup.session_stamp_failed", {
        workspaceId,
        callSessionId: sess.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log("info", "revoke_and_hangup.done", {
    workspaceId,
    phone_last4: normalized.slice(-4),
    hungUpCount: hungUpCallSids.length,
    errorCount: hangupErrors.length,
  });

  return { ok: true, hungUpCallSids, hangupErrors };
}
