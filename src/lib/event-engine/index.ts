/**
 * Revenue Operator - Event Engine
 * Processes events, evaluates state, selects actions, logs results.
 * AI never changes state - rules do.
 */

import { EventType } from "@/lib/types";
import { evaluateState, selectAllowedActions } from "@/lib/state-machine";
import type { LeadState } from "@/lib/types";

export interface EventContext {
  workspaceId: string;
  leadId: string;
  eventType: EventType;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  triggerSource?: string;
  currentState?: LeadState;
}

export interface DecisionResult {
  newState: LeadState;
  fromState: LeadState;
  allowedActions: string[];
  shouldGenerateResponse: boolean;
  transitionOccurred: boolean;
}

/**
 * Main decision function for the event processor.
 * 1. Evaluate state (rule-based)
 * 2. Select allowed actions
 * 3. Determine if we should generate a response
 */
export function processEvent(context: EventContext): DecisionResult {
  const currentState = (context.currentState ?? "NEW") as LeadState;
  const newState = evaluateState(
    currentState,
    context.eventType,
    context.payload
  );
  const allowedActions = selectAllowedActions(newState);
  const transitionOccurred = newState !== currentState;

  // Generate response for inbound messages and timeouts (recovery)
  const shouldGenerateResponse =
    context.eventType === "message_received" ||
    (context.eventType === "no_reply_timeout" && allowedActions.length > 0);

  return {
    newState,
    fromState: currentState,
    allowedActions,
    shouldGenerateResponse,
    transitionOccurred,
  };
}
