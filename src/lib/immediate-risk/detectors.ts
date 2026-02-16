/**
 * Detect and resolve immediate risk events. Run from cron.
 */

import { getDb } from "@/lib/db/queries";
import {
  upsertImmediateRisk,
  resolveImmediateRisk,
  recordRiskCategoryDuringObserving,
  type ImmediateRiskCategory,
} from "./index";
import { getInstallationState } from "@/lib/installation";

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * ONE_HOUR_MS;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;
const THIRTY_MIN_MS = 30 * 60 * 1000;

function isWithinBusinessHours(workspaceId: string, _db: ReturnType<typeof getDb>): Promise<boolean> {
  return Promise.resolve(true);
}

/** Commitments: scheduled within 24h and not confirmed (state not resolved). */
async function detectUnconfirmedCommitments(): Promise<void> {
  const db = getDb();
  const now = new Date();
  const in24h = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS).toISOString();
  const { data: list } = await db
    .from("commitments")
    .select("id, workspace_id, subject_type, subject_id, expected_at, state")
    .gte("expected_at", now.toISOString())
    .lte("expected_at", in24h)
    .not("state", "in", "('resolved','completed','cancelled','failed')");
  const rows = (list ?? []) as { id: string; workspace_id: string; subject_type: string; subject_id: string; expected_at: string; state: string }[];
  for (const r of rows) {
    await upsertImmediateRisk(r.workspace_id, "unconfirmed_commitment", r.id);
    const state = await getInstallationState(r.workspace_id);
    if (state?.phase === "observing") await recordRiskCategoryDuringObserving(r.workspace_id, "unconfirmed_commitment");
  }
}

/** Resolve unconfirmed_commitment when commitment is resolved or past window. */
async function resolveUnconfirmedCommitments(): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: risks } = await db
    .from("immediate_risk_events")
    .select("id, workspace_id, related_external_ref")
    .eq("category", "unconfirmed_commitment")
    .eq("resolved", false);
  for (const r of (risks ?? []) as { id: string; workspace_id: string; related_external_ref: string | null }[]) {
    if (!r.related_external_ref) continue;
    const { data: c } = await db
      .from("commitments")
      .select("state")
      .eq("id", r.related_external_ref)
      .maybeSingle();
    const state = (c as { state?: string } | null)?.state;
    if (state === "resolved" || state === "completed" || state === "cancelled" || state === "failed") {
      await resolveImmediateRisk(r.workspace_id, "unconfirmed_commitment", r.related_external_ref);
    }
  }
}

/** Opportunities: customer waiting, business silent > 1h during working hours. */
async function detectExpectedResponse(): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - ONE_HOUR_MS).toISOString();
  const { data: opps } = await db
    .from("opportunity_states")
    .select("workspace_id, conversation_id, last_customer_message_at, last_business_message_at")
    .not("last_customer_message_at", "is", null)
    .or(`last_business_message_at.is.null,last_business_message_at.lt.${cutoff}`);
  const rows = (opps ?? []) as { workspace_id: string; conversation_id: string; last_customer_message_at: string | null; last_business_message_at: string | null }[];
  for (const r of rows) {
    const customerAt = r.last_customer_message_at ? new Date(r.last_customer_message_at).getTime() : 0;
    const businessAt = r.last_business_message_at ? new Date(r.last_business_message_at).getTime() : 0;
    if (customerAt <= businessAt) continue;
    if (Date.now() - customerAt < ONE_HOUR_MS) continue;
    const inHours = await isWithinBusinessHours(r.workspace_id, db);
    if (!inHours) continue;
    await upsertImmediateRisk(r.workspace_id, "expected_response", r.conversation_id);
    const state = await getInstallationState(r.workspace_id);
    if (state?.phase === "observing") await recordRiskCategoryDuringObserving(r.workspace_id, "expected_response");
  }
}

async function resolveExpectedResponse(): Promise<void> {
  const db = getDb();
  const { data: risks } = await db
    .from("immediate_risk_events")
    .select("workspace_id, related_external_ref")
    .eq("category", "expected_response")
    .eq("resolved", false);
  for (const r of (risks ?? []) as { workspace_id: string; related_external_ref: string | null }[]) {
    if (!r.related_external_ref) continue;
    const { data: opp } = await db
      .from("opportunity_states")
      .select("last_customer_message_at, last_business_message_at")
      .eq("conversation_id", r.related_external_ref)
      .maybeSingle();
    const o = opp as { last_customer_message_at?: string | null; last_business_message_at?: string | null } | null;
    if (!o?.last_customer_message_at || !o?.last_business_message_at) continue;
    if (o.last_business_message_at > o.last_customer_message_at) {
      await resolveImmediateRisk(r.workspace_id, "expected_response", r.related_external_ref);
    }
  }
}

/** Payments: due today and unpaid. */
async function detectUnpaidDue(): Promise<void> {
  const db = getDb();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const { data: list } = await db
    .from("payment_obligations")
    .select("id, workspace_id, subject_type, subject_id")
    .gte("due_at", startOfToday)
    .lt("due_at", endOfToday)
    .neq("state", "resolved");
  const rows = (list ?? []) as { id: string; workspace_id: string; subject_type: string; subject_id: string }[];
  for (const r of rows) {
    const ref = `${r.subject_type}:${r.subject_id}`;
    await upsertImmediateRisk(r.workspace_id, "unpaid_due", ref);
    const state = await getInstallationState(r.workspace_id);
    if (state?.phase === "observing") await recordRiskCategoryDuringObserving(r.workspace_id, "unpaid_due");
  }
}

