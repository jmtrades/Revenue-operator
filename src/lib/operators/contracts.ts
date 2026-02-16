/**
 * Decision Layer — Operator Contracts
 * Each operator defines: trigger conditions, cooldown, max attempts, escalation, human takeover.
 * LLM never decides strategy; only wording after decision is chosen.
 */

import type { LeadState } from "@/lib/types";

export const OPERATOR_IDS = [
  "CAPTURE_OPERATOR",
  "CONVERSION_OPERATOR",
  "ATTENDANCE_OPERATOR",
  "RETENTION_OPERATOR",
] as const;

export type OperatorId = (typeof OPERATOR_IDS)[number];

export interface OperatorContract {
  id: OperatorId;
  /** States in which this operator can run */
  triggerStates: LeadState[];
  /** Cooldown in minutes between actions per lead */
  cooldownMinutes: number;
  /** Max actions per lead per "campaign" window (e.g. 7 days) */
  maxAttemptsPerLead: number;
  /** When to escalate to human (e.g. vip, high_value, anger) */
  escalationRules: string[];
  /** When to require human takeover (opt_out, escalation, approval_required) */
  humanTakeoverConditions: string[];
}

/** Canonical signal types that can trigger this operator (optional filter) */
export const OPERATOR_TRIGGER_SIGNALS: Record<OperatorId, string[]> = {
  CAPTURE_OPERATOR: ["InboundMessageReceived", "CustomerReplied"],
  CONVERSION_OPERATOR: ["InboundMessageReceived", "CustomerReplied", "CustomerInactiveTimeout"],
  ATTENDANCE_OPERATOR: ["BookingCreated", "AppointmentStarted", "CustomerInactiveTimeout"],
  RETENTION_OPERATOR: ["AppointmentMissed", "AppointmentCompleted", "CustomerInactiveTimeout", "CustomerReplied"],
};

export const OPERATOR_CONTRACTS: Record<OperatorId, OperatorContract> = {
  CAPTURE_OPERATOR: {
    id: "CAPTURE_OPERATOR",
    triggerStates: ["NEW", "CONTACTED", "ENGAGED"],
    cooldownMinutes: 0,
    maxAttemptsPerLead: 100,
    escalationRules: ["vip", "high_value", "anger", "negotiation"],
    humanTakeoverConditions: ["opt_out", "escalation", "approval_required"],
  },
  CONVERSION_OPERATOR: {
    id: "CONVERSION_OPERATOR",
    triggerStates: ["ENGAGED", "QUALIFIED"],
    cooldownMinutes: 4 * 60,
    maxAttemptsPerLead: 14,
    escalationRules: ["vip", "high_value", "anger"],
    humanTakeoverConditions: ["opt_out", "escalation", "approval_required"],
  },
  ATTENDANCE_OPERATOR: {
    id: "ATTENDANCE_OPERATOR",
    triggerStates: ["BOOKED"],
    cooldownMinutes: 60,
    maxAttemptsPerLead: 5,
    escalationRules: ["vip"],
    humanTakeoverConditions: ["opt_out", "escalation"],
  },
  RETENTION_OPERATOR: {
    id: "RETENTION_OPERATOR",
    triggerStates: ["SHOWED", "WON", "RETAIN", "REACTIVATE", "LOST"], // + NO_SHOW when state layer adds it
    cooldownMinutes: 24 * 60,
    maxAttemptsPerLead: 10,
    escalationRules: ["vip"],
    humanTakeoverConditions: ["opt_out", "escalation"],
  },
};

export function getOperatorContract(operatorId: OperatorId): OperatorContract {
  return OPERATOR_CONTRACTS[operatorId];
}

export function getOperatorsForState(state: LeadState): OperatorId[] {
  return OPERATOR_IDS.filter((id) => OPERATOR_CONTRACTS[id].triggerStates.includes(state));
}
