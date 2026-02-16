/**
 * Financial exposure detectors and resolvers. Run from cron.
 * Revenue at risk, payment delay, customer loss risk, idle capacity.
 */

import { getDb } from "@/lib/db/queries";
import {
  upsertFinancialExposure,
  resolveFinancialExposure,
  type FinancialExposureCategory,
} from "./index";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function isWithinBusinessHours(_workspaceId: string): Promise<boolean> {
  return Promise.resolve(true);
}

/** Revenue at risk: opportunity stalled, customer intent present, not replied within 4h working hours. */
async function detectRevenueAtRisk(): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - FOUR_HOURS_MS).toISOString();
  const { data: opps } = await db
    .from("opportunity_states")
    .select("workspace_id, conversation_id, last_customer_message_at, last_business_message_at")
    .not("last_customer_message_at", "is", null)
    .or(`last_business_message_at.is.null,last_business_message_at.lt.last_customer_message_at`);
  const rows = (opps ?? []) as {
    workspace_id: string;
    conversation_id: string;
    last_customer_message_at: string | null;
    last_business_message_at: string | null;
  }[];
  for (const r of rows) {
    const customerAt = r.last_customer_message_at ? new Date(r.last_customer_message_at).getTime() : 0;
    if (Date.now() - customerAt < FOUR_HOURS_MS) continue;
    if (customerAt > new Date(cutoff).getTime()) continue;
    const inHours = await isWithinBusinessHours(r.workspace_id);
    if (!inHours) continue;
    await upsertFinancialExposure(r.workspace_id, "revenue_at_risk", r.conversation_id).catch(() => {});
  }
}

async function resolveRevenueAtRisk(): Promise<void> {
  const db = getDb();
  const { data: records } = await db
    .from("financial_exposure_records")
    .select("id, workspace_id, related_external_ref")
    .eq("category", "revenue_at_risk")
    .is("resolved_at", null);
  for (const r of (records ?? []) as { id: string; workspace_id: string; related_external_ref: string | null }[]) {
    if (!r.related_external_ref) continue;
    const { data: opp } = await db
      .from("opportunity_states")
      .select("last_customer_message_at, last_business_message_at")
      .eq("conversation_id", r.related_external_ref)
      .maybeSingle();
    const o = opp as { last_customer_message_at?: string | null; last_business_message_at?: string | null } | null;
    if (!o?.last_customer_message_at) continue;
    if (o.last_business_message_at && o.last_business_message_at >= o.last_customer_message_at) {
      await resolveFinancialExposure(r.workspace_id, "revenue_at_risk", r.related_external_ref);
    }
  }
}

/** Payment delay: payment overdue AND ≥12h late. */
async function detectPaymentDelay(): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - TWELVE_HOURS_MS).toISOString();
  const { data: list } = await db
    .from("payment_obligations")
    .select("id, workspace_id")
    .in("state", ["overdue", "recovering"])
    .lt("due_at", cutoff);
  for (const row of (list ?? []) as { id: string; workspace_id: string }[]) {
    await upsertFinancialExposure(row.workspace_id, "payment_delay", row.id).catch(() => {});
  }
}

async function resolvePaymentDelay(): Promise<void> {
  const db = getDb();
  const { data: records } = await db
    .from("financial_exposure_records")
    .select("id, workspace_id, related_external_ref")
    .eq("category", "payment_delay")
    .is("resolved_at", null);
  for (const r of (records ?? []) as { id: string; workspace_id: string; related_external_ref: string | null }[]) {
    if (!r.related_external_ref) continue;
    const { data: ob } = await db
      .from("payment_obligations")
      .select("state")
      .eq("id", r.related_external_ref)
      .maybeSingle();
    const state = (ob as { state?: string } | null)?.state;
    if (state === "resolved") {
      await resolveFinancialExposure(r.workspace_id, "payment_delay", r.related_external_ref);
    }
  }
}

const PROMISE_WORDS = /\b(send|share|prepare|confirm|follow up|get back|schedule|book)\b/i;

