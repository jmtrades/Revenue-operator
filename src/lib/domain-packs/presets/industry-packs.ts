/**
 * Industry-coverage modules — vertical presets. Strategy graph, objection tree, compliance matrix.
 * Each pack defines deterministic rules; no AI invents states.
 */

import type { DomainPackConfig } from "../schema";

const BASE_STRATEGY_STATES = {
  discovery: {
    state: "discovery",
    allowed_intents: ["greeting", "question", "clarifying_question"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: ["qualified", "disqualified"],
    transition_rules: [
      { from_state: "discovery", to_state: "pain_identification", condition: "default" },
      { from_state: "discovery", to_state: "disqualification", required_intent: "opt_out" },
    ],
  },
  pain_identification: {
    state: "pain_identification",
    allowed_intents: ["question", "clarifying_question"],
    emotional_posture: "empathetic" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [{ from_state: "pain_identification", to_state: "qualification", condition: "default" }],
  },
  qualification: {
    state: "qualification",
    allowed_intents: ["question", "clarifying_question", "confirmation"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [{ from_state: "qualification", to_state: "commitment_request", condition: "default" }],
  },
  commitment_request: {
    state: "commitment_request",
    allowed_intents: ["confirmation", "objection", "reschedule"],
    emotional_posture: "direct" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [
      { from_state: "commitment_request", to_state: "follow_up_lock", required_intent: "confirmation" },
      { from_state: "commitment_request", to_state: "objection_handling", required_intent: "objection" },
    ],
  },
  objection_handling: {
    state: "objection_handling",
    allowed_intents: ["objection", "clarifying_question", "confirmation"],
    emotional_posture: "supportive" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [
      { from_state: "objection_handling", to_state: "commitment_request", condition: "default" },
      { from_state: "objection_handling", to_state: "escalation", required_intent: "opt_out" },
    ],
  },
  follow_up_lock: {
    state: "follow_up_lock",
    allowed_intents: ["confirmation", "reschedule"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: [],
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
  authority_check: {
    state: "authority_check",
    allowed_intents: ["question", "clarifying_question"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [{ from_state: "authority_check", to_state: "qualification", condition: "default" }],
  },
  timeline_check: {
    state: "timeline_check",
    allowed_intents: ["question", "confirmation"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [{ from_state: "timeline_check", to_state: "commitment_request", condition: "default" }],
  },
  financial_alignment: {
    state: "financial_alignment",
    allowed_intents: ["objection", "clarifying_question", "confirmation"],
    emotional_posture: "supportive" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [
      { from_state: "financial_alignment", to_state: "commitment_request", condition: "default" },
      { from_state: "financial_alignment", to_state: "escalation", required_intent: "opt_out" },
    ],
  },
  offer_positioning: {
    state: "offer_positioning",
    allowed_intents: ["confirmation", "objection"],
    emotional_posture: "direct" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [
      { from_state: "offer_positioning", to_state: "commitment_request", condition: "default" },
      { from_state: "offer_positioning", to_state: "objection_handling", required_intent: "objection" },
    ],
  },
  compliance_disclosure: {
    state: "compliance_disclosure",
    allowed_intents: ["confirmation"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [{ from_state: "compliance_disclosure", to_state: "commitment_request", condition: "default" }],
  },
  follow_up_scheduled: {
    state: "follow_up_scheduled",
    allowed_intents: ["reschedule", "confirmation"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [{ from_state: "follow_up_scheduled", to_state: "follow_up_lock", condition: "default" }],
  },
  confirmation_pending: {
    state: "confirmation_pending",
    allowed_intents: ["confirmation", "objection"],
    emotional_posture: "neutral" as const,
    required_phrases: [],
    forbidden_phrases: [],
    required_disclosures: [],
    exit_conditions: [],
    transition_rules: [
      { from_state: "confirmation_pending", to_state: "follow_up_lock", required_intent: "confirmation" },
      { from_state: "confirmation_pending", to_state: "objection_handling", required_intent: "objection" },
    ],
  },
};

const COMMON_OBJECTION_TREE = [
  {
    objection_phrase: "I need to think",
    soft_redirect_path: "timeline_check",
    escalation_threshold: "low" as const,
    children: [],
  },
  {
    objection_phrase: "I'm not interested",
    soft_redirect_path: "disqualification",
    escalation_threshold: "none" as const,
    disqualification_condition: "hard_no",
    children: [],
  },
  {
    objection_phrase: "Too expensive",
    soft_redirect_path: "financial_alignment",
    escalation_threshold: "medium" as const,
    children: [],
  },
  {
    objection_phrase: "Call later",
    soft_redirect_path: "follow_up_lock",
    escalation_threshold: "none" as const,
    children: [],
  },
  {
    objection_phrase: "Already working with someone",
    soft_redirect_path: "disqualification",
    escalation_threshold: "none" as const,
    disqualification_condition: "existing_provider",
    children: [],
  },
];

/** Voice dominance: objection_tree_library must include these keys per domain pack. */
const OBJECTION_TREE_KEYS = ["default", "price", "timing", "authority", "trust", "spouse", "contract", "risk", "compliance"] as const;

function buildObjectionTreeLibrary(): Record<string, typeof COMMON_OBJECTION_TREE> {
  const lib: Record<string, typeof COMMON_OBJECTION_TREE> = {};
  for (const k of OBJECTION_TREE_KEYS) {
    lib[k] = COMMON_OBJECTION_TREE;
  }
  return lib;
}

const VOICE_OBJECTION_LIBRARY = buildObjectionTreeLibrary();

/** Real Estate Pack: motivated seller, timeline, property condition, offer framing, fair housing. */
export const REAL_ESTATE_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: {
    initial_state: "discovery",
    states: {
      ...BASE_STRATEGY_STATES,
      offer_positioning: {
        state: "offer_positioning",
        allowed_intents: ["confirmation", "objection"],
        emotional_posture: "direct",
        required_phrases: [],
        forbidden_phrases: [],
        required_disclosures: [],
        exit_conditions: [],
        transition_rules: [{ from_state: "offer_positioning", to_state: "commitment_request", condition: "default" }],
      },
    },
  },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: {
    required_disclaimers: [{ when: "offer_discussion", template_key: "fair_housing_disclaimer" }],
    fair_housing_language: ["Equal opportunity", "Fair housing"],
    insurance_disclosures: [],
    debt_collection_disclaimers: [],
    hipaa_safe_handling: false,
    state_based_quiet_hours: {},
    recording_consent_required: false,
    opt_out_enforcement: "immediate",
  },
};

/** Insurance Pack: coverage needs, disclosure enforcement, risk profiling, quote scheduling. */
export const INSURANCE_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: {
    initial_state: "discovery",
    states: BASE_STRATEGY_STATES,
  },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: {
    required_disclaimers: [{ when: "quote", template_key: "insurance_disclosure" }],
    fair_housing_language: [],
    insurance_disclosures: ["Policy terms apply", "Quote subject to underwriting"],
    debt_collection_disclaimers: [],
    hipaa_safe_handling: false,
    state_based_quiet_hours: {},
    recording_consent_required: true,
    opt_out_enforcement: "immediate",
  },
};

/** Solar Pack: utility bill capture, roof qualification, incentive compliance, appointment lock. */
export const SOLAR_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: {
    initial_state: "discovery",
    states: BASE_STRATEGY_STATES,
  },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: {
    required_disclaimers: [{ when: "incentive", template_key: "incentive_compliance" }],
    fair_housing_language: [],
    insurance_disclosures: [],
    debt_collection_disclaimers: [],
    hipaa_safe_handling: false,
    state_based_quiet_hours: {},
    recording_consent_required: false,
    opt_out_enforcement: "immediate",
  },
};

/** Legal Intake Pack: case type detection, conflict check, retainer follow-up. */
export const LEGAL_INTAKE_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: {
    initial_state: "discovery",
    states: BASE_STRATEGY_STATES,
  },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: {
    required_disclaimers: [{ when: "intake", template_key: "attorney_client_disclaimer" }],
    fair_housing_language: [],
    insurance_disclosures: [],
    debt_collection_disclaimers: [],
    hipaa_safe_handling: false,
    state_based_quiet_hours: {},
    recording_consent_required: true,
    opt_out_enforcement: "immediate",
  },
};

const BASE_REGULATORY = {
  fair_housing_language: [] as string[],
  insurance_disclosures: [] as string[],
  debt_collection_disclaimers: [] as string[],
  hipaa_safe_handling: false,
  state_based_quiet_hours: {} as Record<string, { start: string; end: string; tz: string }>,
  recording_consent_required: false,
  opt_out_enforcement: "immediate" as const,
};

/** Mortgage: TILA, state licensing, recording consent. */
export const MORTGAGE_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: { initial_state: "discovery", states: BASE_STRATEGY_STATES },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: {
    required_disclaimers: [{ when: "rate_quote", template_key: "mortgage_disclaimer" }],
    ...BASE_REGULATORY,
    recording_consent_required: true,
  },
};

/** Debt Resolution: FDCPA, debt collection disclaimers, opt-out. */
export const DEBT_RESOLUTION_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: { initial_state: "discovery", states: BASE_STRATEGY_STATES },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: {
    required_disclaimers: [{ when: "debt_discussion", template_key: "fdcpa_disclaimer" }],
    ...BASE_REGULATORY,
    debt_collection_disclaimers: ["This is an attempt to collect a debt."],
    recording_consent_required: true,
  },
};

/** Home Services: appointment, quiet hours, consent. */
export const HOME_SERVICES_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: { initial_state: "discovery", states: BASE_STRATEGY_STATES },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: { required_disclaimers: [], ...BASE_REGULATORY },
};

/** B2B Appointment Setting: no consumer-specific rules; consent. */
export const B2B_APPOINTMENT_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: { initial_state: "discovery", states: BASE_STRATEGY_STATES },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: { required_disclaimers: [], ...BASE_REGULATORY, recording_consent_required: true },
};

