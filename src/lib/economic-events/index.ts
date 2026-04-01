/**
 * Economic events — record value produced by the system for billing on intervention only.
 * This table NEVER drives behavior. No pricing UI, no paywalls, no feature gating.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export type EconomicEventType =
  | "opportunity_recovered"
  | "payment_recovered"
  | "commitment_saved"
  | "dispute_prevented"
  | "no_show_prevented";

export interface RecordEconomicEventInput {
  workspaceId: string;
  eventType: EconomicEventType;
  subjectType?: string | null;
  subjectId?: string | null;
  valueAmount?: number | null;
  valueCurrency?: string | null;
}

const logEconomicEventsSideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `economic-events.${ctx}`, {
    error: e instanceof Error ? e.message : String(e),
  });
};

/**
 * Append an economic event. Call from engines only after the outcome has occurred; does not alter engine behavior.
 */
export async function recordEconomicEvent(input: RecordEconomicEventInput): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db.from("economic_events").insert({
    workspace_id: input.workspaceId,
    event_type: input.eventType,
    subject_type: input.subjectType ?? null,
    subject_id: input.subjectId ?? null,
    value_amount: input.valueAmount ?? null,
    value_currency: input.valueCurrency ?? null,
  });
  const { upsertParticipation } = await import("@/lib/economic-participation");
  await upsertParticipation(input.workspaceId, "value_generated", now).catch(logEconomicEventsSideEffect("upsert-value-generated"));
  if (input.eventType === "payment_recovered" || input.eventType === "commitment_saved") {
    await upsertParticipation(input.workspaceId, "value_protected", now).catch(logEconomicEventsSideEffect("upsert-value-protected"));
  }
  const categoryMap: Record<EconomicEventType, "commitment_saved" | "payment_recovered" | "opportunity_revived" | "dispute_prevented" | "no_show_prevented"> = {
    commitment_saved: "commitment_saved",
    payment_recovered: "payment_recovered",
    opportunity_recovered: "opportunity_revived",
    dispute_prevented: "dispute_prevented",
    no_show_prevented: "no_show_prevented",
  };
  const { createIncidentStatement } = await import("@/lib/incidents");
  await createIncidentStatement(
    input.workspaceId,
    categoryMap[input.eventType],
    input.subjectId ?? undefined
  ).catch(logEconomicEventsSideEffect("create-incident-statement"));
  const { appendNarrative } = await import("@/lib/confidence-engine");
  await appendNarrative(input.workspaceId, "outcome_resolved", "An outcome was restored.").catch(logEconomicEventsSideEffect("append-narrative"));
  const { runPostOutcomeStabilization } = await import("@/lib/ritual-cycles");
  await runPostOutcomeStabilization(input.workspaceId).catch(logEconomicEventsSideEffect("post-outcome-stabilization"));
}

/**
 * Aggregate economic_events since last ledger row and insert new ledger row.
 */
export async function aggregateEconomicValueSinceLastLedger(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date();
  const { data: last } = await db
    .from("economic_value_ledger")
    .select("period_end")
    .eq("workspace_id", workspaceId)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  const periodStart = last
    ? new Date((last as { period_end: string }).period_end)
    : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const periodEnd = now;
  const since = periodStart.toISOString();

  const { data: events } = await db
    .from("economic_events")
    .select("event_type, value_amount")
    .eq("workspace_id", workspaceId)
    .gte("created_at", since)
    .lt("created_at", periodEnd.toISOString());
  const list = (events ?? []) as { event_type: string; value_amount: number | null }[];

  let recovered_revenue = 0;
  let protected_revenue = 0;
  let prevented_loss = 0;
  for (const e of list) {
    const amount = e.value_amount ?? 0;
    if (e.event_type === "payment_recovered") recovered_revenue += Number(amount);
    else if (e.event_type === "opportunity_recovered" || e.event_type === "commitment_saved") protected_revenue += Number(amount);
    else if (e.event_type === "dispute_prevented" || e.event_type === "no_show_prevented") prevented_loss += Number(amount);
  }

  await db.from("economic_value_ledger").insert({
    workspace_id: workspaceId,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    recovered_revenue,
    protected_revenue,
    prevented_loss,
  });
}

export interface BillingExportPayload {
  recovered_revenue: number;
  protected_revenue: number;
  prevented_loss: number;
}

/**
 * Return structured billing payload for a workspace (from latest ledger). Does not send invoices or create pricing pages.
 */
export async function exportBillingEvents(workspaceId: string): Promise<BillingExportPayload> {
  const db = getDb();
  const { data: row } = await db
    .from("economic_value_ledger")
    .select("recovered_revenue, protected_revenue, prevented_loss")
    .eq("workspace_id", workspaceId)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) {
    return { recovered_revenue: 0, protected_revenue: 0, prevented_loss: 0 };
  }
  const r = row as { recovered_revenue: number; protected_revenue: number; prevented_loss: number };
  return {
    recovered_revenue: Number(r.recovered_revenue ?? 0),
    protected_revenue: Number(r.protected_revenue ?? 0),
    prevented_loss: Number(r.prevented_loss ?? 0),
  };
}

/**
 * True if any economic_events in the last 7 days for workspace. No numbers, no money displayed.
 */
export async function hasEconomicEventsInLast7Days(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("economic_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", since);
  return (count ?? 0) > 0;
}
