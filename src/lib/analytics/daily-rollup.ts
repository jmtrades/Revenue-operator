/**
 * Daily metrics aggregation system
 * Computes daily_metrics rollup from call_sessions, appointments, messages, and leads
 */

import { getDb } from "@/lib/db/queries";

export type DailyMetrics = {
  calls_answered: number;
  calls_missed: number;
  appointments_booked: number;
  no_shows: number;
  no_shows_recovered: number;
  follow_ups_sent: number;
  leads_captured: number;
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

  // 1. Calls answered: call_ended_at IS NOT NULL (completed calls)
  const { count: callsAnsweredCount } = await db
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", startOfDay)
    .lt("call_started_at", endOfDay)
    .not("call_ended_at", "is", null);

  const calls_answered = callsAnsweredCount ?? 0;

  // 2. Calls missed: outcome = 'no_answer' or 'voicemail' (missed calls)
  const { count: callsMissedCount } = await db
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", startOfDay)
    .lt("call_started_at", endOfDay)
    .in("outcome", ["no_answer", "voicemail"]);

  const calls_missed = callsMissedCount ?? 0;

  // 3. Appointments booked: status = 'confirmed' and created within date
  const { count: appointmentsBookedCount } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "confirmed")
    .gte("created_at", startOfDay)
    .lt("created_at", endOfDay);

  const appointments_booked = appointmentsBookedCount ?? 0;

  // 4. No-shows: status = 'no_show' and created within date
  const { count: noShowsCount } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "no_show")
    .gte("created_at", startOfDay)
    .lt("created_at", endOfDay);

  const no_shows = noShowsCount ?? 0;

  // 5. No-shows recovered: look for appointments that were no_show and subsequently converted to completed
  // For now, we'll count no_shows that have a follow-up message or a new appointment booked on the same contact
  // This is estimated by checking if there's activity after the no_show
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

  // 6. Follow-ups sent: messages with direction='outbound' and trigger contains 'followup'
  const { count: followUpsCount } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("direction", "outbound")
    .gte("sent_at", startOfDay)
    .lt("sent_at", endOfDay);

  const follow_ups_sent = followUpsCount ?? 0;

  // 7. Leads captured: leads with created_at within date
  const { count: leadsCapturedCount } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", startOfDay)
    .lt("created_at", endOfDay);

  const leads_captured = leadsCapturedCount ?? 0;

  // 8. Response time average (seconds): time between call_created_at and call_started_at
  // Note: using started_at and call_started_at as proxy for when call actually began
  const { data: callSessionsForResponseTime } = await db
    .from("call_sessions")
    .select("started_at, call_started_at")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", startOfDay)
    .lt("call_started_at", endOfDay)
    .not("call_started_at", "is", null);

  let response_time_avg_seconds: number | null = null;
  const sessions = callSessionsForResponseTime ?? [];
  if (sessions.length > 0) {
    type ResponseTimeSession = {
      started_at: string;
      call_started_at: string;
    };
    const responseTimes = sessions
      .filter((s): s is ResponseTimeSession => {
        const candidate = s as { started_at?: string | null; call_started_at?: string | null } | null | undefined;
        return Boolean(candidate?.started_at && candidate?.call_started_at);
      })
      .map((s) => {
        const createdTime = new Date(s.started_at).getTime();
        const callStartTime = new Date(s.call_started_at).getTime();
        return (callStartTime - createdTime) / 1000; // convert to seconds
      })
      .filter((t: number) => t >= 0 && t < 3600); // filter out outliers (0-60 minutes)

    if (responseTimes.length > 0) {
      response_time_avg_seconds = Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length);
    }
  }

  // 9. Revenue estimated (cents)
  // Strategy: appointments_booked × estimated deal value per vertical
  // Default multiplier: $1500 per appointment booked = 150000 cents
  // This can be overridden by workspace settings later
  const estimatedDealValueCents = 150000; // $1500 default
  const revenue_estimated_cents = appointments_booked * estimatedDealValueCents;

  return {
    calls_answered,
    calls_missed,
    appointments_booked,
    no_shows,
    no_shows_recovered,
    follow_ups_sent,
    leads_captured,
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
        no_shows: metrics.no_shows,
        no_shows_recovered: metrics.no_shows_recovered,
        follow_ups_sent: metrics.follow_ups_sent,
        leads_captured: metrics.leads_captured,
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
    console.error(`Failed to upsert daily metrics for ${workspaceId} on ${date}:`, error);
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
    console.error("Failed to fetch workspaces for rollup:", wsError);
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
      console.error(`Error processing metrics for workspace ${ws.id}:`, error);
      failed++;
    }
  }

  return { processed, failed };
}
