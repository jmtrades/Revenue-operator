/**
 * Next best action engine.
 * Actions: ask_clarification, send_proof, reframe_value, book_call, schedule_followup,
 *          reactivate_later, escalate_human, monitor_sequence, change_channel, send_email, send_sms
 *
 * The engine considers: lead state, risk flags, intent signals, sequence enrollment,
 * hours since last contact, engagement level, and deal prediction.
 */

import { predictDealOutcome } from "./deal-prediction";

export type NextAction =
  | "ask_clarification"
  | "send_proof"
  | "reframe_value"
  | "book_call"
  | "schedule_followup"
  | "reactivate_later"
  | "escalate_human"
  | "monitor_sequence"
  | "change_channel"
  | "send_email"
  | "send_sms";

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
  isEnrolledInSequence?: boolean;
  hoursSinceLastContact?: number;
  engagementScore?: number;
  touchpointCount?: number;
}): Promise<NextBestActionResult> {
  const {
    state,
    intent,
    riskFlags = [],
    dealId,
    isEnrolledInSequence = false,
    hoursSinceLastContact = 0,
    engagementScore = 50,
    touchpointCount = 0,
  } = params;

  // ── SAFETY-CRITICAL: Always fire immediately ──
  if (riskFlags.includes("anger")) {
    return { action: "escalate_human", reasoning: "Anger detected—human escalation required", confidence: 0.95 };
  }

  if (riskFlags.includes("opt_out_signal")) {
    return { action: "reactivate_later", reasoning: "Opt-out signal—pause outreach and schedule reactivation", confidence: 0.9 };
  }

  // ── DEAL PREDICTION ──
  let predictionDelta = 0;
  if (dealId) {
    const pred = await predictDealOutcome(dealId);
    predictionDelta = pred.probability - 0.5;
  }

  // ── QUALIFIED LEADS ──
  if (state === "QUALIFIED" && predictionDelta > 0.2) {
    return { action: "book_call", reasoning: "High close probability—push to booking", confidence: 0.85 };
  }
  if (state === "QUALIFIED" && predictionDelta < -0.2) {
    return { action: "send_proof", reasoning: "Deal at risk—send proof to build confidence", confidence: 0.75 };
  }
  if (state === "QUALIFIED") {
    return { action: "ask_clarification", reasoning: "Qualified lead—clarify objections before booking", confidence: 0.72 };
  }

  // ── BOOKED LEADS ──
  if (state === "BOOKED") {
    if (riskFlags.includes("no_show_risk")) {
      return { action: "send_sms", reasoning: "Booked with no-show risk—send confirmation nudge", confidence: 0.80 };
    }
    return { action: "monitor_sequence", reasoning: "Booked—monitor for appointment confirmation", confidence: 0.65 };
  }

  // ── INTENT-BASED ACTIONS ──
  if (intent === "pricing" || intent === "negotiation") {
    return { action: "reframe_value", reasoning: "Price sensitivity detected—reframe value before responding", confidence: 0.8 };
  }

  // ── ENGAGED LEADS ──
  if (state === "ENGAGED") {
    if (engagementScore >= 70) {
      return { action: "book_call", reasoning: "Highly engaged—advance to booking", confidence: 0.75 };
    }
    return { action: "ask_clarification", reasoning: "Engaged lead—clarify needs to qualify", confidence: 0.7 };
  }

  // ── REACTIVATION ──
  if (state === "REACTIVATE" || state === "LOST") {
    return { action: "reactivate_later", reasoning: "Dormant lead—schedule reactivation touch", confidence: 0.6 };
  }

  // ── STALE/COLD LEADS (going_cold flag or >7 days no contact) ──
  if (riskFlags.includes("going_cold") || hoursSinceLastContact > 168) {
    if (isEnrolledInSequence) {
      // Sequence is running but lead is going cold — change channel
      return { action: "change_channel", reasoning: "Going cold despite active sequence—try different channel", confidence: 0.65 };
    }
    return { action: "send_email", reasoning: "Lead going cold—re-engage with email", confidence: 0.6 };
  }

  // ── LEADS ALREADY IN SEQUENCES ──
  if (isEnrolledInSequence) {
    // Don't try to enroll again. Instead, assess sequence effectiveness.
    if (state === "NEW" && touchpointCount >= 2) {
      // Had 2+ touches but still NEW — sequence isn't working, try different approach
      return { action: "change_channel", reasoning: "Sequence active but no engagement after 2+ touches—switch channel", confidence: 0.60 };
    }
    if (state === "CONTACTED" && engagementScore < 40) {
      // Contacted but low engagement — sequence might not be resonating
      return { action: "send_proof", reasoning: "Low engagement despite contact—send proof to spark interest", confidence: 0.55 };
    }
    // Sequence is progressing normally — monitor
    return { action: "monitor_sequence", reasoning: "Active sequence progressing—monitor and let sequence run", confidence: 0.55 };
  }

  // ── NEW/CONTACTED LEADS NOT IN SEQUENCES ──
  if (state === "NEW") {
    return { action: "send_email", reasoning: "New lead—initiate first outreach", confidence: 0.7 };
  }

  if (state === "CONTACTED") {
    if (touchpointCount < 3) {
      return { action: "schedule_followup", reasoning: "Contacted—continue follow-up sequence", confidence: 0.6 };
    }
    return { action: "ask_clarification", reasoning: "Multiple contacts—ask what they need to move forward", confidence: 0.65 };
  }

  // ── DEFAULT FALLBACK ──
  return { action: "schedule_followup", reasoning: "Default—schedule follow-up", confidence: 0.5 };
}
