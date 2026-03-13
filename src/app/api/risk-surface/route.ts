/**
 * Risk Surface API
 * Operational exposure: what is at risk right now (not analytics).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

const _RISK_TYPES = [
  "reply_window_expiring",
  "cooling_conversation",
  "post_call_hesitation",
  "no_show_risk",
  "stalled_negotiation",
  "continuity_gap",
] as const;

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const fortyEightHoursEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Conversations at risk
  const { data: coolingLeads } = await db
    .from("leads")
    .select("id, name, email, company, last_activity_at, state")
    .eq("workspace_id", workspaceId)
    .eq("opt_out", false)
    .in("state", ["BOOKED", "QUALIFIED", "ENGAGED", "CONTACTED"])
    .or(`last_activity_at.lt.${threeDaysAgo.toISOString()},last_activity_at.is.null`);

  const { data: automationStates } = await db
    .from("automation_states")
    .select("lead_id, no_reply_scheduled_at, last_event_at")
    .in("lead_id", [...new Set((coolingLeads ?? []).map((l: { id: string }) => l.id))]);

  const conversations_at_risk: Array<{
    lead_id: string;
    name: string;
    risk_type: (typeof _RISK_TYPES)[number];
    risk_reason: string;
    time_remaining_min: number | null;
    recommended_protection: string;
  }> = [];

  for (const l of coolingLeads ?? []) {
    const lead = l as { id: string; name?: string; email?: string; company?: string; last_activity_at?: string };
    const name = lead.name ?? lead.email ?? lead.company ?? "Unknown";
    const auto = (automationStates ?? []).find((a: { lead_id: string }) => a.lead_id === lead.id) as {
      no_reply_scheduled_at?: string;
      last_event_at?: string;
    } | undefined;
    const noReplyAt = auto?.no_reply_scheduled_at ? new Date(auto.no_reply_scheduled_at) : null;
    const minsLeft = noReplyAt ? Math.max(0, Math.round((noReplyAt.getTime() - now.getTime()) / 60_000)) : null;

    if (minsLeft != null && minsLeft < 120) {
      conversations_at_risk.push({
        lead_id: lead.id,
        name,
        risk_type: "reply_window_expiring",
        risk_reason: "Reply window closing",
        time_remaining_min: minsLeft,
        recommended_protection: "Preparing response",
      });
    } else {
      conversations_at_risk.push({
        lead_id: lead.id,
        name,
        risk_type: "cooling_conversation",
        risk_reason: "Engagement cooling",
        time_remaining_min: null,
        recommended_protection: "Recovering engagement",
      });
    }
  }

  // Calendar at risk
  const { data: sessions } = await db
    .from("call_sessions")
    .select("id, lead_id, call_started_at, show_status")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", now.toISOString())
    .lt("call_started_at", fortyEightHoursEnd.toISOString())
    .order("call_started_at", { ascending: true });

  const leadIdsForCalls = [...new Set((sessions ?? []).map((s: { lead_id?: string }) => s.lead_id).filter(Boolean))];
  const { data: callLeads } =
    leadIdsForCalls.length > 0
      ? await db.from("leads").select("id, name, company").in("id", leadIdsForCalls)
      : { data: [] };

  const leadMap = ((callLeads ?? []) as { id: string; name?: string; company?: string }[]).reduce(
    (acc, l) => {
      acc[l.id] = l;
      return acc;
    },
    {} as Record<string, { name?: string; company?: string }>
  );

  const calendar_at_risk: Array<{
    call_id: string;
    lead_name: string;
    start_at: string;
    attendance_prob: number;
    missing_confirmation: boolean;
    rescue_needed: boolean;
  }> = (sessions ?? []).map((s: { id: string; lead_id?: string; call_started_at: string; show_status?: string }) => {
    const lead = s.lead_id ? leadMap[s.lead_id] : null;
    const showStatus = s.show_status ?? "";
    const needsRescue = showStatus === "no_show" || showStatus === "likely_no_show";
    const needsConfirmation = !showStatus || showStatus === "" || showStatus === "unknown";
    const prob = showStatus === "showed" || showStatus === "high_confidence" ? 0.9 : needsRescue ? 0.3 : 0.6;
    return {
      call_id: s.id,
      lead_name: lead?.name ?? lead?.company ?? "Unknown",
      start_at: s.call_started_at,
      attendance_prob: prob,
      missing_confirmation: needsConfirmation,
      rescue_needed: needsRescue,
    };
  });

  // Revenue at risk (from targets/objectives)
  const { data: objRow } = await db
    .from("workspace_objectives")
    .select("target_value, current_value")
    .eq("workspace_id", workspaceId)
    .eq("objective_type", "calls")
    .single();

  const target = (objRow as { target_value?: number })?.target_value ?? 12;
  const current = (objRow as { current_value?: number })?.current_value ?? 0;
  const weekly_target_gap = Math.max(0, target - current);

  const revenue_at_risk = {
    weekly_target_gap,
    expected_bookings_slip: Math.min(weekly_target_gap, 3),
    expected_revenue_slip: weekly_target_gap * 500,
    behind_reason: weekly_target_gap > 0 ? "Weekly target behind. Recovering engagements." : null,
  };

  // Protection actions queued (from job_queue - workspace in payload)
  const { data: allPendingJobs } = await db
    .from("job_queue")
    .select("id, payload, job_type, created_at")
    .eq("status", "pending")
    .limit(200);

  const pendingJobs = (allPendingJobs ?? []).filter((j: { payload?: { workspaceId?: string } }) => {
    const p = j.payload ?? {};
    return (p as { workspaceId?: string }).workspaceId === workspaceId;
  });
  const nextJob = pendingJobs[0] as { created_at?: string } | undefined;
  const nextPlannedAt = nextJob?.created_at ?? null;

  const protection_actions_queued = {
    decision_count: pendingJobs.filter((j: { job_type?: string }) => (j as { job_type?: string }).job_type === "decision").length,
    total_count: pendingJobs.length,
    next_planned_action_at: nextPlannedAt,
  };

  // Risk incidents prevented this week
  let preventedCount = 0;
  try {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setUTCHours(0, 0, 0, 0);
    const { count } = await db
      .from("risk_surface_incidents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("prevented_at", weekStart.toISOString());
    preventedCount = count ?? 0;
  } catch {
    // Table may not exist yet
  }

  // Summary sentence
  const totalRisks = conversations_at_risk.length + calendar_at_risk.filter((c) => c.rescue_needed || c.missing_confirmation).length;
  const risk_surface_summary =
    totalRisks === 0
      ? "No operational exposure. All conversations and attendance protected."
      : totalRisks === 1
        ? "1 exposure. Protection in progress."
        : `${totalRisks} exposures. Protection in progress.`;

  return NextResponse.json({
    conversations_at_risk: conversations_at_risk.slice(0, 10),
    calendar_at_risk,
    revenue_at_risk,
    protection_actions_queued,
    risk_surface_summary,
    risk_incidents_prevented_this_week: preventedCount ?? 0,
  });
}
