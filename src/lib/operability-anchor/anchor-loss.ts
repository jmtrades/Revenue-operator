/**
 * Anchor loss orientation: record once when process no longer sustains activity.
 * Silent. No emails or notifications.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { processMaintainsOperation } from "./expectations";
import { hasAnchoredAcrossDays } from "./anchor-days";

const ANCHOR_LOSS_STATEMENT = "The operating process was no longer sustaining current activity.";

export async function recordAnchorLossOrientationIfDue(workspaceId: string): Promise<void> {
  const db = getDb();
  const { data: orientRow } = await db
    .from("workspace_orientation_state")
    .select("operation_anchor_lost_orientation_recorded_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const lostRecorded = (orientRow as { operation_anchor_lost_orientation_recorded_at: string | null } | null)?.operation_anchor_lost_orientation_recorded_at ?? null;

  const [anchoredNow, anchoredRecently] = await Promise.all([
    processMaintainsOperation(workspaceId),
    hasAnchoredAcrossDays(workspaceId, 1, 7),
  ]);

  if (anchoredNow || !anchoredRecently || lostRecorded != null) return;

  const { data: expectations } = await getDb()
    .from("active_operational_expectations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("maintained_by_system", true)
    .limit(1);

  if ((expectations?.length ?? 0) > 0) return;

  const { recordOrientationStatement } = await import("@/lib/orientation/records");
  await recordOrientationStatement(workspaceId, ANCHOR_LOSS_STATEMENT).catch((e: unknown) => {
    log("error", "recordOrientationStatement failed", { error: e instanceof Error ? e.message : String(e) });
  });

  const now = new Date().toISOString();
  const { data: row } = await db.from("workspace_orientation_state").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle();
  if (row) {
    await db
      .from("workspace_orientation_state")
      .update({ operation_anchor_lost_orientation_recorded_at: now })
      .eq("workspace_id", workspaceId);
  } else {
    await db
      .from("workspace_orientation_state")
      .insert({ workspace_id: workspaceId, operation_anchor_lost_orientation_recorded_at: now });
  }
}
