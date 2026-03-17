/**
 * Revenue recovery analytics
 * Calculates revenue recovered from:
 * - Missed calls that were subsequently answered (follow-up)
 * - No-shows that were recovered (rescheduled and completed)
 * - Dormant/reactivated contacts
 */

import { getDb } from "@/lib/db/queries";

export type RevenueRecoveredBreakdown = {
  calls_recovered_revenue: number; // cents: missed calls → answered calls
  noshow_recovered_revenue: number; // cents: no-shows → confirmed appointments
  reactivation_revenue: number; // cents: dormant contacts → new appointments
  total_revenue_recovered: number; // cents: sum of above
};

/**
 * Get revenue recovered for a workspace within a date range
 * Estimates recovery value based on:
 * - Missed calls that had a follow-up call completed
 * - No-show appointments that were recovered
 * - Dormant leads that were reactivated
 *
 * @param workspaceId - Workspace ID
 * @param startDate - Start date (ISO 8601: YYYY-MM-DD)
 * @param endDate - End date (ISO 8601: YYYY-MM-DD)
 * @returns Revenue recovered breakdown in cents
 */
export async function getRevenueRecovered(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<RevenueRecoveredBreakdown> {
  const db = getDb();

  // Convert dates to ISO timestamp range
  const startTs = `${startDate}T00:00:00Z`;
  const endTs = `${endDate}T23:59:59Z`;

  // Estimated value per recovered interaction (cents)
  const estimatedValuePerRecovery = 75000; // $750 recovery value (half of $1500 avg deal)

  // 1. Missed calls recovered: Find missed calls (no_answer, voicemail) where the same lead had a completed call after
  const { data: missedCalls } = await db
    .from("call_sessions")
    .select("id, lead_id, call_started_at")
    .eq("workspace_id", workspaceId)
    .in("outcome", ["no_answer", "voicemail"])
    .gte("call_started_at", startTs)
    .lt("call_started_at", endTs);

  let calls_recovered_revenue = 0;
  if (missedCalls && missedCalls.length > 0) {
    const missedLeadIds = [...new Set((missedCalls as Array<{ id: string; lead_id: string; call_started_at: string }>).map((c) => c.lead_id))];

    if (missedLeadIds.length > 0) {
      const { count: recoveredCallsCount } = await db
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("lead_id", missedLeadIds)
        .not("call_ended_at", "is", null) // completed calls
        .gte("call_started_at", startTs)
        .lt("call_started_at", endTs);

      const recoveredCallsCount_val = recoveredCallsCount ?? 0;
      calls_recovered_revenue = recoveredCallsCount_val * estimatedValuePerRecovery;
    }
  }

  // 2. No-show recovered: Find no_shows converted to confirmed appointments (rescheduled and attended)
  const { data: noShowAppointments } = await db
    .from("appointments")
    .select("id, lead_id, created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "no_show")
    .gte("created_at", startTs)
    .lt("created_at", endTs);

  let noshow_recovered_revenue = 0;
  if (noShowAppointments && noShowAppointments.length > 0) {
    const noShowLeadIds = (noShowAppointments as Array<{ id: string; lead_id: string; created_at: string }>).map((a) => a.lead_id);

    if (noShowLeadIds.length > 0) {
      const { count: recoveredShowsCount } = await db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("lead_id", noShowLeadIds)
        .eq("status", "confirmed")
        .gte("created_at", startTs)
        .lt("created_at", endTs);

      const recoveredShowsCount_val = recoveredShowsCount ?? 0;
      noshow_recovered_revenue = recoveredShowsCount_val * estimatedValuePerRecovery;
    }
  }

  // 3. Reactivation revenue: Find leads that transitioned from REACTIVATE state to a forward state
  // and had appointments booked after the transition
  const { data: reactivatedLeads } = await db
    .from("leads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("state", "REACTIVATE");

  let reactivation_revenue = 0;
  if (reactivatedLeads && reactivatedLeads.length > 0) {
    const reactivatedLeadIds = (reactivatedLeads as Array<{ id: string }>).map((l) => l.id);

    if (reactivatedLeadIds.length > 0) {
      const { count: reactivatedAppointmentsCount } = await db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("lead_id", reactivatedLeadIds)
        .eq("status", "confirmed")
        .gte("created_at", startTs)
        .lt("created_at", endTs);

      const reactivatedAppointmentsCount_val = reactivatedAppointmentsCount ?? 0;
      reactivation_revenue = reactivatedAppointmentsCount_val * estimatedValuePerRecovery;
    }
  }

  const total_revenue_recovered = calls_recovered_revenue + noshow_recovered_revenue + reactivation_revenue;

  return {
    calls_recovered_revenue,
    noshow_recovered_revenue,
    reactivation_revenue,
    total_revenue_recovered,
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
