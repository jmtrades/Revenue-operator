/**
 * Scenario Universe Registry — pure data + deterministic helpers.
 * Maps scenario categories to allowed objectives, outcome types, next actions, stop reasons.
 * No provider calls. No randomness.
 */

import type { OutcomeType } from "./outcome-taxonomy";
import type { NextRequiredAction } from "./outcome-taxonomy";
import type { StopReason } from "./stop-conditions";
import type { PrimaryObjective } from "./objective-engine";

export const SCENARIO_CATEGORIES = [
  "inbound_triage",
  "list_execution",
  "scheduling",
  "appointment_confirm",
  "appointment_cancel",
  "no_answer_loop",
  "complaint",
  "refund_request",
  "dispute",
  "opt_out",
  "legal_risk",
  "hostile_loop",
  "contradiction_loop",
  "silence_decay",
  "data_request",
  "wrong_number",
  "identity_mismatch",
  "multi_party",
  "payment_promised",
  "payment_made",
  "payment_failed",
  "compliance_disclosure_required",
  "consent_required",
  "escalation_required",
  "unknown",
] as const;

export type ScenarioCategory = (typeof SCENARIO_CATEGORIES)[number];

/** Categories that must never send (mandatory pause or escalate only). */
export const NEVER_SEND_CATEGORIES: readonly ScenarioCategory[] = [
  "opt_out",
  "legal_risk",
  "identity_mismatch",
  "wrong_number",
  "multi_party",
] as const;

export interface ScenarioCategorySpec {
  allowedPrimaryObjectives: PrimaryObjective[];
  allowedOutcomeTypes: OutcomeType[];
  mandatoryNextRequiredAction: NextRequiredAction | null;
  mandatoryStopReasons: StopReason[];
  neverSend: boolean;
}

