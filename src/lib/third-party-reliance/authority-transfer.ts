/**
 * Decision authority transfer: when downstream roles resolve responsibilities originally assigned to originator/counterparty.
 */

import { getDb } from "@/lib/db/queries";
import { recordOrientationStatement } from "@/lib/orientation/records";
import { log } from "@/lib/logger";

const logAuthorityTransferSideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `authority-transfer.${ctx}`, {
    error: e instanceof Error ? e.message : String(e),
  });
};

/**
 * Detect and record authority transfer when downstream resolves originator/counterparty responsibility.
 */
export async function detectAndRecordAuthorityTransfer(
  threadId: string,
  workspaceId: string,
  resolvedAction: string,
  eventId: string
): Promise<void> {
  const db = getDb();
  
  const { data: responsibility } = await db
    .from("operational_responsibilities")
    .select("assigned_role")
    .eq("thread_id", threadId)
    .eq("satisfied_by_event_id", eventId)
    .eq("satisfied", true)
    .maybeSingle();
  
  if (!responsibility) return;
  
  const assignedRole = (responsibility as { assigned_role: string }).assigned_role;
  
  if (assignedRole !== "originator" && assignedRole !== "counterparty") return;
  
  const { data: event } = await db
    .from("reciprocal_events")
    .select("actor_role")
    .eq("id", eventId)
    .maybeSingle();
  
  if (!event) return;
  
  const actorRole = (event as { actor_role: string }).actor_role;
  
  if (actorRole === "downstream") {
    const { data: existing } = await db
      .from("orientation_records")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("text", "Authority shifted beyond the original participants.")
      .limit(1)
      .maybeSingle();
    
    if (!existing) {
      await recordOrientationStatement(workspaceId, "Authority shifted beyond the original participants.").catch(logAuthorityTransferSideEffect("record-statement"));
    }
  }
}
