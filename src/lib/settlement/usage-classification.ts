/**
 * Settlement usage classification only.
 * continuity_preserved | loss_prevented | coordination_enabled | outcome_verified | continuity_scope_units
 * No subscription tiers. No plan UI. Business pays to remain inside stable operating conditions.
 */

import { getDb } from "@/lib/db/queries";
import {
  getContinuityLoadForDateRange,
  continuityLoadWeightedSum,
} from "@/lib/continuity-load";

export interface UsageClassification {
  continuity_preserved: boolean;
  loss_prevented: boolean;
  coordination_enabled: boolean;
  outcome_verified: boolean;
  continuity_scope_units: number;
}

/** Compute and store usage classification for a period. Idempotent. */
export async function computeAndStoreUsageClassification(
  workspaceId: string,
  periodStart: string,
  periodEnd: string
): Promise<UsageClassification> {
  const db = getDb();

  const { data: events } = await db
    .from("economic_events")
    .select("event_type")
    .eq("workspace_id", workspaceId)
    .gte("created_at", periodStart)
    .lt("created_at", periodEnd);
  const eventTypes = (events ?? []).map((r: { event_type: string }) => r.event_type);

  const { data: incidents } = await db
    .from("incident_statements")
    .select("category")
    .eq("workspace_id", workspaceId)
    .gte("created_at", periodStart)
    .lt("created_at", periodEnd);
  const categories = (incidents ?? []).map((r: { category: string }) => r.category);

  const { data: protocol } = await db
    .from("protocol_events")
    .select("event_type")
    .eq("workspace_id", workspaceId)
    .gte("created_at", periodStart)
    .lt("created_at", periodEnd);
  const protocolTypes = (protocol ?? []).map((r: { event_type: string }) => r.event_type);

  const continuity_preserved =
    eventTypes.includes("commitment_saved") ||
    eventTypes.includes("opportunity_recovered") ||
    categories.some((c) => c === "commitment_saved" || c === "opportunity_revived");
  const loss_prevented =
    eventTypes.includes("payment_recovered") ||
    eventTypes.includes("no_show_prevented") ||
    categories.some((c) => c === "payment_recovered" || c === "no_show_prevented");
  const outcome_verified =
    eventTypes.includes("dispute_prevented") || categories.some((c) => c === "dispute_prevented");
  const coordination_enabled =
    protocolTypes.includes("acknowledged") ||
    protocolTypes.includes("coordination_reliance_established");

  const loadCounts = await getContinuityLoadForDateRange(workspaceId, periodStart, periodEnd);
  const continuity_scope_units = continuityLoadWeightedSum(loadCounts);

  const classification: UsageClassification = {
    continuity_preserved,
    loss_prevented,
    coordination_enabled,
    outcome_verified,
    continuity_scope_units,
  };

  await db.from("settlement_usage_classification").upsert(
    {
      workspace_id: workspaceId,
      period_start: periodStart,
      period_end: periodEnd,
      ...classification,
    },
    { onConflict: "workspace_id,period_start,period_end" }
  );

  return classification;
}

/** Get stored classification for period. */
export async function getUsageClassification(
  workspaceId: string,
  periodStart: string,
  periodEnd: string
): Promise<UsageClassification | null> {
  const db = getDb();
  const { data } = await db
    .from("settlement_usage_classification")
    .select("continuity_preserved, loss_prevented, coordination_enabled, outcome_verified, continuity_scope_units")
    .eq("workspace_id", workspaceId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();
  return data as UsageClassification | null;
}
