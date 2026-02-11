/**
 * Next best action engine.
 * Actions: ask_clarification, send_proof, reframe_value, book_call, schedule_followup, reactivate_later, escalate_human
 */

import { predictDealOutcome } from "./deal-prediction";

export type NextAction =
  | "ask_clarification"
  | "send_proof"
  | "reframe_value"
  | "book_call"
  | "schedule_followup"
  | "reactivate_later"
  | "escalate_human";

export interface NextBestActionResult {
  action: NextAction;
  reasoning: string;
  confidence: number;
}

export async function getNextBestAction(params: {
  leadId: string;
  state: string;
  intent?: string;
  riskFlags?: string[];
  dealId?: string;
}): Promise<NextBestActionResult> {
  const { state, intent, riskFlags = [], dealId } = params;

  if (riskFlags.includes("anger")) {
    return { action: "escalate_human", reasoning: "Anger detected—human escalation", confidence: 0.95 };
  }

  if (riskFlags.includes("opt_out_signal")) {
    return { action: "reactivate_later", reasoning: "Opt-out signal—pause and schedule reactivation", confidence: 0.9 };
  }

  let predictionDelta = 0;
  if (dealId) {
    const pred = await predictDealOutcome(dealId);
    predictionDelta = pred.probability - 0.5;
  }

  if (state === "QUALIFIED" && predictionDelta > 0.2) {
    return { action: "book_call", reasoning: "High probability—direct to booking", confidence: 0.85 };
  }

  if (state === "QUALIFIED" && predictionDelta < -0.2) {
    return { action: "send_proof", reasoning: "Lower probability—send proof to build confidence", confidence: 0.75 };
  }

  if (intent === "pricing" || intent === "negotiation") {
    return { action: "reframe_value", reasoning: "Value reframe before pricing discussion", confidence: 0.8 };
  }

  if (state === "ENGAGED") {
    return { action: "ask_clarification", reasoning: "Engaged—clarify needs before next step", confidence: 0.7 };
  }

  if (state === "REACTIVATE") {
    return { action: "reactivate_later", reasoning: "Reactivation scheduled", confidence: 0.6 };
  }

  return { action: "schedule_followup", reasoning: "Default—schedule follow-up", confidence: 0.5 };
}
