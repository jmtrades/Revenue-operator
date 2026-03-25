/**
 * Proof cascade: when 3+ independent threads reference each other.
 * Uses existing stability + reference memory detection.
 */

import { getDb } from "@/lib/db/queries";

/**
 * True when 3+ independent threads reference each other (via thread_reference_memory).
 */
export async function hasProofCascade(workspaceId: string): Promise<boolean> {
  const db = getDb();
  
  const { data: refs } = await db
    .from("thread_reference_memory")
    .select("thread_id")
    .eq("workspace_id", workspaceId);
  
  if (!refs || refs.length < 3) return false;
  
  const threadIds = new Set((refs as { thread_id: string }[]).map((r) => r.thread_id));
  
  return threadIds.size >= 3;
}
