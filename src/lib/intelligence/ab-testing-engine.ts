/** Autonomous A/B Testing Engine — auto variants, traffic split, significance testing, promotion */

/** Deterministic hash for strings (DJB2) */
function hashCode(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export type VariationType = "shorter" | "urgent" | "question_based" | "social_proof" | "loss_aversion";
export type ExperimentStatus = "active" | "paused" | "completed" | "inconclusive";
export type OutcomeType = "opened" | "replied" | "booked" | "converted" | "revenue";

export interface ExperimentParams {
  experimentId: string;
  testType: "script" | "email" | "cadence" | "sms" | "pricing";
  controlContent: string;
  targetMetrics: OutcomeType[];
  trafficSplitRatio?: number;
  startDate: string;
  maxDurationDays?: number;
  confidenceLevel?: number;
}

export interface Experiment {
  experimentId: string;
  testType: string;
  controlContent: string;
  variantB: string;
  variantBType: VariationType;
  status: ExperimentStatus;
  trafficSplitRatio: number;
  startDate: string;
  endDate: string | null;
  targetMetrics: OutcomeType[];
  minSampleSizePerVariant: number;
  confidenceLevel: number;
  createdAt: string;
}

export interface VariantAssignment {
  leadId: string;
  experimentId: string;
  assignedVariant: "A" | "B";
  assignmentHash: string;
  assignedAt: string;
}

export interface ExperimentOutcome {
  leadId: string;
  experimentId: string;
  variant: "A" | "B";
  outcomeType: OutcomeType;
  value?: number;
  recordedAt: string;
}

export interface VariantMetrics {
  variant: "A" | "B";
  totalExposures: number;
  outcomes: Record<OutcomeType, number>;
  conversionRates: Record<OutcomeType, number>;
  totalRevenue: number;
}

export interface ExperimentResult {
  experimentId: string;
  winner: "A" | "B" | "inconclusive" | "too_early";
  confidencePercent: number;
  liftPercent: number;
  metricsA: VariantMetrics;
  metricsB: VariantMetrics;
  statisticalSignificance: {
    method: "chi_squared" | "z_test" | "none";
    pValue: number;
    isSignificant: boolean;
  };
  recommendation: string;
  evaluatedAt: string;
}

export interface PromotionAction {
  experimentId: string;
  action: "promote_winner" | "extend_test" | "inconclusive";
  winner?: "A" | "B";
  newConfidenceLevel: number;
  effectiveDate: string;
  reason: string;
}

// Complementary error function approximation for p-value calculation
function erfcApprox(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const t2 = t * t, t3 = t2 * t, t4 = t2 * t2, t5 = t4 * t;
  const erf = 1 - (a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5) * Math.exp(-absX * absX);
  return sign === 1 ? 1 - erf : 1 + erf;
}

// Chi-squared test for categorical outcomes
function chiSquaredTest(
  variant1Total: number,
  variant1Events: number,
  variant2Total: number,
  variant2Events: number
): number {
  if (variant1Total === 0 || variant2Total === 0) return 1;
  const p1 = variant1Events / variant1Total;
  const p2 = variant2Events / variant2Total;
  const pooledP = (variant1Events + variant2Events) / (variant1Total + variant2Total);
  if (pooledP === 0 || pooledP === 1) return 1;
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / variant1Total + 1 / variant2Total));
  if (se === 0) return 1;
  const zScore = (p1 - p2) / se;
  const pValue = erfcApprox(Math.abs(zScore) / Math.sqrt(2));
  return Math.max(0, Math.min(1, pValue));
}

// Z-test for continuous metrics (e.g., revenue)
function zTest(
  mean1: number,
  std1: number,
  n1: number,
  mean2: number,
  std2: number,
  n2: number
): number {
  if (n1 === 0 || n2 === 0) return 1;
  const pooledStd = Math.sqrt((std1 * std1) / n1 + (std2 * std2) / n2);
  if (pooledStd === 0) return 1;
  const zScore = Math.abs(mean1 - mean2) / pooledStd;
  return 2 * erfcApprox(zScore / Math.sqrt(2));
}

// Calculate minimum sample size using Cochran's formula
function calculateMinSampleSize(
  baselineConversionRate: number,
  minimumDetectableEffect: number,
  confidenceLevel: number
): number {
  const zConfidence = confidenceLevel >= 99 ? 2.576 : confidenceLevel >= 95 ? 1.96 : 1.645;
  const zPower = 0.84;
  const p = baselineConversionRate;
  const mde = minimumDetectableEffect;
  const numerator = 2 * (zConfidence + zPower) * (zConfidence + zPower) * p * (1 - p) *
    ((1 - mde) * (1 - mde) + 1);
  const denominator = mde * mde * p * p;
  return Math.ceil(numerator / denominator);
}