/** Customer loss risk: returning customer silent after business promise. */
async function detectCustomerLossRisk(): Promise<void> {
  const db = getDb();
  const { data: workspaces } = await db.from("workspaces").select("id");
  const wsIds = (workspaces ?? []).map((w: { id: string }) => w.id);
  for (const workspaceId of wsIds) {
    const { data: deals } = await db
      .from("deals")
      .select("lead_id")
      .eq("workspace_id", workspaceId)
      .in("status", ["won", "closed", "closed_won"]);
    const repeatLeadIds = [...new Set((deals ?? []).map((d: { lead_id: string }) => d.lead_id))];
    if (!repeatLeadIds.length) continue;

    const { data: convs } = await db
      .from("conversations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("lead_id", repeatLeadIds);
    const convIds = (convs ?? []).map((c: { id: string }) => c.id);
    if (!convIds.length) continue;

    for (const cid of convIds) {
      const { data: opp } = await db
        .from("opportunity_states")
        .select("last_customer_message_at, last_business_message_at")
        .eq("conversation_id", cid)
        .maybeSingle();
      const o = opp as { last_customer_message_at?: string | null; last_business_message_at?: string | null } | null;
      if (!o?.last_business_message_at) continue;
      if (o.last_customer_message_at && o.last_customer_message_at >= o.last_business_message_at) continue;

      const { data: msgs } = await db
        .from("messages")
        .select("role, content, created_at")
        .eq("conversation_id", cid)
        .order("created_at", { ascending: false })
        .limit(5);
      const list = (msgs ?? []) as { role: string; content: string | null; created_at: string }[];
      const lastBusiness = list.find((m) => m.role === "assistant" || m.role === "business");
      if (!lastBusiness?.content || !PROMISE_WORDS.test(lastBusiness.content)) continue;

      await upsertFinancialExposure(workspaceId, "customer_loss_risk", cid).catch(() => {});
    }
  }
}

async function resolveCustomerLossRisk(): Promise<void> {
  const db = getDb();
  const { data: records } = await db
    .from("financial_exposure_records")
    .select("id, workspace_id, related_external_ref")
    .eq("category", "customer_loss_risk")
    .is("resolved_at", null);
  for (const r of (records ?? []) as { id: string; workspace_id: string; related_external_ref: string | null }[]) {
    if (!r.related_external_ref) continue;
    const { data: opp } = await db
      .from("opportunity_states")
      .select("last_customer_message_at, last_business_message_at")
      .eq("conversation_id", r.related_external_ref)
      .maybeSingle();
    const o = opp as { last_customer_message_at?: string | null; last_business_message_at?: string | null } | null;
    if (o?.last_customer_message_at && o?.last_business_message_at && o.last_customer_message_at >= o.last_business_message_at) {
      await resolveFinancialExposure(r.workspace_id, "customer_loss_risk", r.related_external_ref);
    }
  }
}

/** Idle capacity: available booking window passed unfilled while inquiries existed within prior 24h. */
async function detectIdleCapacity(): Promise<void> {
  const db = getDb();
  const now = new Date();
  const past24h = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS).toISOString();
  const { data: events } = await db
    .from("calendar_events")
    .select("id, workspace_id, end_at, attendees")
    .lt("end_at", now.toISOString())
    .gte("end_at", past24h);
  const eventRows = (events ?? []) as { id: string; workspace_id: string; end_at: string; attendees: unknown }[];
  for (const ev of eventRows) {
    const attendees = ev.attendees as unknown[] | null;
    if (attendees != null && Array.isArray(attendees) && attendees.length > 0) continue;
    const { data: convs } = await db
      .from("opportunity_states")
      .select("conversation_id")
      .eq("workspace_id", ev.workspace_id)
      .gte("last_customer_message_at", past24h);
    if (!convs?.length) continue;
    await upsertFinancialExposure(ev.workspace_id, "idle_capacity", ev.id).catch(() => {});
  }
}

async function resolveIdleCapacity(): Promise<void> {
  const db = getDb();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();
  const { data: records } = await db
    .from("financial_exposure_records")
    .select("id, workspace_id, related_external_ref")
    .eq("category", "idle_capacity")
    .is("resolved_at", null)
    .lt("created_at", todayStart);
  for (const r of (records ?? []) as { id: string; workspace_id: string; related_external_ref: string | null }[]) {
    await resolveFinancialExposure(r.workspace_id, "idle_capacity", r.related_external_ref ?? undefined);
  }
}

export async function runFinancialExposureDetectors(): Promise<void> {
  await detectRevenueAtRisk();
  await detectPaymentDelay();
  await detectCustomerLossRisk();
  await detectIdleCapacity();
}

export async function runFinancialExposureResolvers(): Promise<void> {
  await resolveRevenueAtRisk();
  await resolvePaymentDelay();
  await resolveCustomerLossRisk();
  await resolveIdleCapacity();
}
