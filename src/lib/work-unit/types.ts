/**
 * Work Unit Types — deterministic, append-only governance.
 * All vertical revenue interactions map to these types. No AI decides states.
 * State machine definitions live in domain packs; this module defines canonical types and completion rules.
 *
 * Spec (III): lead_acquisition, appointment, payment_obligation, contract_generation, disclosure_confirmation,
 * outbound_campaign_execution, compliance_review, verbal_consent_record, followup_commitment, escalation_event,
 * document_request, cross_party_confirmation.
 */

/** Universal work unit types from system spec (III). */
export const SPEC_WORK_UNIT_TYPES = [
  "lead_acquisition",
  "appointment",
  "payment_obligation",
  "contract_generation",
  "disclosure_confirmation",
  "outbound_campaign_execution",
  "compliance_review",
  "verbal_consent_record",
  "followup_commitment",
  "escalation_event",
  "document_request",
  "cross_party_confirmation",
] as const;

export const WORK_UNIT_TYPES = [
  ...SPEC_WORK_UNIT_TYPES,
  "shared_transaction",
  "inbound_lead",
  "outbound_prospect",
  "qualification_call",
  "compliance_notice",
  "contract_execution",
  "retention_cycle",
  "dispute_resolution",
] as const;

export type WorkUnitType = (typeof WORK_UNIT_TYPES)[number];

export interface WorkUnitTypeDefinition {
  type: WorkUnitType;
  allowed_states: readonly string[];
  required_confirmations: boolean;
  completion_requires_evidence: boolean;
  completion_requires_payment: boolean;
  completion_requires_third_party: boolean;
  allows_internal_close: boolean;
  responsible_actor_role: "system" | "operator" | "closer" | "compliance" | "auditor";
  escalation_triggers: readonly string[];
}

