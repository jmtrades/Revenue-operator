/**
 * Drift and contradiction detector. Deterministic. No GPT. No randomness.
 */

import type { OutcomeType } from "./outcome-taxonomy";
import type { ConversationStage } from "./conversation-stage";

export interface DriftDetectorInput {
  /** Last N outcome types (newest first). Bounded. */
  lastOutcomeTypes?: (OutcomeType | string)[] | null;
  /** Last N stages (newest first). */
  lastStages?: (ConversationStage | string)[] | null;
  /** Count of commitment reversals (e.g. promised then broken). */
  commitmentReversalsCount?: number;
  /** Count of topic pivot signals (e.g. intent type flips). */
  topicPivotCount?: number;
  /** Repeated unknown outcomes in window. */
  repeatedUnknownCount?: number;
  /** Max consecutive same outcome that counts as loop. */
  reversalThreshold?: number;
  /** Threshold for repeated unknown to flag. */
  repeatedUnknownThreshold?: number;
}

export interface DriftDetectorResult {
  driftScore: number;
  contradictionScore: number;
  requiresEscalation: boolean;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Compute drift and contradiction scores. Deterministic rules only.
 */
export function evaluateDrift(input: DriftDetectorInput): DriftDetectorResult {
  const {
    lastOutcomeTypes = [],
    lastStages = [],
    commitmentReversalsCount = 0,
    topicPivotCount = 0,
    repeatedUnknownCount = 0,
    reversalThreshold = 2,
    repeatedUnknownThreshold = 3,
  } = input;

  let driftScore = 0;
  let contradictionScore = 0;

  const outcomes = Array.isArray(lastOutcomeTypes) ? lastOutcomeTypes : [];
  const stages = Array.isArray(lastStages) ? lastStages : [];

  for (let i = 0; i < outcomes.length - 1; i++) {
    const curr = outcomes[i];
    const next = outcomes[i + 1];
    if (curr === "payment_promised" && next === "payment_failed") driftScore += 25;
    if (curr === "appointment_confirmed" && next === "appointment_cancelled") driftScore += 20;
    if (curr === "information_provided" && next === "complaint") contradictionScore += 15;
    if (curr === "connected" && next === "opted_out") driftScore += 30;
  }

  for (let i = 0; i < stages.length - 1; i++) {
    const curr = stages[i];
    const next = stages[i + 1];
    if (curr === "closing" && next === "objection_handling") contradictionScore += 20;
    if (curr === "post_commitment" && next === "commitment_negotiation") contradictionScore += 25;
  }

  driftScore += Math.min(30, commitmentReversalsCount * 15);
  driftScore += Math.min(20, topicPivotCount * 5);
  if (repeatedUnknownCount >= repeatedUnknownThreshold) driftScore += 25;
  contradictionScore += Math.min(40, commitmentReversalsCount * 20);

  const d = clamp(driftScore, 0, 100);
  const c = clamp(contradictionScore, 0, 100);
  const requiresEscalation = d >= 70 || c >= 60 || commitmentReversalsCount >= reversalThreshold;

  return {
    driftScore: d,
    contradictionScore: c,
    requiresEscalation,
  };
}
