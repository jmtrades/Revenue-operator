/**
 * General domain pack — neutral positioning, early escalation on ambiguity.
 * Strict no-advice mode. Limited commitment scope. Compliance-first.
 * Guarantee: General pack cannot create legal or financial exposure.
 */

import type { DomainPackConfig, StrategyStateDefinition } from "./schema";

/** Neutral, compliance-first strategy graph. Early escalation on ambiguity. */
const GENERAL_STRATEGY_STATES: Record<string, StrategyStateDefinition> = {
  discovery: {
    state: "discovery",
    allowed_intents: ["greeting", "question", "clarifying_question"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: ["advice", "recommend", "should", "invest", "guarantee", "promise"],
    required_disclosures: [],
    exit_conditions: ["qualified", "disqualified", "ambiguous"],
    transition_rules: [
      { from_state: "discovery", to_state: "qualification", condition: "default" },
      { from_state: "discovery", to_state: "escalation", required_intent: "opt_out" },
      { from_state: "discovery", to_state: "escalation", condition: "ambiguous" },
    ],
  },
  qualification: {
    state: "qualification",
    allowed_intents: ["question", "clarifying_question"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: ["advice", "recommend", "should", "invest", "guarantee", "promise"],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [
      { from_state: "qualification", to_state: "compliance_disclosure", condition: "default" },
      { from_state: "qualification", to_state: "escalation", required_intent: "opt_out" },
    ],
  },
  compliance_disclosure: {
    state: "compliance_disclosure",
    allowed_intents: ["confirmation", "question"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: ["advice", "recommend", "should", "invest", "guarantee", "promise"],
    required_disclosures: ["identity_disclosure"],
    exit_conditions: [],
    transition_rules: [
      { from_state: "compliance_disclosure", to_state: "commitment_request", required_intent: "confirmation" },
      { from_state: "compliance_disclosure", to_state: "escalation", required_intent: "opt_out" },
    ],
  },
  commitment_request: {
    state: "commitment_request",
    allowed_intents: ["confirmation", "objection"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: ["advice", "recommend", "should", "invest", "guarantee", "promise"],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [
      { from_state: "commitment_request", to_state: "follow_up_lock", required_intent: "confirmation" },
      { from_state: "commitment_request", to_state: "escalation", required_intent: "objection" },
    ],
  },
  follow_up_lock: {
    state: "follow_up_lock",
    allowed_intents: ["confirmation", "reschedule"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: ["advice", "recommend", "should", "invest", "guarantee", "promise"],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [],
  },
  escalation: {
    state: "escalation",
    allowed_intents: [],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [],
  },
  disqualification: {
    state: "disqualification",
    allowed_intents: [],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [],
  },
};

/**
 * Returns the General domain pack config: neutral, no-advice, compliance-first.
 * Use when workspace has domain_type "general" and no or minimal pack config.
 */
export function getGeneralPackConfig(): DomainPackConfig {
  return {
    default_jurisdiction: "UNSPECIFIED",
    strategy_graph: {
      states: GENERAL_STRATEGY_STATES,
      initial_state: "discovery",
    },
    objection_tree_library: {
      default: [
        { objection_phrase: "opt_out", soft_redirect_path: "escalation", hard_redirect_path: "escalation" },
        { objection_phrase: "not_interested", soft_redirect_path: "escalation", hard_redirect_path: "escalation" },
      ],
    },
    regulatory_matrix: {
      required_disclaimers: [],
      fair_housing_language: [],
      insurance_disclosures: [],
      debt_collection_disclaimers: [],
      hipaa_safe_handling: false,
      state_based_quiet_hours: {},
      recording_consent_required: false,
      opt_out_enforcement: "immediate",
    },
  };
}