/** Canonical definitions. Domain packs may override allowed_states/transitions per domain. */
export const WORK_UNIT_TYPE_DEFINITIONS: Record<WorkUnitType, WorkUnitTypeDefinition> = {
  lead_acquisition: {
    type: "lead_acquisition",
    allowed_states: ["new", "contacted", "qualified", "disqualified", "converted", "lost"],
    required_confirmations: true,
    completion_requires_evidence: false,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "operator",
    escalation_triggers: ["complaint", "legal_sensitivity", "opt_out"],
  },
  disclosure_confirmation: {
    type: "disclosure_confirmation",
    allowed_states: ["pending", "presented", "acknowledged", "expired", "refused"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "compliance",
    escalation_triggers: ["refused", "expiry_imminent"],
  },
  outbound_campaign_execution: {
    type: "outbound_campaign_execution",
    allowed_states: ["queued", "contacted", "engaged", "qualified", "disqualified", "converted", "unreachable"],
    required_confirmations: true,
    completion_requires_evidence: false,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "closer",
    escalation_triggers: ["complaint", "opt_out", "compliance_risk"],
  },
  compliance_review: {
    type: "compliance_review",
    allowed_states: ["pending", "in_review", "approved", "rejected", "escalated"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "compliance",
    escalation_triggers: ["regulatory", "jurisdiction_mismatch"],
  },
  verbal_consent_record: {
    type: "verbal_consent_record",
    allowed_states: ["pending", "captured", "verified", "disputed"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "compliance",
    escalation_triggers: ["disputed", "recording_failed"],
  },
  escalation_event: {
    type: "escalation_event",
    allowed_states: ["open", "assigned", "in_progress", "resolved", "closed"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "operator",
    escalation_triggers: ["timeout", "re_escalation"],
  },
  contract_generation: {
    type: "contract_generation",
    allowed_states: ["draft", "pending_signature", "signed", "voided", "expired"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "operator",
    escalation_triggers: ["dispute", "legal_review"],
  },
  cross_party_confirmation: {
    type: "cross_party_confirmation",
    allowed_states: ["pending", "acknowledged", "disputed", "expired"],
    required_confirmations: true,
    completion_requires_evidence: false,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "system",
    escalation_triggers: ["dispute", "expiry_imminent"],
  },
  shared_transaction: {
    type: "shared_transaction",
    allowed_states: ["pending", "acknowledged", "disputed", "expired"],
    required_confirmations: true,
    completion_requires_evidence: false,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "system",
    escalation_triggers: ["dispute", "expiry_imminent"],
  },
  inbound_lead: {
    type: "inbound_lead",
    allowed_states: ["new", "contacted", "qualified", "disqualified", "converted", "lost"],
    required_confirmations: true,
    completion_requires_evidence: false,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "operator",
    escalation_triggers: ["complaint", "legal_sensitivity", "opt_out"],
  },
  outbound_prospect: {
    type: "outbound_prospect",
    allowed_states: ["queued", "contacted", "engaged", "qualified", "disqualified", "converted", "unreachable"],
    required_confirmations: true,
    completion_requires_evidence: false,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "closer",
    escalation_triggers: ["complaint", "opt_out", "compliance_risk"],
  },
  qualification_call: {
    type: "qualification_call",
    allowed_states: ["scheduled", "in_progress", "completed", "no_show", "cancelled", "rescheduled"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "closer",
    escalation_triggers: ["recording_consent_denied", "complaint", "compliance_risk"],
  },
  appointment: {
    type: "appointment",
    allowed_states: ["proposed", "confirmed", "attended", "no_show", "cancelled", "rescheduled"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "operator",
    escalation_triggers: ["no_show", "dispute", "reschedule_loop"],
  },
  followup_commitment: {
    type: "followup_commitment",
    allowed_states: ["pending", "scheduled", "completed", "cancelled", "overdue"],
    required_confirmations: true,
    completion_requires_evidence: false,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: true,
    responsible_actor_role: "system",
    escalation_triggers: ["overdue", "opt_out"],
  },
  payment_obligation: {
    type: "payment_obligation",
    allowed_states: ["pending", "reminded", "paid", "overdue", "cancelled", "disputed"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: true,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "system",
    escalation_triggers: ["dispute", "debt_collection_boundary"],
  },
  document_request: {
    type: "document_request",
    allowed_states: ["requested", "received", "verified", "rejected", "overdue"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "operator",
    escalation_triggers: ["overdue", "compliance_required"],
  },
  compliance_notice: {
    type: "compliance_notice",
    allowed_states: ["pending", "delivered", "acknowledged", "expired"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "compliance",
    escalation_triggers: ["delivery_failed", "expiry_imminent"],
  },
  contract_execution: {
    type: "contract_execution",
    allowed_states: ["draft", "pending_signature", "signed", "voided", "expired"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: false,
    responsible_actor_role: "operator",
    escalation_triggers: ["dispute", "legal_review"],
  },
  retention_cycle: {
    type: "retention_cycle",
    allowed_states: ["due", "contacted", "renewed", "churned", "cancelled"],
    required_confirmations: true,
    completion_requires_evidence: false,
    completion_requires_payment: false,
    completion_requires_third_party: false,
    allows_internal_close: true,
    responsible_actor_role: "operator",
    escalation_triggers: ["churn_risk", "complaint"],
  },
  dispute_resolution: {
    type: "dispute_resolution",
    allowed_states: ["open", "investigating", "resolved", "escalated", "closed"],
    required_confirmations: true,
    completion_requires_evidence: true,
    completion_requires_payment: false,
    completion_requires_third_party: true,
    allows_internal_close: false,
    responsible_actor_role: "compliance",
    escalation_triggers: ["legal", "regulatory"],
  },
};

export function getWorkUnitTypeDefinition(type: string): WorkUnitTypeDefinition | null {
  if (WORK_UNIT_TYPES.includes(type as WorkUnitType)) {
    return WORK_UNIT_TYPE_DEFINITIONS[type as WorkUnitType];
  }
  return null;
}

export function isAllowedState(workUnitType: WorkUnitType, state: string): boolean {
  const def = WORK_UNIT_TYPE_DEFINITIONS[workUnitType];
  return def?.allowed_states.includes(state) ?? false;
}
