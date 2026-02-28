/**
 * Escalation Summary Intelligence — structured summary when escalate_to_human.
 * No AI freeform. Pure structured logic. Attach to action_intent payload.
 */

import type { CommitmentState } from "./commitment-score";
import type { CommitmentRow } from "./commitment-registry";

export interface EscalationSummary {
  objective_state: { primary: string; secondary?: string };
  commitment_state?: CommitmentState | null;
  objections_raised: number;
  disclosures_delivered: string[];
  emotional_state: string | null;
  risk_score: number;
  open_commitments: Array<{ commitment_type: string; promised_for: string | null }>;
  broken_commitments: number;
  last_3_actions: Array<{ intent_type: string; at?: string }>;
  commitment_score_snapshot?: CommitmentState | null;
  volatility_score: number;
  regulatory_constraints_snapshot: string[];
  cadence_recommendation: string;
  what_not_to_say: string[];
  last_outcome_type: string | null;
  outcome_confidence: string | null;
  last_commitment_status: string | null;
  stage: string | null;
  drift_score: number;
  contradiction_score: number;
  goodwill_score: number;
  escalation_severity: number;
  recommended_next_move: string;
}

export interface BuildEscalationSummaryInput {
  primary_objective?: string | null;
  secondary_objective?: string | null;
  commitment_state?: CommitmentState | null;
  objections_raised?: number;
  disclaimer_lines?: string[];
  emotional_state?: string | null;
  risk_score?: number;
  open_commitments?: CommitmentRow[] | Array<{ commitment_type: string; promised_for?: string | null }>;
  broken_commitments_count?: number;
  last_3_actions?: Array<{ intent_type: string; at?: string }>;
  volatility_score?: number;
  regulatory_constraints_snapshot?: string[];
  cadence_recommendation?: string | null;
  what_not_to_say?: string[];
  last_outcome_type?: string | null;
  outcome_confidence?: string | null;
  last_commitment_status?: string | null;
  stage?: string | null;
  drift_score?: number | null;
  contradiction_score?: number | null;
  goodwill_score?: number | null;
  /** Repeated unknown outcomes count for severity. */
  repeated_unknown_count?: number;
  /** Last outcome type for severity (legal_risk + hostile → 5). */
  last_outcome_type_for_severity?: string | null;
  /** Strategic guard triggered → severity >= 4. */
  strategic_guard_triggered?: boolean;
  /** Workspace pattern pause → severity 5. */
  workspace_pattern_pause?: boolean;
  /** Goodwill < 10 + hostility spike → severity 5. */
  hostility_spike_with_low_goodwill?: boolean;
}

/**
 * Build structured escalation summary. Deterministic. Structured JSON only; no prose generation.
 */
export function buildEscalationSummary(input: BuildEscalationSummaryInput): EscalationSummary {
  const primary = input.primary_objective ?? "escalate";
  const secondary = input.secondary_objective ?? undefined;
  const risk = Number(input.risk_score) ?? 0;
  const objections = Math.max(0, Number(input.objections_raised) ?? 0);
  const disclosures = Array.isArray(input.disclaimer_lines) ? input.disclaimer_lines : [];
  const emotional = input.emotional_state ?? null;
  const openCommitments = Array.isArray(input.open_commitments)
    ? input.open_commitments.map((c) => ({
        commitment_type: c.commitment_type ?? "other",
        promised_for: c.promised_for ?? null,
      }))
    : [];
  const brokenCount = Math.max(0, Number(input.broken_commitments_count) ?? 0);
  const last3 = Array.isArray(input.last_3_actions) ? input.last_3_actions.slice(0, 3) : [];
  const volatility = Number(input.volatility_score) ?? 0;
  const regulatorySnapshot = Array.isArray(input.regulatory_constraints_snapshot) ? input.regulatory_constraints_snapshot : [];
  const cadenceRec = input.cadence_recommendation ?? "Pause automated contact until human review.";
  const whatNotToSay = Array.isArray(input.what_not_to_say) ? input.what_not_to_say : [];
  const lastOutcomeType = input.last_outcome_type ?? null;
  const outcomeConfidence = input.outcome_confidence ?? null;
  const lastCommitmentStatus = input.last_commitment_status ?? null;
  const stage = input.stage ?? null;
  const driftScore = Math.max(0, Math.min(100, Number(input.drift_score) ?? 0));
  const contradictionScore = Math.max(0, Math.min(100, Number(input.contradiction_score) ?? 0));
  const goodwillScore = Math.max(0, Math.min(100, Number(input.goodwill_score) ?? 50));
  const repeatedUnknown = Number(input.repeated_unknown_count) ?? 0;
  const lastForSeverity = input.last_outcome_type_for_severity ?? lastOutcomeType;
  const strategicGuardTriggered = input.strategic_guard_triggered === true;
  const workspacePatternPause = input.workspace_pattern_pause === true;
  const hostilitySpikeLowGoodwill = input.hostility_spike_with_low_goodwill === true;

  let escalation_severity = 2;
  if (workspacePatternPause || hostilitySpikeLowGoodwill) escalation_severity = 5;
  else if (lastForSeverity === "legal_risk" && emotional === "hostile") escalation_severity = 5;
  else if (lastForSeverity === "legal_risk" || lastForSeverity === "hostile") escalation_severity = 5;
  else if (strategicGuardTriggered || brokenCount >= 3) escalation_severity = 4;
  else if (goodwillScore < 15) escalation_severity = 4;
  else if (repeatedUnknown >= 3) escalation_severity = 3;

  let recommended_next_move = "Human review required.";
  if (risk >= 90) recommended_next_move = "Immediate human review. Pause automated contact.";
  else if (objections >= 2) recommended_next_move = "Address objections before next contact.";
  else if (brokenCount >= 2) recommended_next_move = "Address broken commitments before next contact.";
  else if (primary === "escalate") recommended_next_move = "Human review required.";

  return {
    objective_state: { primary, secondary },
    commitment_state: input.commitment_state ?? null,
    objections_raised: objections,
    disclosures_delivered: disclosures,
    emotional_state: emotional,
    risk_score: risk,
    open_commitments: openCommitments,
    broken_commitments: brokenCount,
    last_3_actions: last3,
    commitment_score_snapshot: input.commitment_state ?? null,
    volatility_score: volatility,
    regulatory_constraints_snapshot: regulatorySnapshot,
    cadence_recommendation: cadenceRec,
    what_not_to_say: whatNotToSay,
    last_outcome_type: lastOutcomeType,
    outcome_confidence: outcomeConfidence,
    last_commitment_status: lastCommitmentStatus,
    stage,
    drift_score: driftScore,
    contradiction_score: contradictionScore,
    goodwill_score: goodwillScore,
    escalation_severity,
    recommended_next_move,
  };
}
