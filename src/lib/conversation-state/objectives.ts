/**
 * Map Conversation State to Objectives
 * Decision engine receives ONLY the state, not raw message content.
 */

import type { ConversationState } from "./resolver";

export type Objective =
  | "acknowledge"
  | "clarify"
  | "reduce_uncertainty"
  | "reengage"
  | "secure_commitment"
  | "prepare_attendance";

/**
 * Map conversation state to objective.
 * Deterministic mapping - no LLM needed here.
 */
export function stateToObjective(state: ConversationState): Objective {
  const mapping: Record<ConversationState, Objective> = {
    NEW_INTEREST: "acknowledge",
    CLARIFICATION: "clarify",
    CONSIDERING: "reduce_uncertainty",
    SOFT_OBJECTION: "reduce_uncertainty",
    HARD_OBJECTION: "reduce_uncertainty",
    DRIFT: "reengage",
    COMMITMENT: "secure_commitment",
    POST_BOOKING: "prepare_attendance",
    NO_SHOW: "reengage",
    COLD: "reengage",
  };

  return mapping[state] ?? "acknowledge";
}

/**
 * Get response strategy based on state + objective.
 * Returns deterministic action selection.
 */
export function getResponseStrategy(
  state: ConversationState,
  objective: Objective
): {
  action: string;
  timing: "immediate" | "scheduled";
  priority: "high" | "medium" | "low";
} {
  // State-driven action selection
  if (state === "COMMITMENT") {
    return { action: "booking", timing: "immediate", priority: "high" };
  }

  if (state === "POST_BOOKING") {
    return { action: "confirmation", timing: "immediate", priority: "high" };
  }

  if (state === "CLARIFICATION") {
    return { action: "clarifying_question", timing: "immediate", priority: "high" };
  }

  if (state === "SOFT_OBJECTION") {
    return { action: "follow_up", timing: "scheduled", priority: "medium" };
  }

  if (state === "HARD_OBJECTION") {
    return { action: "defer", timing: "scheduled", priority: "low" };
  }

  if (state === "DRIFT") {
    return { action: "recovery", timing: "scheduled", priority: "medium" };
  }

  if (state === "NO_SHOW" || state === "COLD") {
    return { action: "recovery", timing: "scheduled", priority: "medium" };
  }

  if (state === "CONSIDERING") {
    return { action: "qualification_question", timing: "immediate", priority: "medium" };
  }

  // Default: NEW_INTEREST
  return { action: "greeting", timing: "immediate", priority: "high" };
}
