/**
 * Solo worker surface: continuity booleans from expectations, continuation, causal chains.
 * No numbers.
 */

import { getDb } from "@/lib/db/queries";
import { processMaintainsOperation } from "@/lib/operability-anchor";
import { getContinuationLinesStoppedInLastDays } from "@/lib/continuation-engine";
import { countCausalChainsInLastDays } from "@/lib/causality-engine";
import { providerDetachmentEstablished } from "@/lib/detachment";

export interface SoloContinuityPayload {
  ongoing_work: boolean;
  awaiting_others: boolean;
  risk_of_stall: boolean;
  supervision_needed: boolean;
  confirmed_progress: boolean;
}

export async function getSoloContinuity(workspaceId: string): Promise<SoloContinuityPayload> {
  const db = getDb();
  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);

  const [anchored, continuationLines, causalCount, providerDetached, expectationsRow] = await Promise.all([
    processMaintainsOperation(workspaceId),
    getContinuationLinesStoppedInLastDays(workspaceId, 7),
    countCausalChainsInLastDays(workspaceId, 7),
    providerDetachmentEstablished(workspaceId),
    db
      .from("active_operational_expectations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle(),
  ]);

  const hasExpectations = !!expectationsRow?.data;
  const hasContinuationEvidence = continuationLines.length > 0;
  const hasCausalEvidence = (causalCount ?? 0) > 0;

  return {
    ongoing_work: anchored || hasExpectations,
    awaiting_others: hasContinuationEvidence,
    risk_of_stall: hasExpectations && !anchored && !hasCausalEvidence,
    supervision_needed: providerDetached,
    confirmed_progress: hasCausalEvidence || (anchored && hasContinuationEvidence),
  };
}
