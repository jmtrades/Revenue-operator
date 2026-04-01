/**
 * Action based reliance: when third parties perform actions.
 * Records orientation statement once per thread.
 */

import { getDb } from "@/lib/db/queries";
import { recordOrientationStatement } from "@/lib/orientation/records";
import { log } from "@/lib/logger";

const THIRD_PARTY_ACTIONS = [
  "approve_next_step",
  "acknowledge_responsibility",
  "attach_outcome_evidence",
  "assign_third_party",
] as const;

const logActionRelianceSideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `action-reliance.${ctx}`, {
    error: e instanceof Error ? e.message : String(e),
  });
};

/**
 * Check if a third-party action occurred and record reliance statement.
 * Returns true if statement was recorded (first time).
 */
export async function detectAndRecordActionReliance(
  threadId: string,
  workspaceId: string,
  actorRole: string,
  operationalAction: string
): Promise<boolean> {
  if (actorRole !== "observer" && actorRole !== "downstream") return false;
  if (!THIRD_PARTY_ACTIONS.includes(operationalAction as (typeof THIRD_PARTY_ACTIONS)[number])) return false;

  const db = getDb();
  const { data: existing } = await db
    .from("orientation_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("text", "Another party acted based on this record.")
    .limit(1)
    .maybeSingle();

  if (existing) return false;

  await recordOrientationStatement(workspaceId, "Another party acted based on this record.").catch(logActionRelianceSideEffect("record-statement"));
  return true;
}