/** Agency Services: generic B2B. */
export const AGENCY_SERVICES_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: { initial_state: "discovery", states: BASE_STRATEGY_STATES },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: { required_disclaimers: [], ...BASE_REGULATORY },
};

/** Med Spas: medical consent, no medical advice. */
export const MED_SPAS_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: { initial_state: "discovery", states: BASE_STRATEGY_STATES },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: {
    required_disclaimers: [{ when: "treatment", template_key: "medical_consent_disclaimer" }],
    ...BASE_REGULATORY,
    hipaa_safe_handling: true,
    recording_consent_required: true,
  },
};

/** Clinics: HIPAA-safe, consent. */
export const CLINICS_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: { initial_state: "discovery", states: BASE_STRATEGY_STATES },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: {
    required_disclaimers: [{ when: "intake", template_key: "hipaa_notice" }],
    ...BASE_REGULATORY,
    hipaa_safe_handling: true,
    recording_consent_required: true,
  },
};

/** Financial Advisors: compliance, no advice as solicitation. */
export const FINANCIAL_ADVISORS_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: { initial_state: "discovery", states: BASE_STRATEGY_STATES },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: {
    required_disclaimers: [{ when: "advice_discussion", template_key: "financial_disclaimer" }],
    ...BASE_REGULATORY,
    recording_consent_required: true,
  },
};

