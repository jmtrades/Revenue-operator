/**
 * Operational ritual layer: daily continuity, weekly closure, post-outcome stabilization.
 * Engines enforce timing. Removal feels disorienting.
 */

import { getDb } from "@/lib/db/queries";
import { appendNarrative } from "@/lib/confidence-engine";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * TWENTY_FOUR_HOURS_MS;

/** Ensure ritual_cycle_state row exists. */
async function ensureRitualState(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data } = await db.from("ritual_cycle_state").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle();
  if (!data) {
    await db.from("ritual_cycle_state").insert({
      workspace_id: workspaceId,
      updated_at: now,
    });
  }
}

/** Run daily continuity cycle (engines expect this rhythm). */
export async function runDailyContinuityCycle(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await ensureRitualState(workspaceId);
  await db
    .from("ritual_cycle_state")
    .update({ daily_continuity_last_at: now, updated_at: now })
    .eq("workspace_id", workspaceId);
  await appendNarrative(workspaceId, "action_executed", "Daily continuity cycle completed.").catch(() => {});
}

/** Run weekly closure cycle. */
export async function runWeeklyClosureCycle(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await ensureRitualState(workspaceId);
  await db
    .from("ritual_cycle_state")
    .update({ weekly_closure_last_at: now, updated_at: now })
    .eq("workspace_id", workspaceId);
  await appendNarrative(workspaceId, "outcome_resolved", "Weekly closure cycle completed.").catch(() => {});
}

/** Run post-outcome stabilization (after recovery or resolution). */
export async function runPostOutcomeStabilization(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await ensureRitualState(workspaceId);
  await db
    .from("ritual_cycle_state")
    .update({ post_outcome_stabilization_last_at: now, updated_at: now })
    .eq("workspace_id", workspaceId);
}

/** Whether any ritual cycle has run (for dependency proof). */
export async function isRitualCycleActive(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("ritual_cycle_state")
    .select("daily_continuity_last_at, weekly_closure_last_at, post_outcome_stabilization_last_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return false;
  const r = data as { daily_continuity_last_at?: string | null; weekly_closure_last_at?: string | null; post_outcome_stabilization_last_at?: string | null };
  return !!(r.daily_continuity_last_at || r.weekly_closure_last_at || r.post_outcome_stabilization_last_at);
}
