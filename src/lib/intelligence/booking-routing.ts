/**
 * Tiered booking routing by probability:
 * p < 0.25: clarify + nurture
 * 0.25 <= p < 0.55: triage call first
 * p >= 0.55: direct booking
 */

import { predictDealOutcome } from "./deal-prediction";

export type RoutingTier = "clarify_nurture" | "triage_call" | "direct_booking";

export interface BookingRoute {
  tier: RoutingTier;
  probability: number;
  recommended_action: string;
  reasoning: string;
}

export async function getBookingRoute(dealId: string): Promise<BookingRoute> {
  const pred = await predictDealOutcome(dealId);
  const p = pred.probability;

  if (p < 0.25) {
    return {
      tier: "clarify_nurture",
      probability: p,
      recommended_action: "qualification_question",
      reasoning: `Low close probability (${(p * 100).toFixed(0)}%). Clarify intent and nurture before booking.`,
    };
  }
  if (p < 0.55) {
    return {
      tier: "triage_call",
      probability: p,
      recommended_action: "call_invite",
      reasoning: `Medium probability (${(p * 100).toFixed(0)}%). Triage call first to qualify.`,
    };
  }
  return {
    tier: "direct_booking",
    probability: p,
    recommended_action: "booking",
    reasoning: `High probability (${(p * 100).toFixed(0)}%). Direct to booking.`,
  };
}
