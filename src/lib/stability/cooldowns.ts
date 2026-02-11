/**
 * Intervention cooldowns — anti-thrash protection.
 * Per-lead limits prevent repeated interventions.
 */

import { getDb } from "@/lib/db/queries";
import { mergeSettings } from "@/lib/autopilot";
import type { LeadState } from "@/lib/types";

const DEFAULT_COOLDOWN_HOURS: Record<string, number> = {
  reassurance: 6,
  clarify: 12,
  urgency: 24,
  schedule: 12,
  confirm: 6,
  revive: 24,
};

const DEFAULT_MAX_TOUCHES: Record<string, number> = {
  NEW: 2,
  CONTACTED: 2,
  ENGAGED: 3,
  QUALIFIED: 4,
  BOOKED: 3,
  SHOWED: 2,
  WON: 2,
  LOST: 1,
  RETAIN: 2,
  REACTIVATE: 1,
  CLOSED: 0,
};

/** Map intervention_type to cooldown category */
export function interventionToCooldownCategory(
  interventionType: string
): keyof typeof DEFAULT_COOLDOWN_HOURS {
  switch (interventionType) {
    case "reminder":
    case "prep_info":
      return "confirm";
    case "booking":
    case "call_invite":
      return "schedule";
    case "recovery":
    case "win_back":
      return "revive";
    case "clarifying_question":
    case "qualification_question":
    case "question":
      return "clarify";
    case "follow_up":
      return "urgency";
    case "greeting":
    case "offer":
    case "next_step":
    default:
      return "reassurance";
  }
}

export interface CanInterveneResult {
  allowed: boolean;
  reason?: string;
  cooldown_until?: string;
}

export async function canInterveneNow(
  workspaceId: string,
  leadId: string,
  interventionType: string,
  stage: LeadState
): Promise<CanInterveneResult> {
  const db = getDb();
  const { data: settingsRow } = await db.from("settings").select("cooldown_by_type_hours, max_touches_per_day_by_stage").eq("workspace_id", workspaceId).single();

  const cooldownByType = (settingsRow as { cooldown_by_type_hours?: Record<string, number> })?.cooldown_by_type_hours ?? DEFAULT_COOLDOWN_HOURS;
  const maxTouchesByStage = (settingsRow as { max_touches_per_day_by_stage?: Record<string, number> })?.max_touches_per_day_by_stage ?? DEFAULT_MAX_TOUCHES;

  const category = interventionToCooldownCategory(interventionType);
  const cooldownHours = cooldownByType[category] ?? DEFAULT_COOLDOWN_HOURS[category] ?? 12;
  const maxTouches = maxTouchesByStage[stage] ?? DEFAULT_MAX_TOUCHES[stage] ?? 2;

  const today = new Date().toISOString().slice(0, 10);

  const { data: row } = await db
    .from("lead_intervention_limits")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .single();

  if (!row) {
    return { allowed: true };
  }

  const r = row as {
    last_intervened_at: string;
    last_intervention_type: string;
    cooldown_until: string | null;
    daily_touch_count: number;
    daily_touch_reset_at: string;
  };

  if (r.daily_touch_reset_at !== today) {
    return { allowed: true };
  }

  if (r.daily_touch_count >= maxTouches) {
    const resetAt = new Date(today);
    resetAt.setUTCDate(resetAt.getUTCDate() + 1);
    return {
      allowed: false,
      reason: "stage_limit",
      cooldown_until: resetAt.toISOString(),
    };
  }

  if (r.cooldown_until) {
    const until = new Date(r.cooldown_until);
    if (until > new Date()) {
      return {
        allowed: false,
        reason: "cooldown",
        cooldown_until: r.cooldown_until,
      };
    }
  }

  const lastAt = new Date(r.last_intervened_at);
  const hoursSince = (Date.now() - lastAt.getTime()) / (1000 * 60 * 60);
  if (hoursSince < cooldownHours) {
    const cooldownUntil = new Date(lastAt);
    cooldownUntil.setHours(cooldownUntil.getHours() + cooldownHours);
    return {
      allowed: false,
      reason: "cooldown",
      cooldown_until: cooldownUntil.toISOString(),
    };
  }

  return { allowed: true };
}

/** Simple hash for message deduplication */
export function hashMessage(content: string): string {
  let h = 0;
  const s = content.slice(0, 200);
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h = h & h;
  }
  return String(Math.abs(h));
}

export async function recordIntervention(
  workspaceId: string,
  leadId: string,
  interventionType: string,
  messageHash?: string
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const { data: existing } = await db
    .from("lead_intervention_limits")
    .select("id, daily_touch_count, daily_touch_reset_at")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .single();

  if (existing) {
    const e = existing as { id: string; daily_touch_count: number; daily_touch_reset_at: string };
    const resetToday = e.daily_touch_reset_at === today;
    const newCount = resetToday ? e.daily_touch_count + 1 : 1;
    const { data: settingsRow } = await db.from("settings").select("cooldown_by_type_hours").eq("workspace_id", workspaceId).single();
    const cooldownByType = (settingsRow as { cooldown_by_type_hours?: Record<string, number> })?.cooldown_by_type_hours ?? DEFAULT_COOLDOWN_HOURS;
    const category = interventionToCooldownCategory(interventionType);
    const cooldownHours = cooldownByType[category] ?? DEFAULT_COOLDOWN_HOURS[category] ?? 12;
    const cooldownUntil = new Date(now);
    cooldownUntil.setHours(cooldownUntil.getHours() + cooldownHours);

    await db
      .from("lead_intervention_limits")
      .update({
        last_intervened_at: now.toISOString(),
        last_intervention_type: interventionType,
        last_intervention_hash: messageHash ?? null,
        cooldown_until: cooldownUntil.toISOString(),
        daily_touch_count: newCount,
        daily_touch_reset_at: today,
        updated_at: now.toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId);
  } else {
    const { data: settingsRow } = await db.from("settings").select("cooldown_by_type_hours").eq("workspace_id", workspaceId).single();
    const cooldownByType = (settingsRow as { cooldown_by_type_hours?: Record<string, number> })?.cooldown_by_type_hours ?? DEFAULT_COOLDOWN_HOURS;
    const category = interventionToCooldownCategory(interventionType);
    const cooldownHours = cooldownByType[category] ?? DEFAULT_COOLDOWN_HOURS[category] ?? 12;
    const cooldownUntil = new Date(now);
    cooldownUntil.setHours(cooldownUntil.getHours() + cooldownHours);

    await db.from("lead_intervention_limits").insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      last_intervened_at: now.toISOString(),
      last_intervention_type: interventionType,
      last_intervention_hash: messageHash ?? null,
      cooldown_until: cooldownUntil.toISOString(),
      daily_touch_count: 1,
      daily_touch_reset_at: today,
    });
  }
}
