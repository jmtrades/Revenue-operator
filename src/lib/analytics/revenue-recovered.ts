/**
 * Revenue recovery analytics
 * Calculates revenue recovered from:
 * - Unanswered calls that were subsequently answered (follow-up)
 * - No-shows that were recovered (rescheduled and completed)
 * - Dormant/reactivated contacts that booked appointments
 *
 * Uses real deal values when available from the deals table,
 * falls back to workspace-configured average deal value,
 * then to a default estimate if nothing is configured.
 */

import { getDb } from "@/lib/db/queries";

export type RevenueRecoveredBreakdown = {
  calls_recovered_revenue: number; // cents: unanswered calls → answered calls
  calls_recovered_count: number;
  noshow_recovered_revenue: number; // cents: no-shows → confirmed appointments
  noshow_recovered_count: number;
  reactivation_revenue: number; // cents: dormant contacts → new appointments
  reactivation_count: number;
  total_revenue_recovered: number; // cents: sum of above
  attribution_method: "deal_values" | "workspace_average" | "estimate";
};

/** Default estimated value per recovered interaction (cents) when no deal data exists */
const DEFAULT_RECOVERY_VALUE_CENTS = 75000; // $750

/**
 * Get the average deal value for a workspace. First checks deals table for real data,
 * then workspace config for custom average, then uses default estimate.
 */
async function getRecoveryValueCents(
  workspaceId: string
): Promise<{ valueCents: number; method: "deal_values" | "workspace_average" | "estimate" }> {
  const db = getDb();

  // Try to compute from real closed deals
  try {
    const { data: wonDeals } = await db
      .from("deals")
      .select("value_cents")
      .eq("workspace_id", workspaceId)
      .eq("status", "won")
      .not("value_cents", "is", null)
      .limit(100);

    const deals = (wonDeals ?? []) as Array<{ value_cents: number }>;
    if (deals.length >= 3) {
      const totalCents = deals.reduce((sum, d) => sum + (Number(d.value_cents) || 0), 0);
      const avgCents = Math.round(totalCents / deals.length);
      if (avgCents > 0) {
        // Recovery value = 50% of average deal (not all recovered leads close)
        return { valueCents: Math.round(avgCents * 0.5), method: "deal_values" };
      }
    }
  } catch {
    // deals table may not exist
  }

  // Check workspace business context for configured average deal value
  try {
    const { data: ctx } = await db
      .from("workspace_business_context")
      .select("avg_deal_value_cents")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const avgDeal = (ctx as { avg_deal_value_cents?: number } | null)?.avg_deal_value_cents;
    if (avgDeal && avgDeal > 0) {
      return { valueCents: Math.round(avgDeal * 0.5), method: "workspace_average" };
    }
  } catch {
    // column may not exist
  }

  return { valueCents: DEFAULT_RECOVERY_VALUE_CENTS, method: "estimate" };
}

/**
 * Try to get real deal values for specific leads, returning the sum.
 * Falls back to count * estimatedValue if no deals found.
 */
async function getLeadRevenue(
  workspaceId: string,
  leadIds: string[],
  fallbackValueCents: number
): Promise<number> {
  if (leadIds.length === 0) return 0;
  const db = getDb();

  try {
    const { data: deals } = await db
      .from("deals")
      .select("value_cents, lead_id")
      .eq("workspace_id", workspaceId)
      .in("lead_id", leadIds)
      .in("status", ["won", "open", "booked"])
      .not("value_cents", "is", null);

    const dealRows = (deals ?? []) as Array<{ value_cents: number; lead_id: string }>;
    if (dealRows.length > 0) {
      const realRevenue = dealRows.reduce((sum, d) => sum + (Number(d.value_cents) || 0), 0);
      // For leads with deals, use real values. For leads without, use fallback.
      const leadsWithDeals = new Set(dealRows.map((d) => d.lead_id));
      const leadsWithoutDeals = leadIds.filter((id) => !leadsWithDeals.has(id));
      return realRevenue + (leadsWithoutDeals.length * fallbackValueCents);
    }
  } catch {
    // deals table may not exist
  }

  return leadIds.length * fallbackValueCents;
}

/**
 * Get revenue recovered for a workspace within a date range.
 * Uses real deal values when available, workspace averages as fallback.
 */
