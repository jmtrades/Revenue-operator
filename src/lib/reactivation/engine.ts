/**
 * Multi-horizon reactivation engine.
 * Schedule: 1d, 3d, 7d, 14d, 30d, 90d
 * Angles: value, clarification, proof, urgency, closure (rotate)
 */

import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";

export const REACTIVATION_HORIZONS_DAYS = [1, 3, 7, 14, 30, 90] as const;
export const REACTIVATION_ANGLES = ["value", "clarification", "proof", "urgency", "closure"] as const;

export type ReactivationAngle = (typeof REACTIVATION_ANGLES)[number];

export function getNextHorizonDays(stage: number): number | null {
  if (stage >= REACTIVATION_HORIZONS_DAYS.length) return null;
  return REACTIVATION_HORIZONS_DAYS[stage];
}

/**
 * When trajectory says return cycle underperforming or demand underheated, use shorter horizon to trigger reactivation earlier.
 */
export async function getEffectiveHorizonDays(stage: number, workspaceId: string): Promise<number | null> {
  const base = getNextHorizonDays(stage);
  if (base === null) return null;
  try {
    const { getTrajectoryState, isDemandUnderheated } = await import("@/lib/guarantee/trajectory");
    const t = await getTrajectoryState(workspaceId);
    if (t?.return_cycle_underperforming || isDemandUnderheated(t)) {
      const shorter = Math.max(1, Math.floor(base / 2));
      return shorter;
    }
  } catch {
    // trajectory optional
  }
  return base;
}

export function getAngleForStage(stage: number): ReactivationAngle {
  return REACTIVATION_ANGLES[stage % REACTIVATION_ANGLES.length];
}

export async function scheduleReactivationAttempts(): Promise<number> {
  const db = getDb();
  let scheduled = 0;

  const now = new Date();
  const statesForReactivation = ["REACTIVATE", "CONTACTED", "ENGAGED"];

  const { data: leads } = await db
    .from("leads")
    .select("id, workspace_id, state, reactivation_stage, reactivation_attempt_at, last_activity_at, opt_out")
    .in("state", statesForReactivation)
    .eq("opt_out", false);

  for (const lead of leads ?? []) {
    const l = lead as {
      id: string;
      workspace_id: string;
      state: string;
      reactivation_stage: number;
      reactivation_attempt_at: string | null;
      last_activity_at: string;
      opt_out: boolean;
    };

    const stage = l.reactivation_stage ?? 0;
    const horizonDays = await getEffectiveHorizonDays(stage, l.workspace_id);
    if (horizonDays === null) continue;

    const lastAttempt = l.reactivation_attempt_at ? new Date(l.reactivation_attempt_at) : null;
    const reference = lastAttempt ?? new Date(l.last_activity_at);
    const nextAttemptAt = new Date(reference);
    nextAttemptAt.setDate(nextAttemptAt.getDate() + horizonDays);

    if (nextAttemptAt > now) continue;

    const { data: conv } = await db.from("conversations").select("id").eq("lead_id", l.id).limit(1).maybeSingle();
    const convId = (conv as { id?: string })?.id ?? "";
    if (convId) {
      const { data: recentReply } = await db
        .from("messages")
        .select("id")
        .eq("conversation_id", convId)
        .eq("role", "user")
        .gte("created_at", lastAttempt?.toISOString() ?? "1970-01-01")
        .limit(1)
        .maybeSingle();
      if (recentReply) continue;
    }

    const { data: deal } = await db
      .from("deals")
      .select("status")
      .eq("lead_id", l.id)
      .in("status", ["won", "lost", "booked"])
      .limit(1)
      .maybeSingle();

    if (deal) continue;

    const { getCapacityPressure } = await import("@/lib/guarantee/capacity-stability");
    const cap = await getCapacityPressure(l.workspace_id);
    if ((cap?.pressure_level ?? 0) >= 3) continue;

    await enqueue({ type: "reactivation", leadId: l.id });
    await db
      .from("leads")
      .update({
        reactivation_attempt_at: now.toISOString(),
        reactivation_angle: getAngleForStage(stage),
        reactivation_stage: stage + 1,
        updated_at: now.toISOString(),
      })
      .eq("id", l.id);
    scheduled++;
  }

  return scheduled;
}
