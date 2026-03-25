/**
 * Structural dependence: organization operates inside environment.
 * Set when operationally_embedded AND staff_reliance AND expectation_established.
 */

import { getDb } from "@/lib/db/queries";
import { getStaffReliance } from "@/lib/staff-reliance";
import { getExpectationState } from "@/lib/operational-expectations";
import { getContinuityDuration } from "@/lib/operational-timeline-memory";
import { getMemoryRoleStatements } from "@/lib/memory-replacement";
import { getExternalRecognition } from "@/lib/environment-recognition";

export async function refreshStructuralDependence(workspaceId: string): Promise<void> {
  const [staffReliance, expectationState, continuityDuration, memoryRoleStatements, externalRecognition] = await Promise.all([
    getStaffReliance(workspaceId),
    getExpectationState(workspaceId),
    getContinuityDuration(workspaceId),
    getMemoryRoleStatements(workspaceId),
    getExternalRecognition(workspaceId),
  ]);

  const operationally_embedded =
    continuityDuration.operations_have_been_continuous &&
    memoryRoleStatements.length > 0 &&
    externalRecognition.recognized_as_shared_process;

  const all =
    operationally_embedded &&
    staffReliance.staff_using_environment_for_coordination &&
    expectationState.operations_expected_to_occur_here;

  if (!all) return;

  const db = getDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("structural_dependence")
    .select("dependent, established_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const prev = existing as { dependent?: boolean; established_at?: string } | null;
  if (existing) {
    await db
      .from("structural_dependence")
      .update({ dependent: true, established_at: prev?.dependent ? prev.established_at : now })
      .eq("workspace_id", workspaceId);
  } else {
    await db.from("structural_dependence").insert({
      workspace_id: workspaceId,
      dependent: true,
      established_at: now,
    });
  }
}

export async function getStructuralDependence(workspaceId: string): Promise<{
  organization_operates_inside_environment: boolean;
}> {
  await refreshStructuralDependence(workspaceId);
  const db = getDb();
  const { data: row } = await db
    .from("structural_dependence")
    .select("dependent")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return {
    organization_operates_inside_environment: (row as { dependent?: boolean } | null)?.dependent ?? false,
  };
}
