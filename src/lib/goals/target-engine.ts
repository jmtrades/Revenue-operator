/**
 * Target tracking engine: weekly call target vs secured vs gap
 */

import { getDb } from "@/lib/db/queries";

export interface TargetSnapshot {
  target: number;
  secured: number;
  gap: number;
  week_start: string;
  week_end: string;
  days_elapsed: number;
  daily_pace_required: number;
  performance_status: "ahead" | "on_track" | "behind";
  adjustment_note?: string;
}

export async function getTargetSnapshot(workspaceId: string): Promise<TargetSnapshot | null> {
  const db = getDb();
  const { data: settings } = await db
    .from("settings")
    .select("weekly_call_target")
    .eq("workspace_id", workspaceId)
    .single();

  const target = (settings as { weekly_call_target?: number })?.weekly_call_target ?? null;
  if (target == null || target < 1) return null;

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const { count: secured } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("event_type", "booking_created")
    .gte("created_at", weekStart.toISOString())
    .lte("created_at", weekEnd.toISOString());

  const total = secured ?? 0;
  const gap = Math.max(0, target - total);
  const daysElapsed = Math.min(7, Math.max(1, Math.floor((now.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))));
  const dailyPaceRequired = gap > 0 ? Math.ceil(gap / Math.max(1, 7 - daysElapsed)) : 0;
  const expectedByNow = (target / 7) * daysElapsed;
  const variance = total - expectedByNow;

  let performance_status: "ahead" | "on_track" | "behind" = "on_track";
  let adjustment_note: string | undefined;

  if (variance >= 0.5) {
    performance_status = "ahead";
    adjustment_note = "Maintaining pace. Continuing planned outreach.";
  } else if (variance <= -0.5) {
    performance_status = "behind";
    adjustment_note = `Increasing focus: ${dailyPaceRequired} more bookings needed this week.`;
  } else {
    performance_status = "on_track";
    adjustment_note = "On pace. Executing daily plan.";
  }

  return {
    target,
    secured: total,
    gap,
    week_start: weekStart.toISOString(),
    week_end: weekEnd.toISOString(),
    days_elapsed: daysElapsed,
    daily_pace_required: dailyPaceRequired,
    performance_status,
    adjustment_note,
  };
}

export interface DailyPlanItem {
  action: string;
  count: number;
  intent: string;
}

export function buildDailyPlan(snapshot: TargetSnapshot | null, pendingJobs: number, atRiskCount: number): DailyPlanItem[] {
  const plan: DailyPlanItem[] = [];
  if (!snapshot || snapshot.gap <= 0) {
    plan.push({ action: "Follow-ups", count: pendingJobs, intent: "Maintain pipeline" });
    if (atRiskCount > 0) {
      plan.push({ action: "Recovery outreach", count: atRiskCount, intent: "Prevent loss" });
    }
    return plan;
  }
  const needed = snapshot.daily_pace_required;
  plan.push({ action: "Booking outreach", count: Math.max(1, needed), intent: `Close gap of ${snapshot.gap}` });
  plan.push({ action: "Follow-ups", count: pendingJobs, intent: "Secure existing pipeline" });
  if (atRiskCount > 0) {
    plan.push({ action: "Recovery outreach", count: atRiskCount, intent: "Prevent loss" });
  }
  return plan;
}

/** Expected missed opportunities if system were paused for remainder of week */
export function getLossClock(snapshot: TargetSnapshot | null): { missed_this_week: number } | null {
  if (!snapshot || snapshot.gap <= 0) return null;
  const daysRemaining = Math.max(0, 7 - snapshot.days_elapsed);
  const missed = Math.ceil(snapshot.daily_pace_required * daysRemaining);
  return { missed_this_week: Math.max(0, missed) };
}

export interface CoverageSnapshot {
  active_conversations: number;
  level: "high" | "medium" | "low";
  capacity_pct: number;
}

export async function getCoverage(workspaceId: string, target?: number): Promise<CoverageSnapshot> {
  const db = getDb();
  const { count } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("state", ["CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED", "SHOWED"]);

  const n = count ?? 0;
  const level = n >= 15 ? "high" : n >= 5 ? "medium" : "low";
  const capacityDenom = Math.max(20, (target ?? 12) * 2);
  const capacity_pct = Math.min(100, Math.round((n / capacityDenom) * 100));
  return { active_conversations: n, level, capacity_pct };
}

export type PipelineStability = "stable" | "rising" | "declining";

export async function getPipelineStability(workspaceId: string, currentPace: number): Promise<PipelineStability> {
  const db = getDb();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: priorWeekCount } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("event_type", "booking_created")
    .gte("created_at", fourteenDaysAgo.toISOString())
    .lt("created_at", sevenDaysAgo.toISOString());

  const priorPace = (priorWeekCount ?? 0) / 7;
  if (priorPace < 0.1) return currentPace > 0.5 ? "rising" : "stable";

  const ratio = currentPace / priorPace;
  if (ratio >= 1.2) return "rising";
  if (ratio <= 0.8) return "declining";
  return "stable";
}
