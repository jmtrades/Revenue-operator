/**
 * Non-participation: record when outcome completed without provider involvement.
 * Call after recordCausalChain / recordContinuationStopped when no interaction exists.
 */

import { getDb } from "@/lib/db/queries";
import { hasProviderInteraction } from "./provider-participation";

export async function recordNonParticipationIfApplicable(
  workspaceId: string,
  referenceId: string,
  subjectType: string
): Promise<void> {
  const interacted = await hasProviderInteraction(workspaceId, referenceId);
  if (interacted) return;
  const db = getDb();
  await db.from("non_participation_events").insert({
    workspace_id: workspaceId,
    reference_id: referenceId,
    subject_type: subjectType,
    recorded_at: new Date().toISOString(),
  });
}
