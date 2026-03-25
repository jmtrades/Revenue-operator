/**
 * Internal: record days when process maintained operation. No user-visible metrics.
 */

import { getDb } from "@/lib/db/queries";

export async function recordOperabilityAnchorDay(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date();
  const anchoredUtcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
  try {
    await db
      .from("operability_anchor_days")
      .upsert(
        {
          workspace_id: workspaceId,
          anchored_utc_date: anchoredUtcDate,
          recorded_at: now.toISOString(),
        },
        { onConflict: "workspace_id,anchored_utc_date" }
      );
  } catch {
    // idempotent; ignore conflict or transient errors
  }
}

/**
 * True when there are at least `days` distinct anchored_utc_date in the last `window` days.
 */
export async function hasAnchoredAcrossDays(
  workspaceId: string,
  days: number = 2,
  windowDays: number = 7
): Promise<boolean> {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data: rows } = await db
    .from("operability_anchor_days")
    .select("anchored_utc_date")
    .eq("workspace_id", workspaceId)
    .gte("anchored_utc_date", cutoffStr);

  const distinct = new Set((rows ?? []).map((r: { anchored_utc_date: string }) => r.anchored_utc_date));
  return distinct.size >= days;
}
