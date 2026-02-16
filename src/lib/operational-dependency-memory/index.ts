/**
 * Dependency memory: track when relief/orientation events occur by type.
 * Updated when followup, payment, commitment, or shared-confirmation outcomes occur.
 */

import { getDb } from "@/lib/db/queries";

export type DependencyType = "followup_tracking" | "payment_followthrough" | "commitment_resolution" | "shared_confirmation";

export async function touchDependencyMemory(workspaceId: string, dependencyType: DependencyType): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("operational_dependency_memory")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("dependency_type", dependencyType)
    .maybeSingle();
  if (existing) {
    await db
      .from("operational_dependency_memory")
      .update({ last_observed_at: now })
      .eq("workspace_id", workspaceId)
      .eq("dependency_type", dependencyType);
  } else {
    await db.from("operational_dependency_memory").insert({
      workspace_id: workspaceId,
      dependency_type: dependencyType,
      first_observed_at: now,
      last_observed_at: now,
      created_at: now,
    });
  }
}

/** Get dependence booleans only. No explanations. */
export async function getDependenceBooleans(workspaceId: string): Promise<{
  manual_followup_replaced: boolean;
  outcomes_verified: boolean;
  payments_not_tracked_manually: boolean;
  agreements_shared: boolean;
}> {
  const db = getDb();
  const { data: rows } = await db
    .from("operational_dependency_memory")
    .select("dependency_type")
    .eq("workspace_id", workspaceId);
  const types = new Set((rows ?? []).map((r: { dependency_type: string }) => r.dependency_type));
  return {
    manual_followup_replaced: types.has("followup_tracking"),
    outcomes_verified: types.has("commitment_resolution"),
    payments_not_tracked_manually: types.has("payment_followthrough"),
    agreements_shared: types.has("shared_confirmation"),
  };
}
