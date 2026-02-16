/**
 * Continuity load: internal accounting for infrastructure billing.
 * Never exposed to UI. Record once per real event; dedupe by (workspace_id, load_type, reference_id).
 */

import { getDb } from "@/lib/db/queries";

export type ContinuityLoadType =
  | "expectation_maintained"
  | "continuation_prevented"
  | "outcome_caused"
  | "coordination_displaced"
  | "operation_sustained"
  | "assumption_relied"
  | "normalized_operation"
  | "protection_interrupted";

/** Record one continuity load event. Idempotent per (workspaceId, loadType, referenceId). */
export async function recordContinuityLoad(
  workspaceId: string,
  loadType: ContinuityLoadType,
  referenceId: string
): Promise<void> {
  const db = getDb();
  try {
    await db.from("continuity_load_events").insert({
      workspace_id: workspaceId,
      load_type: loadType,
      reference_id: referenceId,
      recorded_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "23505") return; // unique violation = already recorded
    throw err;
  }
}

/** Internal counts for billing export only. Not exposed to UI. */
export async function getContinuityLoadForPeriod(
  workspaceId: string,
  periodDays: number
): Promise<Record<ContinuityLoadType, number>> {
  const since = new Date();
  since.setDate(since.getDate() - periodDays);
  return getContinuityLoadForDateRange(workspaceId, since.toISOString(), new Date().toISOString());
}

/** Internal counts for a date range (e.g. settlement period). Not exposed to UI. */
export async function getContinuityLoadForDateRange(
  workspaceId: string,
  periodStart: string,
  periodEnd: string
): Promise<Record<ContinuityLoadType, number>> {
  const db = getDb();
  const { data: rows } = await db
    .from("continuity_load_events")
    .select("load_type")
    .eq("workspace_id", workspaceId)
    .gte("recorded_at", periodStart)
    .lt("recorded_at", periodEnd);

  const counts: Record<ContinuityLoadType, number> = {
    expectation_maintained: 0,
    continuation_prevented: 0,
    outcome_caused: 0,
    coordination_displaced: 0,
    operation_sustained: 0,
    assumption_relied: 0,
    normalized_operation: 0,
    protection_interrupted: 0,
  };
  for (const r of rows ?? []) {
    const t = (r as { load_type: string }).load_type as ContinuityLoadType;
    if (t in counts) counts[t]++;
  }
  return counts;
}

/** Weighted sum for settlement export. Same weight per type unless configured. */
const WEIGHT_PER_TYPE: Record<ContinuityLoadType, number> = {
  expectation_maintained: 1,
  continuation_prevented: 1,
  outcome_caused: 1,
  coordination_displaced: 1,
  operation_sustained: 1,
  assumption_relied: 1,
  normalized_operation: 1,
  protection_interrupted: 1,
};

export function continuityLoadWeightedSum(counts: Record<ContinuityLoadType, number>): number {
  let sum = 0;
  for (const [k, v] of Object.entries(counts) as [ContinuityLoadType, number][]) {
    sum += (WEIGHT_PER_TYPE[k] ?? 1) * v;
  }
  return sum;
}
