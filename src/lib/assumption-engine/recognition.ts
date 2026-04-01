/**
 * Assumption established: ≥3 assumptions in last 7 days across ≥2 distinct UTC days.
 * Counts not exposed outside this function.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

const WINDOW_DAYS = 7;
const MIN_ASSUMPTIONS = 3;
const MIN_DISTINCT_DAYS = 2;

export async function assumptionEstablished(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - WINDOW_DAYS);
  const sinceIso = since.toISOString();

  const { data: rows } = await db
    .from("operational_assumptions")
    .select("recorded_at")
    .eq("workspace_id", workspaceId)
    .gte("recorded_at", sinceIso)
    .order("recorded_at", { ascending: false })
    .limit(500);

  const list = rows ?? [];
  if (list.length < MIN_ASSUMPTIONS) return false;

  const utcDays = new Set<string>();
  for (const r of list) {
    const t = (r as { recorded_at: string }).recorded_at;
    utcDays.add(t.slice(0, 10));
  }
  return utcDays.size >= MIN_DISTINCT_DAYS;
}

export async function recordAssumptionOrientationOnce(workspaceId: string): Promise<void> {
  const established = await assumptionEstablished(workspaceId);
  if (!established) return;

  const db = getDb();
  const { data: orientRow } = await db
    .from("workspace_orientation_state")
    .select("assumption_orientation_recorded_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const already = (orientRow as { assumption_orientation_recorded_at?: string | null } | null)?.assumption_orientation_recorded_at;
  if (already != null) return;

  const { recordOrientationStatement } = await import("@/lib/orientation/records");
  const { ASSUMPTION_ORIENTATION_STATEMENT } = await import("./doctrine");
  await recordOrientationStatement(workspaceId, ASSUMPTION_ORIENTATION_STATEMENT).catch((e) => {
    log("error", "recordOrientationStatement failed", { error: e instanceof Error ? e.message : String(e) });
  });

  const now = new Date().toISOString();
  const { recordContinuityLoad } = await import("@/lib/continuity-load");
  recordContinuityLoad(workspaceId, "assumption_relied", `assumption:${now.slice(0, 10)}`).catch((e) => {
    log("error", "recordContinuityLoad failed", { error: e instanceof Error ? e.message : String(e) });
  });
  const { data: row } = await db.from("workspace_orientation_state").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle();
  if (row) {
    await db
      .from("workspace_orientation_state")
      .update({ assumption_orientation_recorded_at: now })
      .eq("workspace_id", workspaceId);
  } else {
    await db
      .from("workspace_orientation_state")
      .insert({ workspace_id: workspaceId, assumption_orientation_recorded_at: now });
  }
}