async function resolveUnpaidDue(): Promise<void> {
  const db = getDb();
  const { data: risks } = await db
    .from("immediate_risk_events")
    .select("workspace_id, related_external_ref")
    .eq("category", "unpaid_due")
    .eq("resolved", false);
  for (const r of (risks ?? []) as { workspace_id: string; related_external_ref: string | null }[]) {
    if (!r.related_external_ref) continue;
    const [subjectType, subjectId] = r.related_external_ref.split(":");
    const { data: obl } = await db
      .from("payment_obligations")
      .select("state")
      .eq("workspace_id", r.workspace_id)
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if ((obl as { state?: string } | null)?.state === "resolved") {
      await resolveImmediateRisk(r.workspace_id, "unpaid_due", r.related_external_ref);
    }
  }
}

/** Promises: business message contains send/share/prepare/confirm, no follow-through in 2h. */
async function detectPromisedFollowup(): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - TWO_HOURS_MS).toISOString();
  const { data: convs } = await db.from("conversations").select("id, lead_id");
  const list = (convs ?? []) as { id: string; lead_id: string }[];
  const promiseLike = /(\bsend\b|\bshare\b|\bprepare\b|\bconfirm\b)/i;
  for (const conv of list) {
    const { data: lastBiz } = await db
      .from("messages")
      .select("id, content, created_at")
      .eq("conversation_id", conv.id)
      .in("role", ["assistant", "business"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lastBiz) continue;
    const m = lastBiz as { content: string | null; created_at: string };
    if (!m.content || !promiseLike.test(m.content)) continue;
    if (m.created_at >= cutoff) continue;
    const { data: later } = await db
      .from("messages")
      .select("id")
      .eq("conversation_id", conv.id)
      .in("role", ["assistant", "business"])
      .gt("created_at", m.created_at)
      .limit(1)
      .maybeSingle();
    if (later) continue;
    const { data: lead } = await db.from("leads").select("workspace_id").eq("id", conv.lead_id).single();
    if (!lead) continue;
    const workspaceId = (lead as { workspace_id: string }).workspace_id;
    await upsertImmediateRisk(workspaceId, "promised_followup", conv.id);
    const state = await getInstallationState(workspaceId);
    if (state?.phase === "observing") await recordRiskCategoryDuringObserving(workspaceId, "promised_followup");
  }
}

async function resolvePromisedFollowup(): Promise<void> {
  const db = getDb();
  const { data: risks } = await db
    .from("immediate_risk_events")
    .select("workspace_id, related_external_ref, detected_at")
    .eq("category", "promised_followup")
    .eq("resolved", false);
  for (const r of (risks ?? []) as { workspace_id: string; related_external_ref: string | null; detected_at: string }[]) {
    if (!r.related_external_ref) continue;
    const afterDetected = r.detected_at;
    const { data: later } = await db
      .from("messages")
      .select("id")
      .eq("conversation_id", r.related_external_ref)
      .in("role", ["assistant", "business"])
      .gt("created_at", afterDetected)
      .limit(1)
      .maybeSingle();
    if (later) {
      await resolveImmediateRisk(r.workspace_id, "promised_followup", r.related_external_ref);
    }
  }
}

/** Bookings: upcoming booking without payment obligation within 30 min. */
async function detectDepositMissing(): Promise<void> {
  const db = getDb();
  const now = new Date();
  const createdCutoff = new Date(now.getTime() - THIRTY_MIN_MS).toISOString();
  const { data: commitments } = await db
    .from("commitments")
    .select("id, workspace_id, subject_id")
    .eq("subject_type", "booking")
    .gte("created_at", createdCutoff);
  const rows = (commitments ?? []) as { id: string; workspace_id: string; subject_id: string }[];
  for (const r of rows) {
    const { data: obl } = await db
      .from("payment_obligations")
      .select("id")
      .eq("workspace_id", r.workspace_id)
      .eq("subject_type", "booking")
      .eq("subject_id", r.subject_id)
      .limit(1)
      .maybeSingle();
    if (obl) continue;
    const ref = `booking:${r.subject_id}`;
    await upsertImmediateRisk(r.workspace_id, "deposit_missing", ref);
    const state = await getInstallationState(r.workspace_id);
    if (state?.phase === "observing") await recordRiskCategoryDuringObserving(r.workspace_id, "deposit_missing");
  }
}

async function resolveDepositMissing(): Promise<void> {
  const db = getDb();
  const { data: risks } = await db
    .from("immediate_risk_events")
    .select("workspace_id, related_external_ref")
    .eq("category", "deposit_missing")
    .eq("resolved", false);
  for (const r of (risks ?? []) as { workspace_id: string; related_external_ref: string | null }[]) {
    if (!r.related_external_ref) continue;
    const parts = r.related_external_ref.split(":");
    const subjectId = parts[1];
    const { data: obl } = await db
      .from("payment_obligations")
      .select("id")
      .eq("workspace_id", r.workspace_id)
      .eq("subject_type", "booking")
      .eq("subject_id", subjectId)
      .limit(1)
      .maybeSingle();
    if (obl) {
      await resolveImmediateRisk(r.workspace_id, "deposit_missing", r.related_external_ref);
    }
  }
}

/** Mark expired risks resolved (risk_window_end_at < now). */
async function resolveExpiredRisks(): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db.from("immediate_risk_events").update({ resolved: true }).eq("resolved", false).lt("risk_window_end_at", now);
}

export async function runImmediateRiskDetectors(): Promise<void> {
  await detectUnconfirmedCommitments();
  await detectExpectedResponse();
  await detectUnpaidDue();
  await detectPromisedFollowup();
  await detectDepositMissing();
}

export async function runImmediateRiskResolvers(): Promise<void> {
  await resolveUnconfirmedCommitments();
  await resolveExpectedResponse();
  await resolveUnpaidDue();
  await resolvePromisedFollowup();
  await resolveDepositMissing();
  await resolveExpiredRisks();
}
