/**
 * Deterministic tone variation selector.
 * No randomness, no freeform text generation.
 */

export type ToneVariant = "direct" | "warm" | "formal";

export interface ToneSelectionInput {
  domain_type: string;
  emotional_signals: {
    urgency_score?: number | null;
    skepticism_score?: number | null;
    compliance_sensitivity?: number | null;
    aggression_level?: number | null;
    authority_resistance?: number | null;
    trust_requirement?: number | null;
  };
  objection_count: number;
}

export function selectToneVariant(input: ToneSelectionInput): ToneVariant {
  const { domain_type, emotional_signals, objection_count } = input;
  const urgency = clamp(emotional_signals.urgency_score ?? 0);
  const skepticism = clamp(emotional_signals.skepticism_score ?? 0);
  const compliance = clamp(emotional_signals.compliance_sensitivity ?? 0);
  const aggression = clamp(emotional_signals.aggression_level ?? 0);
  const trust = clamp(emotional_signals.trust_requirement ?? 0);

  // Enterprise / regulated domains lean formal when compliance or trust is high.
  const regulatedDomain =
    domain_type === "finance" || domain_type === "clinic" || domain_type === "legal" || domain_type === "insurance";

  // High compliance sensitivity or trust need → formal.
  if (compliance >= 0.6 || trust >= 0.6 || regulatedDomain) {
    return "formal";
  }

  // Multiple objections or high skepticism/aggresion → direct (clear boundaries).
  if (objection_count >= 2 || skepticism >= 0.6 || aggression >= 0.5) {
    return "direct";
  }

  // Mild urgency or neutral → warm.
  if (urgency > 0 || objection_count === 1) {
    return "warm";
  }

  // Default: direct for general, warm for relationship-heavy domains.
  if (domain_type === "real_estate" || domain_type === "recruiting" || domain_type === "home_services") {
    return "warm";
  }

  return "direct";
}

function clamp(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

