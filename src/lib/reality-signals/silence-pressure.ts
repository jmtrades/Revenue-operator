/**
 * Silence pressure: dependency unresolved >24h.
 * Deterministic: uses existing outcome_dependencies.
 */

import { getDb } from "@/lib/db/queries";

/**
 * True when workspace has unresolved dependencies older than 24h.
 */
export async function hasSilencePressure(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: unresolved } = await db
    .from("outcome_dependencies")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null)
    .lt("created_at", dayAgo)
    .limit(1)
    .maybeSingle();
  return !!unresolved;
}
