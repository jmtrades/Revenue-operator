/**
 * First interruption orientation: record once per workspace. No notifications.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { FIRST_INTERRUPTION_ORIENTATION } from "./doctrine";

const logOrientationSideEffect = (context: string) => (e: unknown) => {
  log("warn", `exposure_engine.orientation.${context}`, { error: e instanceof Error ? e.message : String(e) });
};

export async function recordFirstInterruptionOrientationOnce(
  workspaceId: string,
  now?: Date
): Promise<void> {
  const db = getDb();
  const { data: row } = await db
    .from("workspace_orientation_state")
    .select("first_interruption_orientation_recorded_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const already = (row as { first_interruption_orientation_recorded_at?: string | null } | null)?.first_interruption_orientation_recorded_at;
  if (already != null) return;

  const { recordOrientationStatement } = await import("@/lib/orientation/records");
  await recordOrientationStatement(workspaceId, FIRST_INTERRUPTION_ORIENTATION).catch(logOrientationSideEffect("record_orientation"));

  const t = (now ?? new Date()).toISOString();
  const { data: existing } = await db.from("workspace_orientation_state").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle();
  if (existing) {
    await db
      .from("workspace_orientation_state")
      .update({ first_interruption_orientation_recorded_at: t })
      .eq("workspace_id", workspaceId);
  } else {
    await db
      .from("workspace_orientation_state")
      .insert({ workspace_id: workspaceId, first_interruption_orientation_recorded_at: t });
  }
}
