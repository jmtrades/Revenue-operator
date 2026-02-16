/**
 * Temporal stability signals: workspace has stability, multi-day, or had stability in period.
 * workspaceHasMultiDayStability returns false when workspace has amendment in last 24h (institutional auditability).
 */

import { getDb } from "@/lib/db/queries";
import { workspaceHasAmendmentInLast24h } from "@/lib/institutional-auditability";

/** True when at least one temporal_stability_records row exists for the workspace. */
export async function workspaceHasTemporalStability(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("temporal_stability_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/**
 * True when at least one record has first_observed_at and last_confirmed_at on different UTC days.
 * Also false when workspaceHasAmendmentInLast24h(workspaceId) is true (institutional auditability).
 */
export async function workspaceHasMultiDayStability(workspaceId: string): Promise<boolean> {
  if (await workspaceHasAmendmentInLast24h(workspaceId)) return false;
  const db = getDb();
  const { data: rows } = await db
    .from("temporal_stability_records")
    .select("first_observed_at, last_confirmed_at")
    .eq("workspace_id", workspaceId);
  if (!rows?.length) return false;
  for (const r of rows as { first_observed_at: string; last_confirmed_at: string }[]) {
    const d1 = r.first_observed_at.slice(0, 10);
    const d2 = r.last_confirmed_at.slice(0, 10);
    if (d1 !== d2) return true;
  }
  return false;
}

/** True when any record has last_confirmed_at in [periodStart, periodEnd] (inclusive). */
export async function workspaceHadStabilityInPeriod(
  workspaceId: string,
  periodStart: string,
  periodEnd: string
): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("temporal_stability_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .gte("last_confirmed_at", periodStart)
    .lte("last_confirmed_at", periodEnd)
    .limit(1)
    .maybeSingle();
  return !!data;
}