const SPECS: Record<ScenarioCategory, ScenarioCategorySpec> = {
  inbound_triage: {
    allowedPrimaryObjectives: ["qualify", "route", "escalate"],
    allowedOutcomeTypes: ["information_provided", "information_missing", "routed", "unknown"],
    mandatoryNextRequiredAction: null,
    mandatoryStopReasons: [],
    neverSend: false,
  },
  list_execution: {
    allowedPrimaryObjectives: ["qualify", "confirm", "close", "route"],
    allowedOutcomeTypes: ["information_provided", "no_answer", "routed", "unknown"],
    mandatoryNextRequiredAction: null,
    mandatoryStopReasons: [],
    neverSend: false,
  },
  scheduling: {
    allowedPrimaryObjectives: ["book", "confirm"],
    allowedOutcomeTypes: ["information_provided", "appointment_confirmed", "no_answer", "unknown"],
    mandatoryNextRequiredAction: null,
    mandatoryStopReasons: [],
    neverSend: false,
  },
  appointment_confirm: {
    allowedPrimaryObjectives: ["confirm"],
    allowedOutcomeTypes: ["appointment_confirmed", "no_show", "information_provided", "unknown"],
    mandatoryNextRequiredAction: "none",
    mandatoryStopReasons: [],
    neverSend: false,
  },
  appointment_cancel: {
    allowedPrimaryObjectives: ["route", "escalate"],
    allowedOutcomeTypes: ["appointment_cancelled", "information_provided", "unknown"],
    mandatoryNextRequiredAction: null,
    mandatoryStopReasons: [],
    neverSend: false,
  },
  no_answer_loop: {
    allowedPrimaryObjectives: ["qualify", "route"],
    allowedOutcomeTypes: ["no_answer", "unknown"],
    mandatoryNextRequiredAction: "schedule_followup",
    mandatoryStopReasons: ["repeated_unknown_outcome"],
    neverSend: false,
  },
  complaint: {
    allowedPrimaryObjectives: ["escalate", "route"],
    allowedOutcomeTypes: ["complaint", "information_provided", "escalation_required", "unknown"],
    mandatoryNextRequiredAction: "escalate_to_human",
    mandatoryStopReasons: [],
    neverSend: false,
  },
  refund_request: {
    allowedPrimaryObjectives: ["escalate", "route"],
    allowedOutcomeTypes: ["refund_request", "information_provided", "escalation_required", "unknown"],
    mandatoryNextRequiredAction: "escalate_to_human",
    mandatoryStopReasons: [],
    neverSend: false,
  },
  dispute: {
    allowedPrimaryObjectives: ["escalate"],
    allowedOutcomeTypes: ["dispute", "escalation_required", "unknown"],
    mandatoryNextRequiredAction: "escalate_to_human",
    mandatoryStopReasons: [],
    neverSend: false,
  },
  opt_out: {
    allowedPrimaryObjectives: ["route"],
    allowedOutcomeTypes: ["opted_out"],
    mandatoryNextRequiredAction: "pause_execution",
    mandatoryStopReasons: ["outcome_requires_pause"],
    neverSend: true,
  },
  legal_risk: {
    allowedPrimaryObjectives: ["escalate"],
    allowedOutcomeTypes: ["legal_risk"],
    mandatoryNextRequiredAction: "escalate_to_human",
    mandatoryStopReasons: ["outcome_requires_pause"],
    neverSend: true,
  },
  hostile_loop: {
    allowedPrimaryObjectives: ["escalate"],
    allowedOutcomeTypes: ["hostile", "escalation_required", "unknown"],
    mandatoryNextRequiredAction: "escalate_to_human",
    mandatoryStopReasons: ["excessive_hostility_loop"],
    neverSend: false,
  },
  contradiction_loop: {
    allowedPrimaryObjectives: ["escalate", "qualify"],
    allowedOutcomeTypes: ["unknown", "information_provided"],
    mandatoryNextRequiredAction: "escalate_to_human",
    mandatoryStopReasons: [],
    neverSend: false,
  },
  silence_decay: {
    allowedPrimaryObjectives: ["recover", "qualify"],
    allowedOutcomeTypes: ["no_answer", "unknown"],
    mandatoryNextRequiredAction: "schedule_followup",
    mandatoryStopReasons: [],
    neverSend: false,
  },
  data_request: {
    allowedPrimaryObjectives: ["escalate", "route"],
    allowedOutcomeTypes: ["information_provided", "escalation_required", "unknown"],
    mandatoryNextRequiredAction: null,
    mandatoryStopReasons: [],
    neverSend: false,
  },
  wrong_number: {
    allowedPrimaryObjectives: ["route"],
    allowedOutcomeTypes: ["wrong_number"],
    mandatoryNextRequiredAction: "pause_execution",
    mandatoryStopReasons: [],
    neverSend: true,
  },
  identity_mismatch: {
    allowedPrimaryObjectives: ["escalate", "route"],
    allowedOutcomeTypes: ["unknown"],
    mandatoryNextRequiredAction: "escalate_to_human",
    mandatoryStopReasons: [],
    neverSend: true,
  },
  multi_party: {
    allowedPrimaryObjectives: ["escalate"],
    allowedOutcomeTypes: ["unknown"],
    mandatoryNextRequiredAction: "escalate_to_human",
    mandatoryStopReasons: [],
    neverSend: true,
  },
  payment_promised: {
    allowedPrimaryObjectives: ["collect", "confirm"],
    allowedOutcomeTypes: ["payment_promised", "information_provided", "unknown"],
    mandatoryNextRequiredAction: "record_commitment",
    mandatoryStopReasons: [],
    neverSend: false,
  },
  payment_made: {
    allowedPrimaryObjectives: ["close"],
    allowedOutcomeTypes: ["payment_made"],
    mandatoryNextRequiredAction: "none",
    mandatoryStopReasons: [],
    neverSend: false,
  },
  payment_failed: {
    allowedPrimaryObjectives: ["collect", "escalate"],
    allowedOutcomeTypes: ["payment_failed", "unknown"],
    mandatoryNextRequiredAction: "schedule_followup",
    mandatoryStopReasons: [],
    neverSend: false,
  },
  compliance_disclosure_required: {
    allowedPrimaryObjectives: ["confirm"],
    allowedOutcomeTypes: ["information_provided", "unknown"],
    mandatoryNextRequiredAction: "request_disclosure_confirmation",
    mandatoryStopReasons: ["disclosure_incomplete"],
    neverSend: false,
  },
  consent_required: {
    allowedPrimaryObjectives: ["confirm"],
    allowedOutcomeTypes: ["information_provided", "unknown"],
    mandatoryNextRequiredAction: "request_disclosure_confirmation",
    mandatoryStopReasons: ["consent_missing"],
    neverSend: false,
  },
  escalation_required: {
    allowedPrimaryObjectives: ["escalate"],
    allowedOutcomeTypes: ["escalation_required", "hostile", "legal_risk", "unknown"],
    mandatoryNextRequiredAction: "escalate_to_human",
    mandatoryStopReasons: [],
    neverSend: false,
  },
  unknown: {
    allowedPrimaryObjectives: ["qualify", "route", "escalate"],
    allowedOutcomeTypes: ["unknown"],
    mandatoryNextRequiredAction: "request_disclosure_confirmation",
    mandatoryStopReasons: [],
    neverSend: false,
  },
};

export function getScenarioSpec(category: ScenarioCategory): ScenarioCategorySpec {
  return SPECS[category] ?? SPECS.unknown;
}

export function isNeverSendCategory(category: ScenarioCategory): boolean {
  return getScenarioSpec(category).neverSend;
}

export function isAllowedOutcomeForCategory(category: ScenarioCategory, outcomeType: OutcomeType): boolean {
  const spec = getScenarioSpec(category);
  return spec.allowedOutcomeTypes.includes(outcomeType);
}

export function getMandatoryNextAction(category: ScenarioCategory): NextRequiredAction | null {
  return getScenarioSpec(category).mandatoryNextRequiredAction;
}
