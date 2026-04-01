/**
 * Normalization established: ≥3 events in last 7 days across ≥2 distinct UTC days.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

const WINDOW_DAYS = 7;
const MIN_EVENTS = 3;
const MIN_DISTINCT_DAYS = 2;

const logNormalizationSideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `normalization-recognition.${ctx}`, {
    error: e instanceof Error ? e.message : String(e),
  });
};

export async function normalizationEstablished(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - WINDOW_DAYS);
  const sinceIso = since.toISOString();

  const { data: rows } = await db
    .from("operational_normalizations")
    .select("recorded_at")
    .eq("workspace_id", workspaceId)
    .gte("recorded_at", sinceIso)
    .order("recorded_at", { ascending: false })
    .limit(500);

  const list = rows ?? [];
  if (list.length < MIN_EVENTS) return false;

  const utcDays = new Set<string>();
  for (const r of list) {
    const t = (r as { recorded_at: string }).recorded_at;
    utcDays.add(t.slice(0, 10));
  }
  return utcDays.size >= MIN_DISTINCT_DAYS;
}

export async function recordNormalizationOrientationOnce(workspaceId: string): Promise<void> {
  const established = await normalizationEstablished(workspaceId);
  if (!established) return;

  const db = getDb();
  const { data: orientRow } = await db
    .from("workspace_orientation_state")
    .select("normalization_orientation_recorded_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const already = (orientRow as { normalization_orientation_recorded_at?: string | null } | null)?.normalization_orientation_recorded_at;
  if (already != null) return;

  const { recordOrientationStatement } = await import("@/lib/orientation/records");
  const { NORMALIZATION_ORIENTATION_STATEMENT } = await import("./doctrine");
  await recordOrientationStatement(workspaceId, NORMALIZATION_ORIENTATION_STATEMENT).catch(logNormalizationSideEffect("record-statement"));

  const now = new Date().toISOString();
  const { recordContinuityLoad } = await import("@/lib/continuity-load");
  recordContinuityLoad(workspaceId, "normalized_operation", `normalization:${now.slice(0, 10)}`).catch(logNormalizationSideEffect("record-continuity-load"));
  const { data: row } = await db.from("workspace_orientation_state").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle();
  if (row) {
    await db
      .from("workspace_orientation_state")
      .update({ normalization_orientation_recorded_at: now })
      .eq("workspace_id", workspaceId);
  } else {
    await db
      .from("workspace_orientation_state")
      .insert({ workspace_id: workspaceId, normalization_orientation_recorded_at: now });
  }
}
