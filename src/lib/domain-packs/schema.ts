/**
 * Domain pack config schema — strategy graph, objection tree, regulatory matrix.
 * AI cannot invent states. All definitions live in domain_packs.config_json.
 */

import { z } from "zod";

/** Conversation strategy states. No freeform; only these. */
export const STRATEGY_STATES = [
  "discovery",
  "pain_identification",
  "qualification",
  "authority_check",
  "timeline_check",
  "financial_alignment",
  "objection_handling",
  "offer_positioning",
  "compliance_disclosure",
  "commitment_request",
  "follow_up_lock",
  "escalation",
  "disqualification",
] as const;

export type StrategyState = (typeof STRATEGY_STATES)[number];

export const strategyStateTransitionSchema = z.object({
  from_state: z.string(),
  to_state: z.string(),
  condition: z.string().optional(),
  required_intent: z.string().optional(),
});

export const strategyStateDefinitionSchema = z.object({
  state: z.string(),
  allowed_intents: z.array(z.string()).default([]),
  emotional_posture: z.enum(["neutral", "empathetic", "direct", "supportive", "firm"]).optional().default("neutral"),
  required_phrases: z.array(z.string()).default([]),
  forbidden_phrases: z.array(z.string()).default([]),
  required_disclosures: z.array(z.string()).default([]),
  exit_conditions: z.array(z.string()).default([]),
  transition_rules: z.array(strategyStateTransitionSchema).default([]),
});

export const strategyGraphSchema = z.object({
  states: z.record(z.string(), strategyStateDefinitionSchema),
  initial_state: z.string().default("discovery"),
});

/** Objection tree node: soft redirect, hard redirect, escalation, compliance override, disqualification. */
const objectionNodeSchemaDef: z.ZodType<{
  objection_phrase: string;
  soft_redirect_path?: string;
  hard_redirect_path?: string;
  escalation_threshold?: "none" | "low" | "medium" | "high" | "immediate";
  compliance_override?: string;
  disqualification_condition?: string;
  children?: unknown[];
}> = z.object({
  objection_phrase: z.string(),
  soft_redirect_path: z.string().optional(),
  hard_redirect_path: z.string().optional(),
  escalation_threshold: z.enum(["none", "low", "medium", "high", "immediate"]).optional().default("none"),
  compliance_override: z.string().optional(),
  disqualification_condition: z.string().optional(),
  children: z.array(z.lazy(() => objectionNodeSchemaDef)).optional().default([]),
});
export const objectionNodeSchema = objectionNodeSchemaDef;

export const objectionTreeLibrarySchema = z.record(z.string(), z.array(objectionNodeSchema));

/** Regulatory matrix: enforced pre-send. Violation → approval_required. */
export const regulatoryMatrixSchema = z.object({
  required_disclaimers: z.array(z.object({ when: z.string(), template_key: z.string() })).default([]),
  tcpa_constraints: z.object({ consent_required: z.boolean(), opt_out_required: z.boolean() }).optional(),
  fair_housing_language: z.array(z.string()).default([]),
  insurance_disclosures: z.array(z.string()).default([]),
  debt_collection_disclaimers: z.array(z.string()).default([]),
  hipaa_safe_handling: z.boolean().default(false),
  state_based_quiet_hours: z.record(z.string(), z.object({ start: z.string(), end: z.string(), tz: z.string() })).default({}),
  recording_consent_required: z.boolean().default(false),
  opt_out_enforcement: z.enum(["immediate", "within_24h", "none"]).default("immediate"),
});

export const domainPackConfigSchema = z.object({
  default_jurisdiction: z.string().optional().default("UK"),
  strategy_graph: strategyGraphSchema.optional(),
  objection_tree_library: objectionTreeLibrarySchema.optional(),
  regulatory_matrix: regulatoryMatrixSchema.optional(),
  work_unit_type_overrides: z.record(z.string(), z.object({
    allowed_states: z.array(z.string()).optional(),
    allowed_transitions: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
  })).optional(),
});

export type StrategyStateDefinition = z.infer<typeof strategyStateDefinitionSchema>;
export type StrategyGraph = z.infer<typeof strategyGraphSchema>;
export type ObjectionNode = z.infer<typeof objectionNodeSchema>;
export type ObjectionTreeLibrary = z.infer<typeof objectionTreeLibrarySchema>;
export type RegulatoryMatrix = z.infer<typeof regulatoryMatrixSchema>;
export type DomainPackConfig = z.infer<typeof domainPackConfigSchema>;
