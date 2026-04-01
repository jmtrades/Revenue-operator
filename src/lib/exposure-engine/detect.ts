/**
 * Deterministic exposure detectors. Bounded per workspace. No side effects except upsertExposure.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { upsertExposure } from "./record";

const logExposureDetectSideEffect = (context: string) => (e: unknown) => {
  log("warn", `exposure_engine.detect.${context}`, { error: e instanceof Error ? e.message : String(e) });
};

const DETECT_LIMIT = 200;
const REPLY_DELAY_HOURS = 2;
const COMMITMENT_UNCERTAIN_HOURS = 12;

export async function detectReplyDelayRisk(workspaceId: string, now: Date): Promise<void> {
  const db = getDb();
  const cutoff = new Date(now.getTime() - REPLY_DELAY_HOURS * 60 * 60 * 1000).toISOString();

  const { data: rows } = await db
    .from("opportunity_states")
    .select("conversation_id, last_customer_message_at, last_business_message_at")
    .eq("workspace_id", workspaceId)
    .in("momentum_state", ["slowing", "stalled"])
    .eq("authority_required", false)
    .not("last_customer_message_at", "is", null)
    .lt("last_customer_message_at", cutoff)
    .limit(DETECT_LIMIT);

  for (const r of rows ?? []) {
    const row = r as { conversation_id: string; last_customer_message_at: string; last_business_message_at: string | null };
    const noBusinessReply =
      row.last_business_message_at == null ||
      new Date(row.last_business_message_at) < new Date(row.last_customer_message_at);
    if (!noBusinessReply) continue;
    await upsertExposure(workspaceId, "reply_delay_risk", "conversation", row.conversation_id, null, now).catch(logExposureDetectSideEffect("upsert_reply_delay"));
  }
}

export async function detectAttendanceUncertaintyRisk(workspaceId: string, now: Date): Promise<void> {
  const db = getDb();

  const { data: rows } = await db
    .from("commitments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("subject_type", "booking")
    .in("state", ["awaiting_response", "overdue", "recovery_required"])
    .eq("authority_required", false)
    .limit(DETECT_LIMIT);

  for (const r of rows ?? []) {
    const row = r as { id: string };
    await upsertExposure(workspaceId, "attendance_uncertainty_risk", "commitment", row.id, null, now).catch(logExposureDetectSideEffect("upsert_attendance"));
  }
}

export async function detectPaymentStallRisk(workspaceId: string, now: Date): Promise<void> {
  const db = getDb();

  const { data: rows } = await db
    .from("payment_obligations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("state", ["overdue", "recovering"])
    .eq("authority_required", false)
    .limit(DETECT_LIMIT);

  for (const r of rows ?? []) {
    const row = r as { id: string };
    await upsertExposure(workspaceId, "payment_stall_risk", "payment_obligation", row.id, null, now).catch(logExposureDetectSideEffect("upsert_payment_stall"));
  }
}

export async function detectCounterpartyUnconfirmedRisk(workspaceId: string, now: Date): Promise<void> {
  const db = getDb();

  const { data: rows } = await db
    .from("shared_transactions")
    .select("id, external_ref")
    .eq("workspace_id", workspaceId)
    .eq("state", "pending_acknowledgement")
    .eq("authority_required", false)
    .limit(DETECT_LIMIT);

  for (const r of rows ?? []) {
    const row = r as { id: string; external_ref?: string };
    await upsertExposure(
      workspaceId,
      "counterparty_unconfirmed_risk",
      "shared_transaction",
      row.id,
      row.external_ref ?? null,
      now
    ).catch(logExposureDetectSideEffect("upsert_counterparty"));
  }
}

export async function detectCommitmentOutcomeUncertain(workspaceId: string, now: Date): Promise<void> {
  const db = getDb();
  const cutoff = new Date(now.getTime() - COMMITMENT_UNCERTAIN_HOURS * 60 * 60 * 1000).toISOString();

  const { data: rows } = await db
    .from("commitments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("state", ["overdue", "recovery_required"])
    .eq("authority_required", false)
    .lt("expected_at", cutoff)
    .limit(DETECT_LIMIT);

  for (const r of rows ?? []) {
    const row = r as { id: string };
    await upsertExposure(workspaceId, "commitment_outcome_uncertain", "commitment", row.id, null, now).catch(logExposureDetectSideEffect("upsert_outcome_uncertain"));
  }
}