/** High-Ticket Coaching: consent, no guarantees. */
export const HIGH_TICKET_COACHING_PACK: DomainPackConfig = {
  default_jurisdiction: "UK",
  strategy_graph: { initial_state: "discovery", states: BASE_STRATEGY_STATES },
  objection_tree_library: VOICE_OBJECTION_LIBRARY,
  regulatory_matrix: {
    required_disclaimers: [{ when: "offer", template_key: "results_disclaimer" }],
    ...BASE_REGULATORY,
  },
};

export const INDUSTRY_PACKS: Record<string, DomainPackConfig> = {
  real_estate: REAL_ESTATE_PACK,
  insurance: INSURANCE_PACK,
  solar: SOLAR_PACK,
  legal: LEGAL_INTAKE_PACK,
  mortgage: MORTGAGE_PACK,
  debt_resolution: DEBT_RESOLUTION_PACK,
  home_services: HOME_SERVICES_PACK,
  b2b_appointment: B2B_APPOINTMENT_PACK,
  agency_services: AGENCY_SERVICES_PACK,
  med_spas: MED_SPAS_PACK,
  clinics: CLINICS_PACK,
  financial_advisors: FINANCIAL_ADVISORS_PACK,
  high_ticket_coaching: HIGH_TICKET_COACHING_PACK,
};

export function getIndustryPackPreset(domainType: string): DomainPackConfig | null {
  return INDUSTRY_PACKS[domainType] ?? null;
}
