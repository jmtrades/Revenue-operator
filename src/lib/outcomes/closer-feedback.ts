/**
 * Closer Feedback — Track predicted vs actual outcomes.
 * Refines readiness predictions and detects closing issues vs lead quality.
 */

import { getDb } from "@/lib/db/queries";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";
import { getDealOutcome } from "@/lib/outcomes/model";

export type CallResult = "showed" | "no_show" | "won" | "lost" | "rescheduled";

/** Record closer feedback when call outcome is known. */
export async function recordCloserFeedback(
  workspaceId: string,
  leadId: string,
  callResult: CallResult
): Promise<void> {
  const db = getDb();
  const { data: deal } = await db
    .from("deals")
    .select("id, value_cents")
    .eq("lead_id", leadId)
    .neq("status", "lost")
    .limit(1)
    .single();

  let predictedProbability = 0.5;
  if (deal) {
    try {
      const pred = await predictDealOutcome((deal as { id: string }).id);
      predictedProbability = pred.probability;
    } catch {
      // use default
    }
  }

  const outcome = await getDealOutcome(workspaceId, leadId);
  if (outcome) {
    predictedProbability = outcome.probability;
  }

  const actualOutcome = callResult === "won" ? "won" : callResult === "lost" ? "lost" : callResult === "no_show" ? "no_show" : "in_progress";
  const actualScore = actualOutcome === "won" ? 1 : actualOutcome === "no_show" ? 0 : actualOutcome === "lost" ? 0 : 0.5;
  const delta = actualScore - predictedProbability;

  await db.from("closer_feedback").insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    call_result: callResult,
    predicted_probability: predictedProbability,
    actual_outcome: actualOutcome,
    delta,
  });
}
