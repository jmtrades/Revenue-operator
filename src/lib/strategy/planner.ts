/**
 * Strategy Planner — Maps objective status to behavioral parameters.
 * Does NOT send messages. Only changes parameters that influence downstream engines.
 */

import { getDb } from "@/lib/db/queries";
import type { ObjectiveStatus } from "@/lib/objectives/engine";

export type AggressivenessLevel = "conservative" | "balanced" | "aggressive";
export type RecoveryPriority = "low" | "normal" | "high";
export type FollowupIntensity = "light" | "standard" | "heavy";

export interface WorkspaceStrategyState {
  workspace_id: string;
  aggressiveness_level: AggressivenessLevel;
  recovery_priority: RecoveryPriority;
  followup_intensity: FollowupIntensity;
  last_changed_at: string;
  reason: string | null;
}

/** Delay multiplier for sequence steps: aggressive=0.6, conservative=1.4, balanced=1.0. Min delay 1h. */
export function getSequenceDelayMultiplier(level: AggressivenessLevel): number {
  switch (level) {
    case "aggressive": return 0.6;
    case "conservative": return 1.4;
    default: return 1.0;
  }
}

const DEFAULT_STRATEGY: Omit<WorkspaceStrategyState, "workspace_id"> = {
  aggressiveness_level: "balanced",
  recovery_priority: "normal",
  followup_intensity: "standard",
  last_changed_at: new Date().toISOString(),
  reason: null,
};

/** Plan workspace strategy based on objective status (bookings + revenue when available). */
export async function planWorkspaceStrategy(
  workspaceId: string,
  objectiveStatus: ObjectiveStatus,
  revenueStatus?: ObjectiveStatus | null
): Promise<WorkspaceStrategyState> {
  const db = getDb();
  const now = new Date().toISOString();

  let aggressiveness_level: AggressivenessLevel = "balanced";
  let recovery_priority: RecoveryPriority = "normal";
  let followup_intensity: FollowupIntensity = "standard";
  let reason: string;

  const isBehind = objectiveStatus === "behind" || revenueStatus === "behind";
  const isAhead = objectiveStatus === "ahead" && (!revenueStatus || revenueStatus !== "behind");

  if (isAhead) {
    aggressiveness_level = "conservative";
    recovery_priority = "low";
    followup_intensity = "light";
    reason = "Ahead of weekly target — reducing outreach intensity";
  } else if (isBehind) {
    aggressiveness_level = "aggressive";
    recovery_priority = "high";
    followup_intensity = "heavy";
    reason = "Behind target (bookings or revenue) — prioritizing high-probability leads";
  } else {
    aggressiveness_level = "balanced";
    recovery_priority = "normal";
    followup_intensity = "standard";
    reason = "On track toward weekly goal";
  }

  const { data: existing } = await db
    .from("workspace_strategy_state")
    .select("id")
    .eq("workspace_id", workspaceId)
    .single();

  if (existing) {
    await db
      .from("workspace_strategy_state")
      .update({
        aggressiveness_level,
        recovery_priority,
        followup_intensity,
        last_changed_at: now,
        reason,
        updated_at: now,
      })
      .eq("workspace_id", workspaceId);
  } else {
    await db.from("workspace_strategy_state").insert({
      workspace_id: workspaceId,
      aggressiveness_level,
      recovery_priority,
      followup_intensity,
      last_changed_at: now,
      reason,
    });
  }

  return {
    workspace_id: workspaceId,
    aggressiveness_level,
    recovery_priority,
    followup_intensity,
    last_changed_at: now,
    reason,
  };
}

/** Get current strategy state for workspace. */
export async function getWorkspaceStrategy(
  workspaceId: string
): Promise<WorkspaceStrategyState> {
  const db = getDb();
  const { data: row } = await db
    .from("workspace_strategy_state")
    .select("*")
    .eq("workspace_id", workspaceId)
    .single();

  if (!row) {
    return {
      workspace_id: workspaceId,
      ...DEFAULT_STRATEGY,
      last_changed_at: new Date().toISOString(),
    };
  }

  const r = row as Record<string, unknown>;
  return {
    workspace_id: workspaceId,
    aggressiveness_level: (r.aggressiveness_level as AggressivenessLevel) ?? "balanced",
    recovery_priority: (r.recovery_priority as RecoveryPriority) ?? "normal",
    followup_intensity: (r.followup_intensity as FollowupIntensity) ?? "standard",
    last_changed_at: (r.last_changed_at as string) ?? new Date().toISOString(),
    reason: (r.reason as string | null) ?? null,
  };
}
