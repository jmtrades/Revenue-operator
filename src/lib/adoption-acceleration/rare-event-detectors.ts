/**
 * Rare-event protection: high-impact low-frequency failures.
 * When detected → create incident statement (even if no automation).
 * Dedupe: same workspace + category + subject within 7 days.
 */

import { getDb } from "@/lib/db/queries";
import { createIncidentStatement } from "@/lib/incidents";
import type { IncidentCategory } from "@/lib/incidents";
import { getWorkspaceIdsWithAutomationAllowed } from "./installation-state";
import { getInstallationState } from "@/lib/installation";
import { recordObservedRiskEvent } from "@/lib/installation";

const DEDUPE_DAYS = 7;
const LONG_GAP_HOURS = 48;
const HIGH_VALUE_DELAY_HOURS = 4;
const COMPLETED_UNPAID_HOURS = 24;
const RETURNING_DROP_DAYS = 14;
const URGENT_INTENT_DELAY_HOURS = 2;
const FOLLOWTHROUGH_GAP_HOURS = 2;
const DEPOSIT_GAP_MINUTES = 30;

async function alreadyReported(
  workspaceId: string,
  category: IncidentCategory,
  subjectRef: string
): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - DEDUPE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from("incident_statements")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("category", category)
    .eq("related_external_ref", subjectRef)
    .gte("created_at", since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Long gap follow-up: customer silent after business message (e.g. quote) > 48h */
async function detectLongGapFollowUp(): Promise<void> {
  const db = getDb();
  const workspaceIds = await getWorkspaceIdsWithAutomationAllowed();
  if (!workspaceIds.size) return;

  const cutoff = new Date(Date.now() - LONG_GAP_HOURS * 60 * 60 * 1000).toISOString();

  for (const workspaceId of workspaceIds) {
    const { data: leads } = await db.from("leads").select("id").eq("workspace_id", workspaceId);
    const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
    if (!leadIds.length) continue;
    const { data: convs } = await db.from("conversations").select("id").in("lead_id", leadIds);
    const convIds = (convs ?? []).map((c: { id: string }) => c.id);
    if (!convIds.length) continue;

    for (const cid of convIds) {
      const { data: msgs } = await db
        .from("messages")
        .select("role, created_at")
        .eq("conversation_id", cid)
        .order("created_at", { ascending: false })
        .limit(1);
      const msg = (msgs ?? [])[0] as { role: string; created_at: string } | undefined;
      if (!msg) continue;
      const isBusiness = msg.role === "assistant" || msg.role === "business" || msg.role === "system";
      if (!isBusiness) continue;
      if (msg.created_at >= cutoff) continue;
      if (await alreadyReported(workspaceId, "long_gap_followup", cid)) continue;
      await createIncidentStatement(workspaceId, "long_gap_followup", cid).catch(() => {});
    }
  }
}

/** High value inquiry delay: no reply within 4h to high-intent customer message */
function looksHighIntent(content: string | null): boolean {
  if (!content || content.length < 20) return false;
  const lower = content.toLowerCase();
  return (
    lower.includes("?") ||
    /\b(interested|price|quote|buy|purchase|ready|schedule|book|how much|cost)\b/i.test(lower)
  );
}

async function detectHighValueInquiryDelay(): Promise<void> {
  const db = getDb();
  const workspaceIds = await getWorkspaceIdsWithAutomationAllowed();
  if (!workspaceIds.size) return;

  const cutoff = new Date(Date.now() - HIGH_VALUE_DELAY_HOURS * 60 * 60 * 1000).toISOString();

  for (const workspaceId of workspaceIds) {
    const { data: leads } = await db.from("leads").select("id").eq("workspace_id", workspaceId);
    const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
    if (!leadIds.length) continue;
    const { data: convs } = await db.from("conversations").select("id").in("lead_id", leadIds);
    const convIds = (convs ?? []).map((c: { id: string }) => c.id);
    if (!convIds.length) continue;

    for (const cid of convIds) {
      const { data: msgs } = await db
        .from("messages")
        .select("role, content, created_at")
        .eq("conversation_id", cid)
        .order("created_at", { ascending: false })
        .limit(2);
      const list = (msgs ?? []) as { role: string; content: string | null; created_at: string }[];
      const last = list[0];
      if (!last || last.role === "assistant" || last.role === "business") continue;
      if (last.created_at >= cutoff) continue;
      if (!looksHighIntent(last.content)) continue;
      const hasReplyAfter = list.some((m, i) => i > 0 && (m.role === "assistant" || m.role === "business"));
      if (hasReplyAfter) continue;
      if (await alreadyReported(workspaceId, "high_value_inquiry_delay", cid)) continue;
      await createIncidentStatement(workspaceId, "high_value_inquiry_delay", cid).catch(() => {});
    }
  }
}

/** Completed work unpaid: obligation overdue > 24h (e.g. job done, invoice sent, no payment) */
async function detectCompletedWorkUnpaid(): Promise<void> {
  const db = getDb();
  const workspaceIds = await getWorkspaceIdsWithAutomationAllowed();
  if (!workspaceIds.size) return;

  const cutoff = new Date(Date.now() - COMPLETED_UNPAID_HOURS * 60 * 60 * 1000).toISOString();

  const { data: obligations } = await db
    .from("payment_obligations")
    .select("workspace_id, id, subject_type, subject_id")
    .in("workspace_id", [...workspaceIds])
    .in("state", ["overdue", "recovering"])
    .lt("due_at", cutoff);

  for (const row of (obligations ?? []) as { workspace_id: string; id: string; subject_type: string; subject_id: string }[]) {
    const ref = `${row.subject_type}:${row.subject_id}`;
    if (await alreadyReported(row.workspace_id, "completed_work_unpaid", ref)) continue;
    await createIncidentStatement(row.workspace_id, "completed_work_unpaid", ref).catch(() => {});
  }
}

/** Returning customer drop: repeat customer inactive > 14 days (stalled conversation, lead had prior deal) */
async function detectReturningCustomerDrop(): Promise<void> {
  const db = getDb();
  const workspaceIds = await getWorkspaceIdsWithAutomationAllowed();
  if (!workspaceIds.size) return;

  const cutoff = new Date(Date.now() - RETURNING_DROP_DAYS * 24 * 60 * 60 * 1000).toISOString();

  for (const workspaceId of workspaceIds) {
    const { data: deals } = await db
      .from("deals")
      .select("lead_id")
      .eq("workspace_id", workspaceId)
      .in("status", ["won", "closed", "closed_won"]);
    const repeatLeadIds = [...new Set((deals ?? []).map((d: { lead_id: string }) => d.lead_id))];
    if (!repeatLeadIds.length) continue;

    const { data: opps } = await db
      .from("opportunity_states")
      .select("conversation_id, last_customer_message_at")
      .eq("workspace_id", workspaceId)
      .in("momentum_state", ["stalled", "lost"])
      .lt("last_customer_message_at", cutoff);

    for (const opp of (opps ?? []) as { conversation_id: string; last_customer_message_at: string | null }[]) {
      const { data: conv } = await db
        .from("conversations")
        .select("lead_id")
        .eq("id", opp.conversation_id)
        .maybeSingle();
      const leadId = (conv as { lead_id?: string } | null)?.lead_id;
      if (!leadId || !repeatLeadIds.includes(leadId)) continue;
      if (await alreadyReported(workspaceId, "returning_customer_drop", opp.conversation_id)) continue;
      await createIncidentStatement(workspaceId, "returning_customer_drop", opp.conversation_id).catch(() => {});
    }
  }
}

/** Silence risk urgent intent: last customer message has "today"/"now"/"asap", no business reply within 2h */
async function detectSilenceRiskUrgentIntent(): Promise<void> {
  const db = getDb();
  const workspaceIds = await getWorkspaceIdsWithAutomationAllowed();
  if (!workspaceIds.size) return;
  const cutoff = new Date(Date.now() - URGENT_INTENT_DELAY_HOURS * 60 * 60 * 1000).toISOString();

  for (const workspaceId of workspaceIds) {
    const { data: leads } = await db.from("leads").select("id").eq("workspace_id", workspaceId);
    const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
    if (!leadIds.length) continue;
    const { data: convs } = await db.from("conversations").select("id").in("lead_id", leadIds);
    const convIds = (convs ?? []).map((c: { id: string }) => c.id);
    if (!convIds.length) continue;

    for (const cid of convIds) {
      const { data: msgs } = await db
        .from("messages")
        .select("role, content, created_at")
        .eq("conversation_id", cid)
        .order("created_at", { ascending: false })
        .limit(2);
      const list = (msgs ?? []) as { role: string; content: string | null; created_at: string }[];
      const last = list[0];
      if (!last || last.role === "assistant" || last.role === "business") continue;
      const content = (last.content ?? "").toLowerCase();
      if (!content.includes("today") && !content.includes("now") && !content.includes("asap")) continue;
      if (last.created_at >= cutoff) continue;
      const hasReply = list.some((m, i) => i > 0 && (m.role === "assistant" || m.role === "business"));
      if (hasReply) continue;
      if (await alreadyReported(workspaceId, "silence_risk_urgent_intent", cid)) continue;
      const state = await getInstallationState(workspaceId);
      if (state && state.phase !== "active") {
        await recordObservedRiskEvent(workspaceId, "unresponded_conversation", "conversation", cid, cid).catch(() => {});
      }
      await createIncidentStatement(workspaceId, "silence_risk_urgent_intent", cid).catch(() => {});
    }
  }
}

/** Promise followthrough gap: business message had "send" and "details"/"quote", no follow-up within 2h */
async function detectPromiseFollowthroughGap(): Promise<void> {
  const db = getDb();
  const workspaceIds = await getWorkspaceIdsWithAutomationAllowed();
  if (!workspaceIds.size) return;
  const cutoff = new Date(Date.now() - FOLLOWTHROUGH_GAP_HOURS * 60 * 60 * 1000).toISOString();

  for (const workspaceId of workspaceIds) {
    const { data: leads } = await db.from("leads").select("id").eq("workspace_id", workspaceId);
    const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
    if (!leadIds.length) continue;
    const { data: convs } = await db.from("conversations").select("id").in("lead_id", leadIds);
    const convIds = (convs ?? []).map((c: { id: string }) => c.id);
    if (!convIds.length) continue;

    for (const cid of convIds) {
      const { data: msgs } = await db
        .from("messages")
        .select("role, content, created_at")
        .eq("conversation_id", cid)
        .order("created_at", { ascending: false })
        .limit(10);
      const list = (msgs ?? []) as { role: string; content: string | null; created_at: string }[];
      const business = list.filter((m) => m.role === "assistant" || m.role === "business");
      const lastBusiness = business[0];
      if (!lastBusiness || !lastBusiness.content) continue;
      const c = (lastBusiness.content ?? "").toLowerCase();
      if (!c.includes("send") || (!c.includes("details") && !c.includes("quote"))) continue;
      if (lastBusiness.created_at >= cutoff) continue;
      const nextBusiness = business[1];
      if (nextBusiness && nextBusiness.created_at > lastBusiness.created_at) continue;
      if (await alreadyReported(workspaceId, "promise_followthrough_gap", cid)) continue;
      const state = await getInstallationState(workspaceId);
      if (state && state.phase !== "active") {
        await recordObservedRiskEvent(workspaceId, "unresponded_conversation", "conversation", cid, cid).catch(() => {});
      }
      await createIncidentStatement(workspaceId, "promise_followthrough_gap", cid).catch(() => {});
    }
  }
}

/** Deposit gap after booking: booking commitment exists, no payment_obligation within 30 min (skip if deposit not known) */
async function detectDepositGapAfterBooking(): Promise<void> {
  const db = getDb();
  const workspaceIds = await getWorkspaceIdsWithAutomationAllowed();
  if (!workspaceIds.size) return;
  const cutoff = new Date(Date.now() - DEPOSIT_GAP_MINUTES * 60 * 1000).toISOString();

  const { data: commitments } = await db
    .from("commitments")
    .select("workspace_id, subject_id")
    .eq("subject_type", "booking")
    .lt("created_at", cutoff)
    .in("workspace_id", [...workspaceIds]);
  for (const row of (commitments ?? []) as { workspace_id: string; subject_id: string }[]) {
    const { data: obl } = await db
      .from("payment_obligations")
      .select("id")
      .eq("workspace_id", row.workspace_id)
      .eq("subject_type", "booking")
      .eq("subject_id", row.subject_id)
      .limit(1)
      .maybeSingle();
    if (obl) continue;
    const ref = `booking:${row.subject_id}`;
    if (await alreadyReported(row.workspace_id, "deposit_gap_after_booking", ref)) continue;
    const state = await getInstallationState(row.workspace_id);
    if (state && state.phase !== "active") {
      await recordObservedRiskEvent(row.workspace_id, "missed_confirmation", "booking", row.subject_id, ref).catch(() => {});
    }
    await createIncidentStatement(row.workspace_id, "deposit_gap_after_booking", ref).catch(() => {});
  }
}

/** Run all rare-event detectors. Call from cron. */
export async function runRareEventDetectors(): Promise<void> {
  await detectLongGapFollowUp();
  await detectHighValueInquiryDelay();
  await detectCompletedWorkUnpaid();
  await detectReturningCustomerDrop();
  await detectSilenceRiskUrgentIntent();
  await detectPromiseFollowthroughGap();
  await detectDepositGapAfterBooking();
}
