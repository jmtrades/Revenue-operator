/**
 * Return to record: counterparty interacts outside record and later comes back via link.
 */

import { getDb } from "@/lib/db/queries";
import { recordOrientationStatement } from "@/lib/orientation/records";

/**
 * Detect and record return to record when counterparty accesses public link after external interaction.
 */
export async function detectAndRecordReturnToRecord(
  externalRef: string,
  workspaceId: string,
  _ip: string
): Promise<void> {
  const db = getDb();
  
  const { data: tx } = await db
    .from("shared_transactions")
    .select("id, counterparty_identifier")
    .eq("external_ref", externalRef)
    .maybeSingle();
  
  if (!tx) return;
  
  const threadId = (tx as { id: string }).id;
  const _counterparty = (tx as { counterparty_identifier: string }).counterparty_identifier;
  
  const { data: recentView } = await db
    .from("record_reference_events")
    .select("recorded_at")
    .eq("workspace_id", workspaceId)
    .eq("external_ref", externalRef)
    .eq("reference_type", "public_record")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!recentView) return;
  
  const viewTime = new Date((recentView as { recorded_at: string }).recorded_at).getTime();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  if (viewTime < dayAgo) return;
  
  const { data: externalActivity } = await db
    .from("reciprocal_events")
    .select("id")
    .eq("thread_id", threadId)
    .in("operational_action", ["provide_information", "request_adjustment"])
    .lt("recorded_at", (recentView as { recorded_at: string }).recorded_at)
    .gte("recorded_at", new Date(dayAgo).toISOString())
    .limit(1)
    .maybeSingle();
  
  if (!externalActivity) return;
  
  const { data: existing } = await db
    .from("orientation_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("text", "Work returned to the existing record.")
    .gte("created_at", new Date(dayAgo).toISOString())
    .limit(1)
    .maybeSingle();
  
  if (!existing) {
    await recordOrientationStatement(workspaceId, "Work returned to the existing record.").catch(() => {});
  }
}
