/**
 * Self-Healing Intelligence Cycle — advisory only. Append-only.
 * After hosted-executor: evaluate conversion drop, escalation spike, risk spike, stuck intents.
 * May adjust follow-up pacing, tone variant, raise founder alert. Never modify compliance/jurisdiction.
 */

import { appendLedgerEvent } from "@/lib/ops/ledger";
import { log } from "@/lib/logger";

export interface SelfHealingInput {
  workspaceId: string;
  /** Count of intents completed this cycle */
  intentsCompleted: number;
  /** Count of escalations this cycle */
  escalationsThisCycle: number;
  /** Count of intents that remain unclaimed or stuck */
  stuckIntentCount: number;
  /** Whether rate ceiling was hit */
  rateCeilingHit: boolean;
}

export type SelfHealingAction = "none" | "recommend_governance_review" | "founder_alert";

/**
 * Evaluate and optionally append advisory ledger event. Does NOT modify compliance packs or jurisdiction.
 * Deterministic. Append-only.
 */
export async function evaluateSelfHealing(input: SelfHealingInput): Promise<SelfHealingAction> {
  const { workspaceId, intentsCompleted, escalationsThisCycle, stuckIntentCount, rateCeilingHit } = input;

  let action: SelfHealingAction = "none";
  const details: Record<string, unknown> = {
    intents_completed: intentsCompleted,
    escalations: escalationsThisCycle,
    stuck_count: stuckIntentCount,
    rate_ceiling_hit: rateCeilingHit,
  };

  if (escalationsThisCycle >= 3) {
    action = "founder_alert";
    details.reason = "escalation_spike";
  } else if (stuckIntentCount >= 5) {
    action = "recommend_governance_review";
    details.reason = "stuck_intents";
  } else if (rateCeilingHit && intentsCompleted === 0) {
    action = "recommend_governance_review";
    details.reason = "rate_ceiling_no_progress";
  }

  if (action !== "none") {
    await appendLedgerEvent({
      workspaceId,
      eventType: "self_healing_advisory",
      severity: action === "founder_alert" ? "warning" : "notice",
      subjectType: "workspace",
      subjectRef: workspaceId,
      details,
    }).catch((err: unknown) => { log("warn", "self_healing.ledger_append_failed", { error: err instanceof Error ? err.message : String(err) }); });
  }

  return action;
}
