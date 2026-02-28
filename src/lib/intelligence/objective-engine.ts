/**
 * Objective Intelligence Layer — deterministic primary/secondary objective resolver.
 * Derived from domain pack, stage, pending commitments, risk. No randomness. No freeform.
 */

export type PrimaryObjective =
  | "book"
  | "qualify"
  | "confirm"
  | "collect"
  | "recover"
  | "close"
  | "retain"
  | "route"
  | "escalate";

export type SecondaryObjective =
  | "reduce_no_show"
  | "extract_missing_info"
  | "reactivate"
  | "reinforce_commitment"
  | "handle_objection"
  | "protect_compliance"
  | "increase_trust";

export interface LeadState {
  strategy_state?: string | null;
  intent_type?: string | null;
  has_pending_commitment?: boolean;
  last_channel?: string | null;
}

export interface ConversationContext {
  conversation_id: string;
  thread_id?: string | null;
  work_unit_id?: string | null;
  domain_type?: string | null;
}

export interface ScenarioProfileForObjectives {
  primary_objective: PrimaryObjective;
  secondary_objectives: SecondaryObjective[];
}

export interface ResolveObjectivesInput {
  workspaceId: string;
  leadState: LeadState;
  conversationContext: ConversationContext;
  /** 0–100; from risk engine when available */
  riskScore?: number;
  /** Use mode: triage, list_execution, recovery, compliance_shield, etc. */
  useModeKey?: string | null;
  /** Resolved scenario profile when set (for list_execution etc.). */
  scenarioProfile?: ScenarioProfileForObjectives | null;
}

export interface ResolveObjectivesResult {
  primary: PrimaryObjective;
  secondary?: SecondaryObjective;
}

/** Map strategy state to primary objective. Deterministic. */
function stateToPrimary(state: string): PrimaryObjective {
  const m: Record<string, PrimaryObjective> = {
    discovery: "qualify",
    pain_identification: "qualify",
    qualification: "qualify",
    authority_check: "qualify",
    timeline_check: "qualify",
    financial_alignment: "qualify",
    objection_handling: "qualify",
    offer_positioning: "close",
    compliance_disclosure: "confirm",
    commitment_request: "book",
    follow_up_lock: "confirm",
    follow_up_scheduled: "confirm",
    confirmation_pending: "confirm",
    escalation: "escalate",
    disqualification: "route",
  };
  return m[state] ?? "qualify";
}

/** Map strategy state to optional secondary. Deterministic. */
function stateToSecondary(
  state: string,
  intentType: string,
  hasPendingCommitment: boolean
): SecondaryObjective | undefined {
  if (state === "objection_handling") return "handle_objection";
  if (state === "compliance_disclosure" || state === "commitment_request") return "protect_compliance";
  if (hasPendingCommitment && (state === "follow_up_lock" || state === "confirmation_pending")) return "reinforce_commitment";
  if (intentType === "follow_up" && state === "discovery") return "extract_missing_info";
  if (state === "escalation" || state === "disqualification") return undefined;
  return undefined;
}

/**
 * Resolve primary and optional secondary objective from domain pack, stage, commitments, risk.
 * Pure deterministic logic. No random. No AI-generated freeform.
 */
export function resolveObjectives(input: ResolveObjectivesInput): ResolveObjectivesResult {
  const {
    leadState,
    conversationContext,
    riskScore = 0,
    useModeKey,
    scenarioProfile,
  } = input;

  const state = leadState.strategy_state ?? "discovery";
  const intentType = leadState.intent_type ?? "follow_up";
  const hasPendingCommitment = leadState.has_pending_commitment ?? false;
  const domainType = conversationContext.domain_type ?? "general";

  // High risk → escalate
  if (riskScore >= 80) {
    return { primary: "escalate" };
  }

  // list_execution with explicit profile: use profile objective
  if (useModeKey === "list_execution" && scenarioProfile) {
    return {
      primary: scenarioProfile.primary_objective,
      secondary: scenarioProfile.secondary_objectives[0],
    };
  }

  // list_execution without profile: route (caller must force preview)
  if (useModeKey === "list_execution") {
    return { primary: "route", secondary: "protect_compliance" };
  }

  // triage: route/qualify/escalate based on risk + state
  if (useModeKey === "triage") {
    if (state === "escalation" || state === "disqualification") return { primary: "escalate" };
    if (riskScore >= 60) return { primary: "escalate" };
    if (state === "discovery" || state === "qualification") return { primary: "qualify", secondary: "extract_missing_info" };
    return { primary: "route", secondary: "protect_compliance" };
  }

  // recovery: recover/collect/retain
  if (useModeKey === "recovery") {
    if (state === "commitment_request" || state === "follow_up_lock") return { primary: "recover", secondary: "reinforce_commitment" };
    return { primary: "recover", secondary: "reactivate" };
  }

  // compliance_shield: secondary always protect_compliance
  if (useModeKey === "compliance_shield") {
    const primary = stateToPrimary(state);
    const secondary = stateToSecondary(state, intentType, hasPendingCommitment) ?? "protect_compliance";
    return { primary, secondary };
  }

  // General domain: neutral, early escalation on ambiguity
  if (domainType === "general") {
    if (state === "escalation" || state === "disqualification") return { primary: "escalate" };
    if (state === "objection_handling") return { primary: "escalate", secondary: "handle_objection" };
    return { primary: "route", secondary: "protect_compliance" };
  }

  const primary = stateToPrimary(state);
  const secondary = stateToSecondary(state, intentType, hasPendingCommitment);

  return { primary, secondary };
}
