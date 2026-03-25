/**
 * Operational expectations: operations expected to occur here.
 * Set when counterparty acks >=3, staff reliance, operationally_embedded.
 */

import { getDb } from "@/lib/db/queries";
import { getStaffReliance } from "@/lib/staff-reliance";
import { getContinuityDuration } from "@/lib/operational-timeline-memory";
import { getMemoryRoleStatements } from "@/lib/memory-replacement";
import { getExternalRecognition } from "@/lib/environment-recognition";

const MIN_COUNTERPARTY_ACKS = 3;

export async function refreshOperationalExpectations(workspaceId: string): Promise<void> {
  const [staffReliance, continuityDuration, memoryRoleStatements, externalRecognition] = await Promise.all([
    getStaffReliance(workspaceId),
    getContinuityDuration(workspaceId),
    getMemoryRoleStatements(workspaceId),
    getExternalRecognition(workspaceId),
  ]);

  const operationally_embedded =
    continuityDuration.operations_have_been_continuous &&
    memoryRoleStatements.length > 0 &&
    externalRecognition.recognized_as_shared_process;

  if (!staffReliance.staff_using_environment_for_coordination || !operationally_embedded) {
    return;
  }

  const db = getDb();
  const { count } = await db
    .from("shared_transactions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("state", "acknowledged");

  const counterpartyAcksOk = (count ?? 0) >= MIN_COUNTERPARTY_ACKS;
  if (!counterpartyAcksOk) return;

  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("operational_expectations")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existing) {
    await db
      .from("operational_expectations")
      .update({ expectation_established: true, last_updated_at: now })
      .eq("workspace_id", workspaceId);
  } else {
    await db.from("operational_expectations").insert({
      workspace_id: workspaceId,
      expectation_established: true,
      last_updated_at: now,
    });
  }
}

export async function getExpectationState(workspaceId: string): Promise<{
  operations_expected_to_occur_here: boolean;
}> {
  await refreshOperationalExpectations(workspaceId);
  const db = getDb();
  const { data: row } = await db
    .from("operational_expectations")
    .select("expectation_established")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return {
    operations_expected_to_occur_here: (row as { expectation_established?: boolean } | null)?.expectation_established ?? false,
  };
}
