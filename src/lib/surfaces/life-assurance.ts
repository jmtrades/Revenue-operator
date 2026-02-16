/**
 * Individual life surface: assurance booleans from exposure + continuation logic.
 * No reminders UI. No numbers.
 */

import { hasInterruptedExposureLast24h } from "@/lib/exposure-engine";
import { getDb } from "@/lib/db/queries";
import { getContinuationLinesStoppedInLastDays } from "@/lib/continuation-engine";

export interface LifeAssurancePayload {
  pending_real_world_matters: boolean;
  requires_attention: boolean;
  safely_progressing: boolean;
}

export async function getLifeAssurance(workspaceId: string): Promise<LifeAssurancePayload> {
  const db = getDb();
  const [protectionActive, continuationLines, refResult] = await Promise.all([
    hasInterruptedExposureLast24h(workspaceId),
    getContinuationLinesStoppedInLastDays(workspaceId, 7),
    db.from("personal_references").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  const hasReferences = ((refResult as { count?: number })?.count ?? 0) > 0;
  const hasContinuationEvidence = continuationLines.length > 0;

  return {
    pending_real_world_matters: hasReferences && (protectionActive || hasContinuationEvidence),
    requires_attention: protectionActive,
    safely_progressing: hasContinuationEvidence && !protectionActive,
  };
}
