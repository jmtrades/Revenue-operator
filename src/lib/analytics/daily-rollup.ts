/**
 * Daily metrics aggregation system
 * Computes daily_metrics rollup from call_sessions, appointments, messages, and leads
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export type DailyMetrics = {
  calls_answered: number;
  calls_missed: number;
  appointments_booked: number;
  leads_captured: number;
  no_shows_recovered: number;
  revenue_estimated_cents: number;
  response_time_avg_seconds: number | null;
};

/**
 * Compute daily metrics for a workspace and date
 * Queries call_sessions, appointments, messages, and leads
 */
export async function computeDailyMetrics(
  workspaceId: string,
  date: string // ISO 8601 date string (YYYY-MM-DD)
): Promise<DailyMetrics> {
  const db = getDb();

  // Date range for the day (UTC)
  const startOfDay = `${date}T00:00:00Z`;
  const endOfDay = `${date}T23:59:59Z`;

  // 1. Total calls (all calls in the period)
  const { count: totalCallsCount } = await db
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", startOfDay)
    .lt("call_started_at", endOfDay);

  const calls_answered = totalCallsCount ?? 0;

  // 2. Unanswered calls: outcome = 'no_answer' or 'voicemail'
  const { count: missedCallsCount } = await db
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", startOfDay)
    .lt("call_started_at", endOfDay)
    .in("outcome", ["no_answer", "voicemail"]);

  const calls_missed = missedCallsCount ?? 0;

  // 3. Appointments booked: status = 'confirmed' and created within date
  const { count: appointmentsCount } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "confirmed")
    .gte("created_at", startOfDay)
    .lt("created_at", endOfDay);

  const appointments_booked = appointmentsCount ?? 0;

  // 4. Leads captured
  const { count: leadsCount } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", startOfDay)
    .lt("created_at", endOfDay);

  const leads_captured = leadsCount ?? 0;

  // 5. Recovered calls: unanswered calls that were later returned/answered
  const { data: noShowAppointments } = await db
    .from("appointments")
    .select("id, lead_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "no_show")
    .gte("created_at", startOfDay)
    .lt("created_at", endOfDay);

  let no_shows_recovered = 0;
  if (noShowAppointments && noShowAppointments.length > 0) {
    const noShowLeadIds = (noShowAppointments as Array<{ id: string; lead_id: string }>).map((a) => a.lead_id);
    if (noShowLeadIds.length > 0) {
      const { count: recoveredCount } = await db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("lead_id", noShowLeadIds)
        .eq("status", "confirmed")
        .gte("created_at", startOfDay)
        .lt("created_at", endOfDay);

      no_shows_recovered = recoveredCount ?? 0;
    }
  }

  // 6. Average call duration (seconds)
  const { data: callDurations } = await db
    .from("call_sessions")
    .select("call_started_at, call_ended_at")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", startOfDay)
    .lt("call_started_at", endOfDay)
    .not("call_ended_at", "is", null);

  let response_time_avg_seconds: number | null = null;
  const durSessions = callDurations ?? [];
  if (durSessions.length > 0) {
    type DurSession = { call_started_at: string; call_ended_at: string };
    const durations = durSessions
      .filter((s): s is DurSession => {
        const c = s as { call_started_at?: string | null; call_ended_at?: string | null } | null;
        return Boolean(c?.call_started_at && c?.call_ended_at);
      })
      .map((s) => (new Date(s.call_ended_at).getTime() - new Date(s.call_started_at).getTime()) / 1000)
      .filter((t: number) => t >= 0 && t < 7200);

    if (durations.length > 0) {
      response_time_avg_seconds = Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length);
    }
  }

  // 7. Revenue estimated (cents): appointments × $1500 default deal value
  const estimatedDealValueCents = 150000;
  const revenue_estimated_cents = appointments_booked * estimatedDealValueCents;

  return {
    calls_answered,
    calls_missed,
    appointments_booked,
    leads_captured,
    no_shows_recovered,
    revenue_estimated_cents,
    response_time_avg_seconds,
  };
}

/**
 * Upsert daily metrics for a workspace and date
 * Uses UPSERT on (workspace_id, date)
 */
export async function upsertDailyMetrics(
  workspaceId: string,
  date: string,
  metrics: DailyMetrics
): Promise<{ id: string; workspace_id: string; date: string } | null> {
  const db = getDb();

  const { data, error } = await db
    .from("daily_metrics")
    .upsert(
      {
        workspace_id: workspaceId,
        date: date,
        calls_answered: metrics.calls_answered,
        calls_missed: metrics.calls_missed,
        appointments_booked: metrics.appointments_booked,
        leads_captured: metrics.leads_captured,
        no_shows_recovered: metrics.no_shows_recovered,
        revenue_estimated_cents: metrics.revenue_estimated_cents,
        response_time_avg_seconds: metrics.response_time_avg_seconds,
      },
      {
        onConflict: "workspace_id,date",
      }
    )
    .select("id, workspace_id, date")
    .maybeSingle();

  if (error) {
    log("error", `Failed to upsert daily metrics for ${workspaceId} on ${date}`, { error: error?.message });
    return null;
  }

  return data as { id: string; workspace_id: string; date: string } | null;
}

/**
 * Rollup metrics for all active workspaces for a given date
 */
export async function rollupAllWorkspaces(date: string): Promise<{ processed: number; failed: number }> {
  const db = getDb();

  // Get all active workspaces
  const { data: workspaces, error: wsError } = await db
    .from("workspaces")
    .select("id")
    .eq("status", "active");

  if (wsError || !workspaces || workspaces.length === 0) {
    log("error", "Failed to fetch workspaces for rollup", { error: wsError?.message });
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const ws of workspaces as Array<{ id: string }>) {
    try {
      const metrics = await computeDailyMetrics(ws.id, date);
      const result = await upsertDailyMetrics(ws.id, date, metrics);
      if (result) {
        processed++;
      } else {
        failed++;
      }
    } catch (error) {
      log("error", `Error processing metrics for workspace ${ws.id}`, { error: error instanceof Error ? error.message : String(error) });
      failed++;
    }
  }

  return { processed, failed };
}
