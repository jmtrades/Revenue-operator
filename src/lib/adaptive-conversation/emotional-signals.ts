/**
 * Emotional signal tracking — persisted per thread. Influences strategy transitions only.
 * Never used for generative content. Structured data only.
 */

export interface EmotionalSignals {
  urgency_score: number;
  skepticism_score: number;
  compliance_sensitivity: number;
  aggression_level: number;
  authority_resistance: number;
  trust_requirement: number;
}

export const EMPTY_EMOTIONAL_SIGNALS: EmotionalSignals = {
  urgency_score: 0,
  skepticism_score: 0,
  compliance_sensitivity: 0,
  aggression_level: 0,
  authority_resistance: 0,
  trust_requirement: 0,
};

export function mergeEmotionalSignals(
  current: EmotionalSignals,
  update: Partial<EmotionalSignals>
): EmotionalSignals {
  return {
    urgency_score: clamp(update.urgency_score ?? current.urgency_score),
    skepticism_score: clamp(update.skepticism_score ?? current.skepticism_score),
    compliance_sensitivity: clamp(update.compliance_sensitivity ?? current.compliance_sensitivity),
    aggression_level: clamp(update.aggression_level ?? current.aggression_level),
    authority_resistance: clamp(update.authority_resistance ?? current.authority_resistance),
    trust_requirement: clamp(update.trust_requirement ?? current.trust_requirement),
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, Number(n)));
}
