/**
 * Cascade uncertainty: dependency chains exist across 2+ threads and one remains unresolved >24h.
 */

import { getDb } from "@/lib/db/queries";

/**
 * True when dependency chains exist across 2+ threads and one remains unresolved >24h.
 */
export async function hasCascadeUncertainty(workspaceId: string): Promise<boolean> {
  const db = getDb();
  
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: dependencies } = await db
    .from("outcome_dependencies")
    .select("source_thread_id, dependent_context_id")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null)
    .lt("created_at", dayAgo);
  
  if (!dependencies || dependencies.length < 2) return false;
  
  const threadIds = new Set((dependencies as { source_thread_id: string }[]).map((d) => d.source_thread_id));
  
  if (threadIds.size < 2) return false;
  
  const { data: dependentThreads } = await db
    .from("shared_transactions")
    .select("id")
    .in("id", Array.from(threadIds));
  
  return (dependentThreads?.length ?? 0) >= 2;
}
