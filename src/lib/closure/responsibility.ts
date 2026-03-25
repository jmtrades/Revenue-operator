/**
 * Closure Layer — Canonical responsibility state.
 * Every lead is in exactly one responsibility state. No NLP, no heuristics.
 */

import type { CanonicalSignalType } from "@/lib/signals/types";

export const RESPONSIBILITY_STATES = [
  "AWAITING_CUSTOMER_RESPONSE",
  "AWAITING_BUSINESS_DECISION",
  "COMMITMENT_SCHEDULED",
  "COMPLETED",
] as const;

export type ResponsibilityState = (typeof RESPONSIBILITY_STATES)[number];

/** Mapping strictly from canonical signal type to responsibility state. Last signal wins when replaying. */
const SIGNAL_TO_RESPONSIBILITY: Partial<Record<CanonicalSignalType, ResponsibilityState>> = {
  InboundMessageReceived: "AWAITING_BUSINESS_DECISION",
  InboundMessageDiscovered: "AWAITING_BUSINESS_DECISION",
  CustomerReplied: "AWAITING_BUSINESS_DECISION",
  OutboundMessageSent: "AWAITING_CUSTOMER_RESPONSE",
  BookingCreated: "COMMITMENT_SCHEDULED",
  BookingCancelled: "AWAITING_CUSTOMER_RESPONSE",
  AppointmentStarted: "COMMITMENT_SCHEDULED",
  AppointmentCompleted: "COMPLETED",
  AppointmentMissed: "AWAITING_CUSTOMER_RESPONSE",
  PaymentCaptured: "COMPLETED",
  RefundIssued: "COMPLETED",
  HumanReplyDiscovered: "AWAITING_BUSINESS_DECISION",
  BookingModified: "COMMITMENT_SCHEDULED",
};

/** Resolve responsibility state from a single signal type. EscalationCreated is handled in resolver via escalation_logs. */
export function responsibilityFromSignal(signalType: CanonicalSignalType): ResponsibilityState | null {
  return SIGNAL_TO_RESPONSIBILITY[signalType] ?? null;
}

/** Default state when no signal has occurred yet (lead exists but no signals). */
export const DEFAULT_RESPONSIBILITY_STATE: ResponsibilityState = "AWAITING_CUSTOMER_RESPONSE";
