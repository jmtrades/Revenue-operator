/**
 * Command center: hot leads, at-risk leads, activity feed, today's impact
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";
import { actionToImpact, eventToImpact } from "@/lib/outcomes/impact-language";
import { leadStateToProgress, actionToProgress } from "@/lib/progress/conversation-progress";
import { getTargetSnapshot, buildDailyPlan, getLossClock, getCoverage, getPipelineStability } from "@/lib/goals/target-engine";
import { getWarmthScores } from "@/lib/momentum/warmth";
import {
  getCounterfactualForBooking,
  getCounterfactualForAttendance,
  getCounterfactualForRevival,
  type CounterfactualOutcome,
} from "@/lib/attribution/counterfactual";
import {
  responsibilityPhaseFromState,
  getDailyOperationalCycles,
} from "@/lib/operational/presence";

// Performance guard: cache slow responses
const CACHE_TTL_MS = 30_000; // 30 seconds
const cache = new Map<string, { data: unknown; expires: number }>();

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  // Check cache first
  const cached = cache.get(workspaceId);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const startTime = Date.now();
  const { runSyntheticProtectionBootstrap } = await import("@/lib/bootstrap/synthetic-protection");
  await runSyntheticProtectionBootstrap(workspaceId);

  const { ensureWeeklyExpectation, computeProjectionImpact } = await import("@/lib/forecast/expectation");
  const expectedWeekly = await ensureWeeklyExpectation(workspaceId);

  const db = getDb();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: ws } = await db.from("workspaces").select("status, pause_reason").eq("id", workspaceId).single();
  const wsRow = ws as { status?: string; pause_reason?: string } | undefined;
  const { data: settingsRow } = await db.from("settings").select("preview_mode, weekly_call_target, business_type").eq("workspace_id", workspaceId).single();
  const previewMode = (settingsRow as { preview_mode?: boolean })?.preview_mode ?? false;
  const weeklyTarget = (settingsRow as { weekly_call_target?: number })?.weekly_call_target ?? 12;
  const businessType = (settingsRow as { business_type?: string })?.business_type ?? null;

  const operatorStatus = wsRow?.pause_reason ? "Paused" : previewMode ? "Preview" : wsRow?.status === "active" ? "Active" : "Monitoring";

  const { data: deals } = await db
    .from("deals")
    .select("id, lead_id, value_cents, status")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "booked"])
    .neq("status", "lost");

  const hotLeads: Array<{ id: string; lead_id: string; name?: string; email?: string; company?: string; probability: number; value_cents: number; contribution?: string }> = [];
  const dealIds = (deals ?? []).map((d: { id: string; lead_id: string }) => d.id);
  const leadIds = [...new Set((deals ?? []).map((d: { lead_id: string }) => d.lead_id))];

  if (leadIds.length > 0) {
    const { data: leads } = await db.from("leads").select("id, name, email, company, state").in("id", leadIds);
    const leadMap = ((leads ?? []) as { id: string; name?: string; email?: string; company?: string; state?: string }[]).reduce(
      (acc, l) => { acc[l.id] = l; return acc; },
      {} as Record<string, { name?: string; email?: string; company?: string; state?: string }>
    );
    for (let i = 0; i < Math.min((deals ?? []).length, 15); i++) {
      const d = (deals ?? [])[i];
      const deal = d as { id: string; lead_id: string; value_cents?: number };
      try {
        const pred = await predictDealOutcome(deal.id);
        if (pred.probability >= 0.4) {
          const l = leadMap[deal.lead_id];
          const pct = Math.round(pred.probability * 100);
          hotLeads.push({
            id: deal.id,
            lead_id: deal.lead_id,
            name: l?.name ?? undefined,
            email: l?.email ?? undefined,
            company: l?.company ?? undefined,
            probability: pred.probability,
            value_cents: deal.value_cents ?? 0,
            contribution: `~${pct}% toward weekly target (${weeklyTarget})`,
          });
        }
      } catch {
        // skip
      }
      if (hotLeads.length >= 5) break;
    }
    hotLeads.sort((a, b) => b.probability - a.probability);
  }

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const { data: atRiskLeads } = await db
    .from("leads")
    .select("id, name, email, company, state, last_activity_at")
    .eq("workspace_id", workspaceId)
    .in("state", ["BOOKED", "QUALIFIED", "ENGAGED", "CONTACTED"])
    .order("last_activity_at", { ascending: true })
    .limit(20);

  const atRisk = (atRiskLeads ?? [])
    .filter((l: { last_activity_at?: string }) => !l.last_activity_at || new Date(l.last_activity_at) < threeDaysAgo)
    .slice(0, 5)
    .map((l: { id: string; name?: string; email?: string; company?: string; state?: string }) => ({
      id: l.id,
      name: l.name ?? l.email ?? "Unknown",
      company: l.company,
      state: l.state,
      contribution: "Recovering to protect contribution toward target",
    }));

  const { data: recentActions } = await db
    .from("action_logs")
    .select("action, entity_id, payload, created_at, role")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(15);

  const { data: recentEvents } = await db
    .from("events")
    .select("event_type, entity_id, payload, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(15);

  const activityEntityIds = [
    ...new Set([
      ...(recentActions ?? []).map((a: { entity_id: string }) => a.entity_id),
      ...(recentEvents ?? []).map((e: { entity_id: string }) => e.entity_id),
    ]),
  ];
  const { data: activityLeads } = activityEntityIds.length
    ? await db.from("leads").select("id, name, email, company, state").in("id", activityEntityIds)
    : { data: [] };
  const activityLeadMap = ((activityLeads ?? []) as { id: string; name?: string; email?: string; company?: string }[]).reduce(
    (acc, l) => { acc[l.id] = l.name ?? l.email ?? l.company ?? "Unknown"; return acc; },
    {} as Record<string, string>
  );
  const activityLeadStateMap = ((activityLeads ?? []) as { id: string; state?: string }[]).reduce(
    (acc, l) => { acc[l.id] = l.state; return acc; },
    {} as Record<string, string | undefined>
  );

  const activity: Array<{
    what: string;
    who: string;
    when: string;
    why?: string;
    expected?: string;
    role?: string;
    noticed?: string;
    decision?: string;
    confidence_label?: string;
    attributed_to?: string;
    effort_preserved?: boolean;
    counterfactual?: unknown;
    progress_stage?: string;
    progress_advances_toward?: string;
  }> = [];
  const seen = new Set<string>();
  const merged = [
    ...(recentActions ?? []).map((a: { action: string; entity_id: string; payload?: unknown; created_at: string; role?: string }) => ({
      ...a,
      type: "action" as const,
    })),
    ...(recentEvents ?? []).map((e: { event_type: string; entity_id: string; payload?: unknown; created_at: string }) => ({
      action: e.event_type,
      entity_id: e.entity_id,
      payload: e.payload,
      created_at: e.created_at,
      type: "event" as const,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const roleLabels: Record<string, string> = {
    qualifier: "Qualifier",
    setter: "Setter",
    show_manager: "Show Manager",
    follow_up_manager: "Follow-up Manager",
    revival_manager: "Revival Manager",
    full_autopilot: "Full Autopilot",
  };

  const actionsByLead: Record<string, Array<{ action: string; created_at: string }>> = {};
  for (const a of recentActions ?? []) {
    const aid = (a as { entity_id: string }).entity_id;
    const action = (a as { action: string }).action;
    const created_at = (a as { created_at: string }).created_at;
    const p = ((a as { payload?: unknown }).payload ?? {}) as Record<string, unknown>;
    const innerAction = p.action as string | undefined;
    if ((action === "send_message" || action === "simulated_send_message") && innerAction) {
      if (["recovery", "win_back", "reminder", "prep_info", "booking", "call_invite", "follow_up"].includes(innerAction)) {
        if (!actionsByLead[aid]) actionsByLead[aid] = [];
        actionsByLead[aid].push({ action: innerAction, created_at });
      }
    }
  }
  for (const aid of Object.keys(actionsByLead)) {
    actionsByLead[aid].sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
  }

  function getAttribution(leadId: string, beforeTime: string): string | undefined {
    const list = actionsByLead[leadId];
    if (!list) return undefined;
    const eventTime = new Date(beforeTime).getTime();
    const prior = list.find((x) => new Date(x.created_at).getTime() < eventTime);
    if (!prior) return undefined;
    const actionLabels: Record<string, string> = {
      recovery: "Recovery message",
      win_back: "Win-back outreach",
      reminder: "Reminder",
      prep_info: "Prep info",
      booking: "Booking link",
      call_invite: "Call invite",
      follow_up: "Follow-up",
    };
    return actionLabels[prior.action] ?? prior.action;
  }

  for (const item of merged) {
    const key = `${item.type}:${item.entity_id}:${item.created_at}`;
    if (seen.has(key) || activity.length >= 10) continue;
    seen.add(key);
    const what = item.type === "action" ? actionToImpact(item.action, item.payload as Record<string, unknown>) : eventToImpact(item.action);
    const p = (item.payload ?? {}) as Record<string, unknown>;
    const noticed = p.noticed as string | undefined;
    const decision = p.decision as string | undefined;
    const expected =
      (p.expected as string | undefined) ??
      (what.includes("prevent") ? "Loss avoided." : what.includes("Protect") || what.includes("Secured") ? "Revenue protected." : what.includes("Recover") ? "Opportunity recovered." : undefined);
    const why = (p.policy_reason as string | undefined) ?? (p.reasoning as string | undefined);
    const role = item.type === "action" && (item as { role?: string }).role ? roleLabels[(item as { role: string }).role] ?? (item as { role: string }).role : undefined;
    const confidenceLabel = p.confidence_label as string | undefined;
    const attributed_to =
      item.type === "event" && (item.action === "booking_created" || item.action === "call_completed")
        ? getAttribution(item.entity_id, item.created_at)
        : undefined;
    const isRevivalBooking =
      item.type === "event" &&
      (item.action === "booking_created" || item.action === "call_completed") &&
      (attributed_to === "Recovery message" || attributed_to === "Win-back outreach");
    let counterfactual: CounterfactualOutcome | undefined;
    if (item.type === "event") {
      if (item.action === "booking_created") {
        counterfactual = getCounterfactualForBooking(attributed_to);
      } else if (item.action === "call_completed") {
        counterfactual = isRevivalBooking ? getCounterfactualForRevival() : getCounterfactualForAttendance(attributed_to);
      }
    }
    const actionName = item.type === "action" ? (item as { action: string }).action : "";
    const who =
      actionName === "first_day_win"
        ? "System"
        : actionName === "first_response_prepared" || actionName === "first_follow_up_scheduled"
          ? ((item.payload ?? {}) as Record<string, unknown>).lead_name as string ?? "Inbound lead"
          : activityLeadMap[item.entity_id] ?? "—";
    const payloadRecord = (item.payload ?? {}) as Record<string, unknown>;
    const advancesToward = actionToProgress(actionName, payloadRecord);
    const leadState = activityLeadStateMap[item.entity_id];
    const stage = leadStateToProgress(leadState);
    activity.push({
      what,
      who,
      when: item.created_at,
      why: noticed ?? why,
      expected: isRevivalBooking ? "Effort preserved. Would have been lost without outreach." : expected,
      role,
      noticed,
      decision,
      confidence_label: confidenceLabel,
      attributed_to,
      effort_preserved: isRevivalBooking,
      counterfactual,
      progress_stage: leadState ? stage : (advancesToward ?? undefined),
      progress_advances_toward: advancesToward ?? undefined,
    });
  }

  const { data: todayBookings } = await db
    .from("events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("event_type", "booking_created")
    .gte("created_at", todayStart.toISOString());
  const { data: todayCompletions } = await db
    .from("events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("event_type", "call_completed")
    .gte("created_at", todayStart.toISOString());

  const { data: lastAction } = await db
    .from("action_logs")
    .select("action, created_at, payload")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: pendingJobs } = await db
    .from("job_queue")
    .select("job_type, created_at, payload")
    .eq("status", "pending")
    .eq("job_type", "decision")
    .order("created_at", { ascending: true })
    .limit(50);

  const nextScheduled = (pendingJobs ?? []).find((j) => {
    const p = (j as { payload?: { workspaceId?: string } }).payload;
    const wid = p?.workspaceId ?? (p as Record<string, string>)?.["workspaceId"];
    return wid === workspaceId;
  });

  const jobCountByLead: Record<string, number> = {};
  for (const j of pendingJobs ?? []) {
    const p = (j as { payload?: { workspaceId?: string; leadId?: string } }).payload;
    const wid = p?.workspaceId ?? (p as Record<string, string>)?.["workspaceId"];
    const lid = p?.leadId ?? (p as Record<string, string>)?.["leadId"];
    if (wid === workspaceId && typeof lid === "string") {
      jobCountByLead[lid] = (jobCountByLead[lid] ?? 0) + 1;
    }
  }
  const leadsWithPendingJobs = new Set(Object.keys(jobCountByLead));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: securedLast7d } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("event_type", "booking_created")
    .gte("created_at", sevenDaysAgo.toISOString());
  const weekly_recap = {
    secured: securedLast7d ?? 0,
    expected_without_intervention: 0,
    delta: securedLast7d ?? 0,
  };
  const { data: recoveryEvents } = await db
    .from("events")
    .select("entity_id, payload, created_at")
    .eq("workspace_id", workspaceId)
    .in("event_type", ["no_reply_timeout", "message_received"])
    .gte("created_at", sevenDaysAgo.toISOString());

  const recoveredIds = new Set<string>();
  (recoveryEvents ?? []).forEach((e: { entity_id: string; payload?: { decision?: { newState?: string; fromState?: string } } }) => {
    const d = e.payload?.decision;
    if (d?.newState === "ENGAGED" && d?.fromState === "REACTIVATE") recoveredIds.add(e.entity_id);
  });
  const recoveredList: Array<{ id: string; name?: string; company?: string }> = [];
  if (recoveredIds.size > 0) {
    const { data: recLeads } = await db.from("leads").select("id, name, email, company").in("id", [...recoveredIds]).limit(5);
    recoveredList.push(...((recLeads ?? []) as { id: string; name?: string; email?: string; company?: string }[]).map((l) => ({
      id: l.id,
      name: l.name ?? l.email ?? "Unknown",
      company: l.company,
    })));
  }

  const nextActionMins = nextScheduled
    ? Math.max(0, Math.ceil((new Date((nextScheduled as { created_at: string }).created_at).getTime() - Date.now()) / 60000))
    : null;
  const pendingCountForIntent = (pendingJobs ?? []).filter((j) => {
    const p = (j as { payload?: { workspaceId?: string } }).payload;
    return (p?.workspaceId ?? (p as Record<string, string>)?.["workspaceId"]) === workspaceId;
  }).length;
  const workspaceIntent = pendingCountForIntent > 1 ? "Sequence running" : pendingCountForIntent === 1 ? "Already preparing next outreach" : null;
  const nextAction = workspaceIntent ?? (nextScheduled ? `Follow-up in ${nextActionMins ?? 0} min` : null);

  const { data: lastOutreach } = await db
    .from("action_logs")
    .select("created_at")
    .eq("workspace_id", workspaceId)
    .in("action", ["send_message", "simulated_send_message"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const lastOutreachAt = (lastOutreach as { created_at?: string } | null)?.created_at;
  const timeSinceLastOutreachMin = lastOutreachAt
    ? Math.floor((Date.now() - new Date(lastOutreachAt).getTime()) / 60000)
    : null;

  const lastActionAt = lastAction ? new Date((lastAction as { created_at: string }).created_at).getTime() : 0;
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const isQuietPeriod = !lastAction || lastActionAt < twoHoursAgo;
  if (isQuietPeriod) {
    const nextMins = nextScheduled
      ? Math.max(0, Math.ceil((new Date((nextScheduled as { created_at: string }).created_at).getTime() - Date.now()) / 60000))
      : 30;
    const monitorCount = Math.max(1, hotLeads.length + atRisk.length);
    const monitoringEntries = [
      { what: `Watching over ${monitorCount} active lead${monitorCount !== 1 ? "s" : ""}`, who: "System", when: new Date().toISOString(), is_monitoring: true },
      { what: `Next check in ~${nextMins} min`, who: "System", when: new Date().toISOString(), is_monitoring: true },
      { what: "Checking conversations", who: "System", when: new Date().toISOString(), is_monitoring: true },
    ];
    activity.unshift(...monitoringEntries);
  }

  const { data: todayActions } = await db
    .from("action_logs")
    .select("action, payload")
    .eq("workspace_id", workspaceId)
    .gte("created_at", todayStart.toISOString());

  const todayReplies = (todayActions ?? []).filter(
    (a: { action: string }) => a.action === "send_message" || a.action === "simulated_send_message"
  ).length;

  const todayActionPayloads = (todayActions ?? []).filter(
    (a: { action: string }) => a.action === "send_message" || a.action === "simulated_send_message"
  ).map((a: { payload?: { action?: string } }) => (a.payload as { action?: string })?.action);
  const hasReengagementActions = todayActionPayloads.some((p: string | undefined) => p === "recovery" || p === "win_back" || p === "offer");
  const hasAttendanceActions = todayActionPayloads.some((p: string | undefined) => p === "reminder" || p === "prep_info");
  const hasRecoveryActions = hasReengagementActions || recoveredIds.size > 0;
  const { count: todayFollowUps } = await db
    .from("job_queue")
    .select("id", { count: "exact", head: true })
    .eq("job_type", "decision")
    .gte("created_at", todayStart.toISOString());
  const shift_summary = {
    replies_sent: todayReplies,
    follow_ups_scheduled: todayFollowUps ?? 0,
    calls_booked: (todayBookings ?? []).length,
    calls_completed: (todayCompletions ?? []).length,
    recovered: recoveredIds.size,
  };

  const targetSnapshot = await getTargetSnapshot(workspaceId);

  const { getWorkspaceStrategy, planWorkspaceStrategy } = await import("@/lib/strategy/planner");
  const { data: objRow } = await db.from("workspace_objectives").select("last_evaluated_at").eq("workspace_id", workspaceId).eq("objective_type", "bookings").single();
  const lastEval = (objRow as { last_evaluated_at?: string })?.last_evaluated_at;
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  let revenue_trajectory: "On track" | "At risk" = "On track";
  if (!lastEval || new Date(lastEval) < thirtyMinAgo) {
    const { evaluateWorkspaceObjective, evaluateRevenueObjective } = await import("@/lib/objectives/engine");
    const obj = await evaluateWorkspaceObjective(workspaceId);
    let revenueStatus: "ahead" | "on_track" | "behind" | null = null;
    try {
      const rev = await evaluateRevenueObjective(workspaceId);
      if (rev) {
        revenueStatus = rev.status;
        revenue_trajectory = rev.status === "behind" ? "At risk" : "On track";
      }
    } catch {
      // Non-blocking
    }
    if (obj) await planWorkspaceStrategy(workspaceId, obj.status, revenueStatus);
  } else {
    const { data: revRow } = await db.from("workspace_objectives").select("status").eq("workspace_id", workspaceId).eq("objective_type", "revenue").single();
    const revStatus = (revRow as { status?: string })?.status;
    if (revStatus === "behind") revenue_trajectory = "At risk";
  }
  const strategy = await getWorkspaceStrategy(workspaceId);
  const levelLabel = strategy.aggressiveness_level.charAt(0).toUpperCase() + strategy.aggressiveness_level.slice(1);
  const system_strategy = `System strategy today: ${levelLabel} (tracking toward weekly goal)`;
  const { count: pendingJobsCount } = await db
    .from("job_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const daily_plan = buildDailyPlan(targetSnapshot, pendingJobsCount ?? 0, atRisk.length);
  const coverage = await getCoverage(workspaceId, targetSnapshot?.target);
  const isPaused = operatorStatus === "Paused";

  const currentPace = targetSnapshot && targetSnapshot.days_elapsed > 0
    ? targetSnapshot.secured / targetSnapshot.days_elapsed
    : 0;
  const pipeline_stability = targetSnapshot ? await getPipelineStability(workspaceId, currentPace) : "stable";

  const lossClockRaw = isPaused ? getLossClock(targetSnapshot ?? null) : null;
  const loss_clock = isPaused
    ? {
        missed_this_week: lossClockRaw?.missed_this_week ?? 0,
        stability_degradation: "Continuity stalls when paused. Conversations go cold. Recovery becomes harder.",
      }
    : null;

  const continuity_gap = {
    time_since_last_outreach_min: timeSinceLastOutreachMin,
    next_outreach_missed_in_min: isPaused && nextActionMins != null ? nextActionMins : null,
  };

  const recovery_decay = isPaused ? "Likelihood drops each missed cycle." : null;

  const intervention_summaries: Array<{ adjustment: string; when: string }> = [];
  if (targetSnapshot?.adjustment_note) {
    intervention_summaries.push({ adjustment: targetSnapshot.adjustment_note, when: "This shift" });
  }
  if (targetSnapshot?.performance_status === "behind" && targetSnapshot.daily_pace_required > 0) {
    intervention_summaries.push({
      adjustment: `Increased booking outreach to ${targetSnapshot.daily_pace_required}/day to close gap`,
      when: "Today",
    });
  }
  if (atRisk.length > 0) {
    intervention_summaries.push({
      adjustment: `Prioritised recovery outreach for ${atRisk.length} at-risk lead${atRisk.length > 1 ? "s" : ""} to maintain stability`,
      when: "Ongoing",
    });
  }

  const commitments: Array<{ risk: string; handling: string }> = [];
  if (atRisk.length > 0) {
    commitments.push({
      risk: `${atRisk.length} lead${atRisk.length > 1 ? "s" : ""} without contact 3+ days`,
      handling: "Scheduling follow-ups to re-engage. Next outreach queued.",
    });
  }
  if (hotLeads.length > 0) {
    const top = hotLeads[0];
    commitments.push({
      risk: `${top.name ?? top.email ?? "A lead"} (${Math.round((top.probability ?? 0) * 100)}% to book)`,
      handling: "Prioritising outreach. Booking link ready.",
    });
  }
  if (nextScheduled) {
    const mins = Math.max(0, Math.ceil((new Date((nextScheduled as { created_at: string }).created_at).getTime() - Date.now()) / 60000));
    commitments.push({
      risk: `Follow-up due in ${mins < 60 ? "~" + mins + " min" : "~" + Math.ceil(mins / 60) + " hour" + (mins >= 120 ? "s" : "")}`,
      handling: "Queued. Will send automatically.",
    });
  }

  const role_ownership: Array<{ lead_id: string; role: string; responsibility: string }> = [];
  const lastRoleByLead: Record<string, { role: string; action: string }> = {};
  for (const a of recentActions ?? []) {
    const aid = (a as { entity_id: string; role?: string; action: string }).entity_id;
    const role = (a as { role?: string }).role;
    const action = (a as { action: string }).action;
    if (role && !lastRoleByLead[aid]) {
      lastRoleByLead[aid] = { role, action };
    }
  }
  const responsibility: Record<string, string> = {
    qualifier: "Qualification",
    setter: "Scheduling",
    follow_up_manager: "Follow-up",
    show_manager: "Show management",
    revival_manager: "Revival",
    full_autopilot: "Conversations",
  };
  for (const [leadId, { role }] of Object.entries(lastRoleByLead)) {
    role_ownership.push({
      lead_id: leadId,
      role: roleLabels[role] ?? role,
      responsibility: responsibility[role] ?? role,
    });
  }

  const activeConversationIds = [...new Set([
    ...(hotLeads ?? []).map((l: { lead_id: string }) => l.lead_id),
    ...(atRisk ?? []).map((l: { id: string }) => l.id),
    ...(recoveredList ?? []).map((l: { id: string }) => l.id),
    ...activityEntityIds.slice(0, 5),
  ])];
  const trial_conversations_at_risk: Array<{ id: string; name?: string; company?: string }> = [];
  if (activeConversationIds.length > 0) {
    const { data: convLeads } = await db
      .from("leads")
      .select("id, name, email, company")
      .in("id", activeConversationIds.slice(0, 8));
    trial_conversations_at_risk.push(
      ...((convLeads ?? []) as { id: string; name?: string; email?: string; company?: string }[]).map((l) => ({
        id: l.id,
        name: l.name ?? l.email ?? "Unknown",
        company: l.company,
      }))
    );
  }

  const lastActionPayload = (lastAction as { payload?: unknown })?.payload as Record<string, unknown> | undefined;
  const cardLeadIds = [
    ...hotLeads.slice(0, 5).map((l) => l.lead_id),
    ...atRisk.map((l) => l.id),
  ];
  const warmthScores = cardLeadIds.length > 0 ? await getWarmthScores(workspaceId, cardLeadIds) : {};

  const getScheduledIntent = (leadId: string, isAtRisk: boolean): string | undefined => {
    const count = jobCountByLead[leadId] ?? 0;
    if (count === 0) return undefined;
    if (count >= 2) return "Sequence running";
    return isAtRisk ? "Recovery scheduled if no reply" : "Already preparing next outreach";
  };

  const getHandlingStatus = (leadId: string, isAtRisk: boolean): "preparing" | "pacing" | "monitoring" | "re-engaging" => {
    const hasJob = leadsWithPendingJobs.has(leadId);
    if (isAtRisk) return hasJob ? "re-engaging" : "monitoring";
    if (hasJob) return "preparing";
    return "pacing";
  };

  const { data: leadPhaseData } = await db.from("leads").select("id, state").in("id", cardLeadIds);
  const leadMapForPhase = (leadPhaseData ?? []) as { id: string; state?: string }[];
  const stateByLead = Object.fromEntries(leadMapForPhase.map((l) => [l.id, l.state ?? "ENGAGED"]));

  const hotLeadsWithTimers = hotLeads.slice(0, 5).map((l) => ({
    ...l,
    state: stateByLead[l.lead_id] ?? "ENGAGED",
    next_action_in_min: leadsWithPendingJobs.has(l.lead_id) ? (nextActionMins ?? 0) : undefined,
    warmth_score: warmthScores[l.lead_id],
    scheduled_intent: getScheduledIntent(l.lead_id, false),
    handling_status: getHandlingStatus(l.lead_id, false),
    responsibility_phase: responsibilityPhaseFromState(stateByLead[l.lead_id] ?? "ENGAGED"),
  }));
  const atRiskWithTimers = atRisk.map((l) => ({
    ...l,
    next_action_in_min: leadsWithPendingJobs.has(l.id) ? (nextActionMins ?? 0) : undefined,
    warmth_score: warmthScores[l.id],
    scheduled_intent: getScheduledIntent(l.id, true),
    handling_status: getHandlingStatus(l.id, true),
    responsibility_phase: responsibilityPhaseFromState(stateByLead[l.id] ?? l.state ?? "REACTIVATE"),
  }));

  const daily_operational_cycles = getDailyOperationalCycles(
    now,
    hasReengagementActions,
    hasAttendanceActions,
    hasRecoveryActions
  );

  const activeLeadIds = new Set([...hotLeads.map((l) => l.lead_id), ...atRisk.map((l) => l.id)]);
  const pendingDecisionCount = (pendingJobs ?? []).filter((j) => {
    const p = (j as { payload?: { workspaceId?: string } }).payload;
    return (p?.workspaceId ?? (p as Record<string, string>)?.["workspaceId"]) === workspaceId;
  }).length;
  const unattendedCount = activeLeadIds.size > 0 ? [...activeLeadIds].filter((lid) => !leadsWithPendingJobs.has(lid)).length : 0;
  const silence_protection = {
    protected: !isPaused && (activeLeadIds.size === 0 || pendingDecisionCount > 0 || unattendedCount === 0),
    unattended_count: unattendedCount,
    status: isPaused ? "warning" : activeLeadIds.size > 0 && unattendedCount > 0 && pendingDecisionCount === 0 ? "warning" : "green",
    label: isPaused ? "Paused — conversations at risk" : activeLeadIds.size === 0 ? "No active conversations" : unattendedCount > 0 ? `${unattendedCount} conversation${unattendedCount !== 1 ? "s" : ""} awaiting touch` : "All conversations protected",
  };

  const todayEnd = new Date(todayStart);
  todayEnd.setUTCHours(23, 59, 59, 999);
  const { data: todaySessions } = await db
    .from("call_sessions")
    .select("id, lead_id, deal_id, call_started_at")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", todayStart.toISOString())
    .lt("call_started_at", todayEnd.toISOString());

  let calendar_confidence = 0;
  const todaySessionDealIds = [...new Set((todaySessions ?? []).map((s: { deal_id?: string }) => s.deal_id).filter((x): x is string => Boolean(x)))];
  const todayLeadIds = [...new Set((todaySessions ?? []).map((s: { lead_id?: string }) => s.lead_id).filter((x): x is string => Boolean(x)))];
  const dealsByLead = ((deals ?? []) as Array<{ id: string; lead_id: string }>).reduce((acc, d) => {
    acc[d.lead_id] = d.id;
    return acc;
  }, {} as Record<string, string>);
  const todayDealIds = todaySessionDealIds.length > 0 ? todaySessionDealIds : todayLeadIds.map((lid) => dealsByLead[lid]).filter(Boolean);
  if (todayDealIds.length > 0) {
    for (const dealId of todayDealIds.slice(0, 8)) {
      try {
        const pred = await predictDealOutcome(dealId);
        calendar_confidence += pred.probability;
      } catch {
        // skip
      }
    }
    calendar_confidence = Math.round((calendar_confidence / Math.min(todayDealIds.length, 8)) * 100);
  }

  const fortyEightHoursEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const { data: upcomingSessions } = await db
    .from("call_sessions")
    .select("id, lead_id, call_started_at, show_status")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", now.toISOString())
    .lt("call_started_at", fortyEightHoursEnd.toISOString());

  const revivalsInProgress = atRisk.filter((l) => leadsWithPendingJobs.has(l.id)).length;
  const attendancePending = (upcomingSessions ?? []).filter(
    (s: { show_status?: string | null }) => s.show_status == null || s.show_status === ""
  ).length;

  const likelyBookingsDeals = (deals ?? []).filter((d: { status: string }) => d.status === "open" || d.status === "booked");
  let likelyBookings = 0;
  for (const d of likelyBookingsDeals.slice(0, 5)) {
    try {
      const pred = await predictDealOutcome((d as { id: string }).id);
      if (pred.probability >= 0.5) likelyBookings++;
    } catch {
      // skip
    }
  }

  const pipeline_forecast = {
    likely_bookings: likelyBookings,
    revivals_in_progress: revivalsInProgress,
    attendance_confirmations_pending: attendancePending,
  };

  const commitment_ledger = {
    active_follow_ups_scheduled: pendingDecisionCount,
    recovery_paths_running: atRisk.filter((l) => leadsWithPendingJobs.has(l.id)).length,
    attendance_confirmations_pending: attendancePending,
  };

  const active_protections = {
    conversations_being_warmed: activeLeadIds.size,
    followups_scheduled_24h: pendingDecisionCount,
    attendance_protections: attendancePending,
    recoveries_running: atRisk.filter((l) => leadsWithPendingJobs.has(l.id)).length,
  };

  const avgWarmth = cardLeadIds.length > 0
    ? Object.values(warmthScores).reduce((s, v) => s + v, 0) / cardLeadIds.length
    : 0;
  const warmerCount = Object.values(warmthScores).filter((v) => v >= 50).length;
  const performance_boost = {
    warmer_conversations: warmerCount,
    reduced_ghosting: recoveredIds.size,
    higher_preparedness: (todayCompletions ?? []).length > 0 ? (todayCompletions ?? []).length : 0,
    summary: [
      warmerCount > 0 ? `${warmerCount} warmer conversation${warmerCount !== 1 ? "s" : ""} prepared` : null,
      recoveredIds.size > 0 ? `Reduced ghosting: ${recoveredIds.size} recovered this week` : null,
      (todayCompletions ?? []).length > 0 ? "Higher preparedness: reminders and prep sent" : null,
    ].filter(Boolean) as string[],
  };

  const { data: recentSent } = await db
    .from("action_logs")
    .select("entity_id")
    .eq("workspace_id", workspaceId)
    .in("action", ["send_message", "simulated_send_message"])
    .gte("created_at", sevenDaysAgo.toISOString());
  const leadsTouched = new Set((recentSent ?? []).map((a: { entity_id: string }) => a.entity_id)).size;

  const removal_impact = {
    lost_conversations_estimate: Math.max(0, Math.floor(leadsTouched * 0.6)),
    lost_attendance_estimate: (todayCompletions ?? []).length + (todayBookings ?? []).length,
    lost_opportunities_estimate: hotLeads.length + atRisk.length,
    message: "Reducing coverage reduces your ability to secure these outcomes.",
  };

  const live_risk_feed = atRiskWithTimers.map((l) => ({
    lead_id: l.id,
    name: l.name ?? "Unknown",
    company: l.company,
    risk: "Stale — no contact 3+ days",
    at_risk_since: (atRiskLeads ?? []).find((a: { id: string }) => a.id === l.id)?.last_activity_at ?? null,
  }));

  const autoLeadIds = [...new Set([...cardLeadIds, ...atRisk.map((l) => l.id)])];
  const { data: autoStates } = autoLeadIds.length > 0
    ? await db.from("automation_states").select("lead_id, no_reply_scheduled_at, last_event_at").in("lead_id", autoLeadIds)
    : { data: [] };
  const autoByLead = ((autoStates ?? []) as { lead_id: string; no_reply_scheduled_at?: string | null; last_event_at?: string | null }[]).reduce(
    (acc, a) => { acc[a.lead_id] = a; return acc; },
    {} as Record<string, { no_reply_scheduled_at?: string | null; last_event_at?: string | null }>
  );

  const OPTIMAL_REPLY_HOURS = 24;
  const reply_windows = cardLeadIds.map((lid) => {
    const auto = autoByLead[lid];
    const noReplyAt = auto?.no_reply_scheduled_at ? new Date(auto.no_reply_scheduled_at).getTime() : null;
    const lastEventAt = auto?.last_event_at ? new Date(auto.last_event_at).getTime() : null;
    const nowTs = now.getTime();
    let remaining_min: number | null = null;
    if (noReplyAt && noReplyAt > nowTs) {
      remaining_min = Math.max(0, Math.ceil((noReplyAt - nowTs) / 60000));
    } else if (lastEventAt) {
      const optimalEnd = lastEventAt + OPTIMAL_REPLY_HOURS * 60 * 60 * 1000;
      if (optimalEnd > nowTs) remaining_min = Math.max(0, Math.ceil((optimalEnd - nowTs) / 60000));
    }
    return { lead_id: lid, reply_window_remaining_min: remaining_min };
  }).filter((w) => w.reply_window_remaining_min != null && w.reply_window_remaining_min > 0);

  const intervention_highlights = activity.filter((a) => a.effort_preserved || a.attributed_to === "Recovery message" || a.attributed_to === "Win-back outreach").slice(0, 5);

  const midnight = new Date(todayStart);
  midnight.setUTCHours(0, 0, 0, 0);
  const sixAm = new Date(todayStart);
  sixAm.setUTCHours(6, 0, 0, 0);
  const hour = now.getUTCHours();
  const isMorning = hour < 12;
  const { data: overnightActions } = isMorning
    ? await db.from("action_logs").select("action, entity_id, created_at").eq("workspace_id", workspaceId).in("action", ["send_message", "simulated_send_message"]).gte("created_at", midnight.toISOString()).lt("created_at", sixAm.toISOString())
    : { data: [] };
  const daily_readiness = {
    is_morning: isMorning,
    overnight_protections: (overnightActions ?? []).length,
    readiness_summary: isMorning
      ? (overnightActions ?? []).length > 0
        ? `${(overnightActions ?? []).length} touch${(overnightActions ?? []).length !== 1 ? "es" : ""} sent overnight — conversations protected`
        : "No overnight activity. All quiet."
      : "Ready for the day.",
    pending_today: pendingDecisionCount,
    at_risk_count: atRisk.length,
  };

  const projection_impact = isPaused && expectedWeekly
    ? computeProjectionImpact(expectedWeekly, {
        conversations_cooling: atRisk.length,
        followups_scheduled: pendingDecisionCount,
        reply_windows_active: reply_windows.length,
      })
    : null;

  const removal_simulator = {
    if_paused_today: {
      touches_lost: pendingDecisionCount,
      conversations_going_cold: atRisk.length + Math.min(hotLeads.length, 3),
      attendance_at_risk: attendancePending,
    },
    message: "Pausing today removes protection immediately. These outcomes would not occur.",
  };

  const response = {
    operator_status: operatorStatus,
    heartbeat_visible: true,
    last_action: lastAction ? actionToImpact((lastAction as { action: string }).action, lastActionPayload) + ` (${new Date((lastAction as { created_at: string }).created_at).toLocaleTimeString()})` : null,
    next_action: nextAction,
    today_booked: (todayBookings ?? []).length,
    today_recovered: (todayCompletions ?? []).length,
    hot_leads: hotLeadsWithTimers,
    at_risk: atRiskWithTimers,
    recovered: recoveredList,
    activity,
    shift_summary,
    target_tracking: targetSnapshot
      ? { target: targetSnapshot.target, secured: targetSnapshot.secured, gap: targetSnapshot.gap }
      : null,
    daily_plan,
    coverage: { active_conversations: coverage.active_conversations, level: coverage.level, capacity_pct: coverage.capacity_pct },
    pipeline_stability: pipeline_stability,
    intervention_summaries,
    loss_clock,
    continuity_gap,
    recovery_decay,
    commitments,
    performance_status: targetSnapshot
      ? { status: targetSnapshot.performance_status, adjustment: targetSnapshot.adjustment_note }
      : null,
    weekly_recap,
    role_ownership,
    trial_conversations_at_risk,
    pipeline_forecast,
    commitment_ledger,
    performance_boost,
    removal_impact,
    daily_operational_cycles,
    silence_protection,
    calendar_confidence,
    live_risk_feed,
    reply_windows,
    intervention_highlights,
    daily_readiness,
    removal_simulator,
    business_type: businessType,
    active_protections,
    expected_weekly: expectedWeekly ? { low: expectedWeekly.low, high: expectedWeekly.high, confidence: expectedWeekly.confidence } : null,
    projection_impact,
    system_strategy,
    revenue_trajectory,
  };

  // Performance guard: if response took > 4 seconds, cache it
  const elapsed = Date.now() - startTime;
  if (elapsed > 4000) {
    cache.set(workspaceId, {
      data: response,
      expires: Date.now() + CACHE_TTL_MS,
    });
    // Clean old cache entries
    for (const [key, value] of cache.entries()) {
      if (value.expires < Date.now()) cache.delete(key);
    }
  }

  return NextResponse.json(response);
}
