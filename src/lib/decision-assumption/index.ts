/**
 * Decision assumption: behavioral continuity before escalation.
 * If historical patterns show consistent resolution preference, assume same resolution.
 * Deterministic from recorded past outcomes. Escalate only when behavior deviates.
 */

import { getDb } from "@/lib/db/queries";

export type ResolutionType = "reschedule" | "refund" | "confirm_next_day" | "extend_deadline";

/** Record that a resolution type was applied in a context (for future assumption). */
export async function recordResolutionPreference(
  workspaceId: string,
  contextType: string,
  resolutionType: ResolutionType
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("resolution_preferences")
    .select("id, occurrence_count")
    .eq("workspace_id", workspaceId)
    .eq("context_type", contextType)
    .eq("resolution_type", resolutionType)
    .maybeSingle();
  if (existing) {
    const row = existing as { id: string; occurrence_count: number };
    await db
      .from("resolution_preferences")
      .update({
        occurrence_count: row.occurrence_count + 1,
        last_applied_at: now,
      })
      .eq("id", row.id);
  } else {
    await db.from("resolution_preferences").insert({
      workspace_id: workspaceId,
      context_type: contextType,
      resolution_type: resolutionType,
      occurrence_count: 1,
      last_applied_at: now,
    });
  }
}

/** Get dominant resolution for context (apply instead of escalate when count >= 2). */
export async function getAssumedResolution(
  workspaceId: string,
  contextType: string
): Promise<ResolutionType | null> {
  const db = getDb();
  const { data: rows } = await db
    .from("resolution_preferences")
    .select("resolution_type, occurrence_count")
    .eq("workspace_id", workspaceId)
    .eq("context_type", contextType);
  const list = (rows ?? []) as { resolution_type: string; occurrence_count: number }[];
  if (!list.length) return null;
  const dominant = list.reduce((a, b) => (a.occurrence_count >= b.occurrence_count ? a : b));
  return dominant.occurrence_count >= 2 ? (dominant.resolution_type as ResolutionType) : null;
}

/** Whether workspace has any resolution preferences (for dependency proof). */
export async function isBehavioralAssumptionActive(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("resolution_preferences")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();
  return !!data;
}
