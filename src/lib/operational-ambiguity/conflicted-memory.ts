/**
 * Conflicted memory: dispute occurs after downstream action or third-party reliance.
 */

import { getDb } from "@/lib/db/queries";
import { recordOrientationStatement } from "@/lib/orientation/records";

/**
 * Detect and record conflicted memory when dispute occurs after downstream action or third-party reliance.
 */
export async function detectAndRecordConflictedMemory(
  threadId: string,
  workspaceId: string
): Promise<void> {
  const db = getDb();
  
  const { data: disputeEvent } = await db
    .from("reciprocal_events")
    .select("recorded_at")
    .eq("thread_id", threadId)
    .eq("operational_action", "disputed")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!disputeEvent) return;
  
  const _disputeTime = new Date((disputeEvent as { recorded_at: string }).recorded_at).getTime();
  
  const { data: downstreamActions } = await db
    .from("reciprocal_events")
    .select("id")
    .eq("thread_id", threadId)
    .eq("actor_role", "downstream")
    .lt("recorded_at", (disputeEvent as { recorded_at: string }).recorded_at)
    .limit(1)
    .maybeSingle();
  
  const { data: observerActions } = await db
    .from("reciprocal_events")
    .select("id")
    .eq("thread_id", threadId)
    .eq("actor_role", "observer")
    .lt("recorded_at", (disputeEvent as { recorded_at: string }).recorded_at)
    .limit(1)
    .maybeSingle();
  
  if (!downstreamActions && !observerActions) return;
  
  const { data: existing } = await db
    .from("orientation_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("text", "Later activity required reconciling prior understanding.")
    .limit(1)
    .maybeSingle();
  
  if (!existing) {
    await recordOrientationStatement(workspaceId, "Later activity required reconciling prior understanding.").catch(() => {});
  }
}