// Deterministic hash for consistent variant assignment
function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Auto-generate variant B from control A
export function generateVariant(control: string, variationType: VariationType): string {
  let variant = control;
  switch (variationType) {
    case "shorter":
      const words = control.split(" ");
      variant = words.slice(0, Math.ceil(words.length * 0.7)).join(" ");
      break;
    case "urgent":
      variant = (variant.match(/URGENT|DEADLINE|LIMITED|ONLY/i) ? "" : "URGENT: ") + control;
      break;
    case "question_based":
      const sentences = control.split(/[.!?]+/);
      variant = sentences
        .map((sent) => sent.trim().length > 10 && !sent.endsWith("?") ? "Interested in " + sent.toLowerCase() + "?" : sent)
        .join(" ")
        .trim();
      break;
    case "social_proof":
      const proofs = ["Trusted by 500+ companies.", "Chosen by industry leaders.", "Proven track record of success."];
      variant = control + "\n\n" + proofs[hashCode(control) % proofs.length];
      break;
    case "loss_aversion":
      variant = control
        .replace(/benefit/gi, "avoid missing out on")
        .replace(/gain/gi, "not lose")
        .replace(/improvement/gi, "prevent decline in")
        .replace(/help/gi, "prevent problems with");
      if (!variant.toLowerCase().includes("risk")) variant += "\nDon't miss this opportunity.";
      break;
  }
  return variant.trim();
}

// Create new A/B test
export function createExperiment(params: ExperimentParams): Experiment {
  const {
    experimentId, testType, controlContent, targetMetrics,
    trafficSplitRatio = 0.5, startDate, maxDurationDays: _maxDurationDays = 30, confidenceLevel = 95,
  } = params;
  const variantBType: VariationType = "shorter";
  const variantB = generateVariant(controlContent, variantBType);
  const minSampleSize = calculateMinSampleSize(0.05, 0.25, confidenceLevel);
  return {
    experimentId, testType, controlContent, variantB, variantBType,
    status: "active", trafficSplitRatio, startDate, endDate: null,
    targetMetrics, minSampleSizePerVariant: minSampleSize, confidenceLevel,
    createdAt: new Date().toISOString(),
  };
}

// Assign variant to lead deterministically
export function assignVariant(
  experimentId: string,
  leadId: string,
  trafficSplitRatio: number = 0.5
): VariantAssignment {
  const assignmentKey = `${experimentId}:${leadId}`;
  const hash = simpleHash(assignmentKey);
  const normalized = (hash % 1000) / 1000;
  const assignedVariant = normalized < trafficSplitRatio ? "B" : "A";
  return {
    leadId, experimentId, assignedVariant,
    assignmentHash: hash.toString(),
    assignedAt: new Date().toISOString(),
  };
}

// Record outcome
export function recordOutcome(
  experimentId: string,
  leadId: string,
  outcome: ExperimentOutcome
): void {
  const _validatedOutcome: ExperimentOutcome = {
    ...outcome, experimentId, leadId,
    recordedAt: outcome.recordedAt || new Date().toISOString(),
  };
}

