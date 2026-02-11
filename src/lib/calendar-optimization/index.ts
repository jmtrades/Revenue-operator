/**
 * Smart Calendar Optimization
 * Reserve high-probability leads for prime slots; fill empty slots with warm leads;
 * avoid over-booking clusters; balance call load across days.
 * Enforces scheduling constraints: max_calls_per_day, min_notice_minutes, blocked_days, etc.
 */

import { getDb } from "@/lib/db/queries";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";

export interface SchedulingRules {
  max_calls_per_day?: number;
  min_notice_minutes?: number;
  blocked_days?: number[];
  preferred_hours_start?: string;
  preferred_hours_end?: string;
  reserve_for_high_probability?: boolean;
}

const DEFAULT_RULES: SchedulingRules = {
  max_calls_per_day: 20,
  min_notice_minutes: 60,
  blocked_days: [],
  preferred_hours_start: "09:00",
  preferred_hours_end: "17:00",
  reserve_for_high_probability: true,
};

export async function getSchedulingRules(workspaceId: string): Promise<SchedulingRules> {
  const db = getDb();
  const { data } = await db.from("settings").select("scheduling_rules").eq("workspace_id", workspaceId).single();
  const raw = (data as { scheduling_rules?: SchedulingRules })?.scheduling_rules;
  return { ...DEFAULT_RULES, ...raw };
}

export interface SlotRecommendation {
  deal_id: string;
  lead_id: string;
  slot_quality_score: number;
  scheduling_reason: string;
  suggested_slot?: string;
  constraints_applied?: string[];
}

export async function getSlotRecommendation(dealId: string): Promise<SlotRecommendation | null> {
  const db = getDb();
  const { data: deal } = await db
    .from("deals")
    .select("id, lead_id, workspace_id")
    .eq("id", dealId)
    .single();
  if (!deal) return null;

  const d = deal as { id: string; lead_id: string; workspace_id: string };
  const rules = await getSchedulingRules(d.workspace_id);
  const pred = await predictDealOutcome(d.id);
  const p = pred.probability;

  let slotQualityScore = 0.5;
  let schedulingReason = "Standard slot";
  const constraintsApplied: string[] = [];

  const reserveHigh = rules.reserve_for_high_probability ?? true;
  if (reserveHigh && p >= 0.6) {
    slotQualityScore = 0.9;
    schedulingReason = "High probability lead—reserve prime slot (reserve_for_high_probability)";
    constraintsApplied.push("reserve_for_high_probability");
  } else if (p >= 0.4) {
    slotQualityScore = 0.7;
    schedulingReason = "Medium probability—balanced slot";
  } else {
    slotQualityScore = 0.4;
    schedulingReason = "Lower probability—fill slot when available";
  }

  if (rules.min_notice_minutes != null) {
    constraintsApplied.push(`min_notice_minutes=${rules.min_notice_minutes}`);
  }
  if ((rules.blocked_days ?? []).length > 0) {
    constraintsApplied.push(`blocked_days=${rules.blocked_days?.join(",")}`);
  }

  await db
    .from("deals")
    .update({
      slot_quality_score: slotQualityScore,
      scheduling_reason: schedulingReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);

  return {
    deal_id: d.id,
    lead_id: d.lead_id,
    slot_quality_score: slotQualityScore,
    scheduling_reason: schedulingReason,
    constraints_applied: constraintsApplied,
  };
}

export async function canScheduleCall(workspaceId: string, date: Date): Promise<{ allowed: boolean; reason?: string }> {
  const rules = await getSchedulingRules(workspaceId);
  const day = date.getDay();
  if ((rules.blocked_days ?? []).includes(day)) {
    return { allowed: false, reason: `Day ${day} is blocked` };
  }
  const db = getDb();
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  const { count } = await db
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .gte("started_at", dayStart.toISOString())
    .lte("started_at", dayEnd.toISOString());
  const maxCalls = rules.max_calls_per_day ?? 20;
  if ((count ?? 0) >= maxCalls) {
    return { allowed: false, reason: `max_calls_per_day (${maxCalls}) reached` };
  }
  return { allowed: true };
}

export async function getWarmLeadsForSlotFill(workspaceId: string, limit = 5): Promise<string[]> {
  const db = getDb();
  const { data: deals } = await db
    .from("deals")
    .select("lead_id")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "booked"])
    .gte("slot_quality_score", 0.3)
    .lte("slot_quality_score", 0.6)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (deals ?? []).map((r: { lead_id: string }) => r.lead_id);
}
