/**
 * Unconfirmed completion decay: operator marks complete internally but no acknowledgement within 6 hours.
 */

import { getDb } from "@/lib/db/queries";
import { recordOrientationStatement } from "@/lib/orientation/records";
import { log } from "@/lib/logger";

const logCompletionDecaySideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `completion-decay.${ctx}`, {
    error: e instanceof Error ? e.message : String(e),
  });
};

/**
 * Detect and record unconfirmed completion decay.
 * Returns true if statement was recorded.
 */
export async function detectAndRecordCompletionDecay(
  threadId: string,
  workspaceId: string
): Promise<boolean> {
  const db = getDb();
  
  const { data: tx } = await db
    .from("shared_transactions")
    .select("state, acknowledged_at, created_at")
    .eq("id", threadId)
    .maybeSingle();
  
  if (!tx) return false;
  
  const state = (tx as { state: string }).state;
  const acknowledgedAt = (tx as { acknowledged_at: string | null }).acknowledged_at;
  const _createdAt = (tx as { created_at: string }).created_at;
  
  if (state === "acknowledged" || acknowledgedAt) return false;
  
  const { data: completionEvents } = await db
    .from("reciprocal_events")
    .select("recorded_at")
    .eq("thread_id", threadId)
    .in("operational_action", ["completed", "resolved", "finished"])
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!completionEvents) return false;
  
  const completionTime = new Date((completionEvents as { recorded_at: string }).recorded_at).getTime();
  const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
  
  if (completionTime < sixHoursAgo) {
    const { data: existing } = await db
      .from("orientation_records")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("text", "Completion existed only internally.")
      .limit(1)
      .maybeSingle();
    
    if (!existing) {
      await recordOrientationStatement(workspaceId, "Completion existed only internally.").catch(logCompletionDecaySideEffect("record-decay"));
      return true;
    }
  }
  
  return false;
}

/**
 * Record resolution when acknowledgement occurs after internal completion.
 */
export async function recordCompletionResolution(
  threadId: string,
  workspaceId: string
): Promise<void> {
  const db = getDb();
  
  const { data: existingDecay } = await db
    .from("orientation_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("text", "Completion existed only internally.")
    .limit(1)
    .maybeSingle();
  
  if (!existingDecay) return;
  
  const { data: existingResolution } = await db
    .from("orientation_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("text", "Shared confirmation resolved the prior uncertainty.")
    .limit(1)
    .maybeSingle();
  
  if (!existingResolution) {
    await recordOrientationStatement(workspaceId, "Shared confirmation resolved the prior uncertainty.").catch(logCompletionDecaySideEffect("record-resolution"));
  }
}