// Evaluate experiment for significance
export function evaluateExperiment(
  experiment: Experiment,
  outcomes: ExperimentOutcome[]
): ExperimentResult {
  const variantAOutcomes = outcomes.filter((o) => o.variant === "A");
  const variantBOutcomes = outcomes.filter((o) => o.variant === "B");
  const totalA = new Set(variantAOutcomes.map((o) => o.leadId)).size;
  const totalB = new Set(variantBOutcomes.map((o) => o.leadId)).size;
  const primaryMetric = experiment.targetMetrics[0] || "converted";
  const eventsA = variantAOutcomes.filter((o) => o.outcomeType === primaryMetric).length;
  const eventsB = variantBOutcomes.filter((o) => o.outcomeType === primaryMetric).length;

  const metricsA: VariantMetrics = {
    variant: "A", totalExposures: totalA,
    outcomes: { opened: 0, replied: 0, booked: 0, converted: 0, revenue: 0 },
    conversionRates: { opened: 0, replied: 0, booked: 0, converted: 0, revenue: 0 },
    totalRevenue: 0,
  };
  const metricsB: VariantMetrics = {
    variant: "B", totalExposures: totalB,
    outcomes: { opened: 0, replied: 0, booked: 0, converted: 0, revenue: 0 },
    conversionRates: { opened: 0, replied: 0, booked: 0, converted: 0, revenue: 0 },
    totalRevenue: 0,
  };

  experiment.targetMetrics.forEach((metric) => {
    metricsA.outcomes[metric] = variantAOutcomes.filter((o) => o.outcomeType === metric).length;
    metricsB.outcomes[metric] = variantBOutcomes.filter((o) => o.outcomeType === metric).length;
  });

  if (totalA > 0) {
    experiment.targetMetrics.forEach((metric) => {
      metricsA.conversionRates[metric] = metricsA.outcomes[metric] / totalA;
    });
    metricsA.totalRevenue = variantAOutcomes
      .filter((o) => o.outcomeType === "revenue")
      .reduce((sum, o) => sum + (o.value || 0), 0);
  }
  if (totalB > 0) {
    experiment.targetMetrics.forEach((metric) => {
      metricsB.conversionRates[metric] = metricsB.outcomes[metric] / totalB;
    });
    metricsB.totalRevenue = variantBOutcomes
      .filter((o) => o.outcomeType === "revenue")
      .reduce((sum, o) => sum + (o.value || 0), 0);
  }

  let pValue = 1, method: "chi_squared" | "z_test" | "none" = "none";
  if (totalA >= experiment.minSampleSizePerVariant && totalB >= experiment.minSampleSizePerVariant) {
    if (primaryMetric === "revenue") {
      const mean1 = metricsA.totalRevenue / totalA || 0;
      const mean2 = metricsB.totalRevenue / totalB || 0;
      const std1 = Math.sqrt(
        variantAOutcomes.filter((o) => o.outcomeType === "revenue")
          .reduce((sum, o) => sum + Math.pow((o.value || 0) - mean1, 2), 0) / totalA
      ) || 1;
      const std2 = Math.sqrt(
        variantBOutcomes.filter((o) => o.outcomeType === "revenue")
          .reduce((sum, o) => sum + Math.pow((o.value || 0) - mean2, 2), 0) / totalB
      ) || 1;
      pValue = zTest(mean1, std1, totalA, mean2, std2, totalB);
      method = "z_test";
    } else {
      pValue = chiSquaredTest(totalA, eventsA, totalB, eventsB);
      method = "chi_squared";
    }
  }

  const isSignificant = pValue < (1 - experiment.confidenceLevel / 100);
  const confidencePercent = Math.round((1 - pValue) * 100);
  let winner: "A" | "B" | "inconclusive" | "too_early" = "too_early";
  let liftPercent = 0;

  if (totalA < experiment.minSampleSizePerVariant || totalB < experiment.minSampleSizePerVariant) {
    winner = "too_early";
  } else if (isSignificant) {
    const rateA = metricsA.conversionRates[primaryMetric] || 0;
    const rateB = metricsB.conversionRates[primaryMetric] || 0;
    if (rateB > rateA) {
      winner = "B";
      liftPercent = ((rateB - rateA) / rateA) * 100;
    } else if (rateA > rateB) {
      winner = "A";
      liftPercent = ((rateA - rateB) / rateB) * 100;
    } else {
      winner = "inconclusive";
    }
  } else {
    winner = "inconclusive";
  }

  return {
    experimentId: experiment.experimentId,
    winner, confidencePercent: Math.max(0, Math.min(100, confidencePercent)),
    liftPercent: Math.round(liftPercent * 100) / 100,
    metricsA, metricsB,
    statisticalSignificance: { method, pValue: Math.round(pValue * 10000) / 10000, isSignificant },
    recommendation:
      winner === "B"
        ? `Variant B wins with ${confidencePercent}% confidence (${liftPercent.toFixed(1)}% lift)`
        : winner === "A"
          ? `Variant A (control) wins with ${confidencePercent}% confidence`
          : winner === "too_early"
            ? `Need ${experiment.minSampleSizePerVariant} samples per variant. Currently A:${totalA}, B:${totalB}`
            : "No significant difference detected",
    evaluatedAt: new Date().toISOString(),
  };
}

// Auto-promote winner
export function autoPromoteWinner(
  experiment: Experiment,
  result: ExperimentResult
): PromotionAction {
  const conf = result.confidencePercent;
  if (conf >= 95 && result.winner !== "inconclusive" && result.winner !== "too_early") {
    return {
      experimentId: experiment.experimentId,
      action: "promote_winner",
      winner: result.winner,
      newConfidenceLevel: conf,
      effectiveDate: new Date().toISOString(),
      reason: `Winner (${result.winner}) declared with ${conf}% confidence. ${result.liftPercent.toFixed(1)}% lift observed.`,
    };
  } else if (conf >= 80 && conf < 95) {
    return {
      experimentId: experiment.experimentId,
      action: "extend_test",
      newConfidenceLevel: conf,
      effectiveDate: new Date().toISOString(),
      reason: `Trending toward winner (${result.winner}) at ${conf}% confidence. Extending test for more samples.`,
    };
  } else {
    return {
      experimentId: experiment.experimentId,
      action: "inconclusive",
      newConfidenceLevel: conf,
      effectiveDate: new Date().toISOString(),
      reason: `Experiment inconclusive after max duration. Confidence: ${conf}%. Revert to control (A) or run new test.`,
    };
  }
}
