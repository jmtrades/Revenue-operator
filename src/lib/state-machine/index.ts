/**
 * Revenue Operator - Rule-Based State Machine
 * AI never decides state. Rules decide. AI only interprets messages.
 */

import {
  LeadState,
  EventType,
  ALLOWED_ACTIONS_BY_STATE,
} from "@/lib/types";

export type StateTransition = {
  fromState: LeadState;
  toState: LeadState;
  eventType: EventType;
  condition?: (payload: Record<string, unknown>) => boolean;
};

// Rule-based transitions: (currentState, event) -> newState
const STATE_TRANSITIONS: StateTransition[] = [
  { fromState: "NEW", toState: "CONTACTED", eventType: "message_received" },
  { fromState: "CONTACTED", toState: "ENGAGED", eventType: "message_received" },
  { fromState: "ENGAGED", toState: "QUALIFIED", eventType: "message_received" },
  { fromState: "QUALIFIED", toState: "BOOKED", eventType: "booking_created" },
  { fromState: "BOOKED", toState: "SHOWED", eventType: "call_completed" },
  { fromState: "SHOWED", toState: "WON", eventType: "payment_detected" },
  { fromState: "SHOWED", toState: "LOST", eventType: "manual_update" },
  { fromState: "WON", toState: "RETAIN", eventType: "payment_detected" },
  { fromState: "LOST", toState: "REACTIVATE", eventType: "message_received" },
  { fromState: "RETAIN", toState: "CLOSED", eventType: "manual_update" },
  { fromState: "REACTIVATE", toState: "ENGAGED", eventType: "message_received" },
  { fromState: "CONTACTED", toState: "REACTIVATE", eventType: "no_reply_timeout" },
  { fromState: "ENGAGED", toState: "REACTIVATE", eventType: "no_reply_timeout" },
  { fromState: "QUALIFIED", toState: "REACTIVATE", eventType: "no_reply_timeout" },
  { fromState: "REACTIVATE", toState: "CONTACTED", eventType: "message_received" },
  { fromState: "BOOKED", toState: "REACTIVATE", eventType: "no_reply_timeout" },
];

/**
 * Evaluate state transition based on rules only.
 * Returns new state or current state if no transition applies.
 */
export function evaluateState(
  currentState: LeadState,
  eventType: EventType,
  payload: Record<string, unknown> = {}
): LeadState {
  const transition = STATE_TRANSITIONS.find(
    (t) =>
      t.fromState === currentState &&
      t.eventType === eventType &&
      (!t.condition || t.condition(payload))
  );
  return transition ? transition.toState : currentState;
}

/**
 * Get allowed actions for a state.
 * AI can only generate responses that map to these actions.
 */
export function selectAllowedActions(state: LeadState): string[] {
  return ALLOWED_ACTIONS_BY_STATE[state] ?? [];
}
