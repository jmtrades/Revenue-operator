/**
 * Provider participation: record when provider touches a situation.
 * Used to detect outcomes that occurred without provider involvement.
 */

import { getDb } from "@/lib/db/queries";

export async function recordProviderInteraction(
  workspaceId: string,
  referenceId: string
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db.from("provider_participation").insert({
    workspace_id: workspaceId,
    chain_reference: referenceId,
    provider_interacted: true,
    first_event_at: now,
    resolved_at: null,
  });
}

/** True if any provider interaction exists for this reference in the workspace. */
export async function hasProviderInteraction(
  workspaceId: string,
  referenceId: string
): Promise<boolean> {
  const db = getDb();
  const { count } = await db
    .from("provider_participation")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("chain_reference", referenceId);
  return (count ?? 0) > 0;
}
