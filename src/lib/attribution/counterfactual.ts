/**
 * Counterfactual intelligence: what would not have happened without intervention.
 * User perceives improved personal performance because of the system.
 */

export type OutcomeType = "booking" | "attendance" | "revival";

export interface CounterfactualOutcome {
  probability_without_intervention: number;
  stall_reason: string;
  outcome_type: OutcomeType;
}

const STALL_REASONS: Record<OutcomeType, string[]> = {
  booking: [
    "Reply likely would have gone unanswered without follow-up.",
    "No outreach would have left lead cold.",
    "Availability options would not have been sent.",
  ],
  attendance: [
    "Reminders increased show likelihood.",
    "Prep info improved preparedness.",
    "Without confirmation touchpoints, lead might have forgotten.",
  ],
  revival: [
    "Lead had stopped replying; no win-back would have left them cold.",
    "Recovery outreach prevented permanent loss.",
    "Without re-engagement, conversation would have stalled.",
  ],
};

export function getCounterfactualForBooking(attributedTo?: string): CounterfactualOutcome {
  const isRevival = attributedTo === "Recovery message" || attributedTo === "Win-back outreach";
  return {
    probability_without_intervention: isRevival ? 0.05 : 0.15,
    stall_reason: isRevival
      ? STALL_REASONS.revival[0]
      : STALL_REASONS.booking[attributedTo === "Follow-up" ? 1 : 0],
    outcome_type: "booking",
  };
}

export function getCounterfactualForAttendance(attributedTo?: string): CounterfactualOutcome {
  const hasReminder = attributedTo === "Reminder" || attributedTo === "Prep info";
  return {
    probability_without_intervention: hasReminder ? 0.4 : 0.55,
    stall_reason: STALL_REASONS.attendance[hasReminder ? 0 : 2],
    outcome_type: "attendance",
  };
}

export function getCounterfactualForRevival(): CounterfactualOutcome {
  return {
    probability_without_intervention: 0.05,
    stall_reason: STALL_REASONS.revival[0],
    outcome_type: "revival",
  };
}