export async function getRevenueRecovered(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<RevenueRecoveredBreakdown> {
  const db = getDb();

  const startTs = `${startDate}T00:00:00Z`;
  const endTs = `${endDate}T23:59:59Z`;

  const { valueCents, method } = await getRecoveryValueCents(workspaceId);

  // 1. Unanswered calls recovered: Find unanswered calls where the same lead later had a completed call
  const { data: missedCalls } = await db
    .from("call_sessions")
    .select("id, lead_id, call_started_at")
    .eq("workspace_id", workspaceId)
    .in("outcome", ["no_answer", "voicemail"])
    .gte("call_started_at", startTs)
    .lt("call_started_at", endTs);

  let calls_recovered_revenue = 0;
  let calls_recovered_count = 0;
  if (missedCalls && missedCalls.length > 0) {
    const missedLeadIds = [...new Set(
      (missedCalls as Array<{ id: string; lead_id: string; call_started_at: string }>)
        .map((c) => c.lead_id)
        .filter(Boolean)
    )];

    if (missedLeadIds.length > 0) {
      const { data: recoveredCalls } = await db
        .from("call_sessions")
        .select("lead_id")
        .eq("workspace_id", workspaceId)
        .in("lead_id", missedLeadIds)
        .not("call_ended_at", "is", null)
        .gte("call_started_at", startTs)
        .lt("call_started_at", endTs);

      const recoveredLeadIds = [...new Set(
        ((recoveredCalls ?? []) as Array<{ lead_id: string }>).map((c) => c.lead_id)
      )];
      calls_recovered_count = recoveredLeadIds.length;
      calls_recovered_revenue = await getLeadRevenue(workspaceId, recoveredLeadIds, valueCents);
    }
  }

  // 2. No-show recovered: Find no_shows converted to confirmed appointments
  const { data: noShowAppointments } = await db
    .from("appointments")
    .select("id, lead_id, created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "no_show")
    .gte("created_at", startTs)
    .lt("created_at", endTs);

  let noshow_recovered_revenue = 0;
  let noshow_recovered_count = 0;
  if (noShowAppointments && noShowAppointments.length > 0) {
    const noShowLeadIds = [...new Set(
      (noShowAppointments as Array<{ id: string; lead_id: string; created_at: string }>)
        .map((a) => a.lead_id)
        .filter(Boolean)
    )];

    if (noShowLeadIds.length > 0) {
      const { data: recoveredAppointments } = await db
        .from("appointments")
        .select("lead_id")
        .eq("workspace_id", workspaceId)
        .in("lead_id", noShowLeadIds)
        .eq("status", "confirmed")
        .gte("created_at", startTs)
        .lt("created_at", endTs);

      const recoveredLeadIds = [...new Set(
        ((recoveredAppointments ?? []) as Array<{ lead_id: string }>).map((a) => a.lead_id)
      )];
      noshow_recovered_count = recoveredLeadIds.length;
      noshow_recovered_revenue = await getLeadRevenue(workspaceId, recoveredLeadIds, valueCents);
    }
  }

  // 3. Reactivation revenue: dormant leads that booked new appointments
  let reactivation_revenue = 0;
  let reactivation_count = 0;
  try {
    const { data: reactivatedLeads } = await db
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("state", ["REACTIVATE", "ENGAGED", "QUALIFIED", "BOOKED"]);

    if (reactivatedLeads && reactivatedLeads.length > 0) {
      const reactivatedLeadIds = (reactivatedLeads as Array<{ id: string }>).map((l) => l.id);

      const { data: reactivatedAppointments } = await db
        .from("appointments")
        .select("lead_id")
        .eq("workspace_id", workspaceId)
        .in("lead_id", reactivatedLeadIds)
        .in("status", ["confirmed", "completed"])
        .gte("created_at", startTs)
        .lt("created_at", endTs);

      const recoveredLeadIds = [...new Set(
        ((reactivatedAppointments ?? []) as Array<{ lead_id: string }>).map((a) => a.lead_id)
      )];
      reactivation_count = recoveredLeadIds.length;
      reactivation_revenue = await getLeadRevenue(workspaceId, recoveredLeadIds, valueCents);
    }
  } catch {
    // table may not exist
  }

  const total_revenue_recovered = calls_recovered_revenue + noshow_recovered_revenue + reactivation_revenue;

  return {
    calls_recovered_revenue,
    calls_recovered_count,
    noshow_recovered_revenue,
    noshow_recovered_count,
    reactivation_revenue,
    reactivation_count,
    total_revenue_recovered,
    attribution_method: method,
  };
}

/**
 * Get revenue recovered for multiple workspaces (aggregated)
 */
export async function getRevenueRecoveredMultiple(
  workspaceIds: string[],
  startDate: string,
  endDate: string
): Promise<Record<string, RevenueRecoveredBreakdown>> {
  const results: Record<string, RevenueRecoveredBreakdown> = {};

  for (const workspaceId of workspaceIds) {
    results[workspaceId] = await getRevenueRecovered(workspaceId, startDate, endDate);
  }

  return results;
}
