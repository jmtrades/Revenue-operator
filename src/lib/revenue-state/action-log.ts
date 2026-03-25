/**
 * Action log payload for loss-prevention metrics.
 * Each action must log: risk_type, confidence_of_loss, predicted_revenue_loss_prevented, intervention_type
 */

import type { RevenueStateResult } from "./types";
import { ACTION_TO_INTERVENTION, type InterventionType } from "./types";

/** Derive risk_type from revenue state and reason_code. */
export function deriveRiskType(
  revenueState: RevenueStateResult,
  reasonCode: string
): string {
  if (revenueState.state === "REVENUE_LOST") return "revenue_lost";
  if (revenueState.state === "REVENUE_AT_RISK") return "revenue_at_risk";
  if (revenueState.state === "REVENUE_FRAGILE") return "revenue_fragile";
  if (revenueState.state === "REVENUE_SECURED") return "revenue_secured";
  if (reasonCode.toLowerCase().includes("silence")) return "silence_risk";
  if (reasonCode.toLowerCase().includes("attendance")) return "attendance_risk";
  if (reasonCode.toLowerCase().includes("decay") || reasonCode.toLowerCase().includes("recovery"))
    return "engagement_decay";
  if (reasonCode.toLowerCase().includes("booking")) return "booking_timing";
  return "continuity";
}

/** Map legacy action name to 7-type intervention classification. */
export function toInterventionType(action: string): InterventionType {
  return ACTION_TO_INTERVENTION[action] ?? "CONTINUITY_ACTION";
}

/** Estimate predicted revenue loss prevented (cents) from deal value and confidence of loss. */
export function estimateRevenueLossPrevented(
  dealValueCents: number,
  confidenceOfLoss: number
): number {
  if (dealValueCents <= 0 || confidenceOfLoss <= 0) return 0;
  return Math.round(dealValueCents * confidenceOfLoss);
}

export interface ActionLogLossFields {
  revenue_state: string;
  risk_type: string;
  confidence_of_loss: number;
  predicted_revenue_loss_prevented: number;
  intervention_type: InterventionType;
}

/** Build action log payload fields for loss-prevention logging. All 5 fields required. */
export function buildLossPreventionPayload(
  revenueState: RevenueStateResult,
  action: string,
  reasonCode: string,
  dealValueCents: number,
  options?: { intervention_type_override?: InterventionType }
): ActionLogLossFields {
  const interventionType = options?.intervention_type_override ?? toInterventionType(action);
  const riskType = deriveRiskType(revenueState, reasonCode);
  const confidenceOfLoss = revenueState.confidence_of_loss;
  const predictedRevenueLossPrevented = estimateRevenueLossPrevented(
    dealValueCents,
    confidenceOfLoss
  );
  return {
    revenue_state: revenueState.state,
    risk_type: riskType,
    confidence_of_loss: confidenceOfLoss,
    predicted_revenue_loss_prevented: predictedRevenueLossPrevented,
    intervention_type: interventionType,
  };
}
