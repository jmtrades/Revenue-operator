/**
 * Strategic horizon planner. Deterministic 3-step forward strategy. No GPT.
 */

export type HorizonStep = string;

export interface BuildStrategicHorizonInput {
  stage: string | null;
  primaryObjective?: string | null;
  secondaryObjectives?: string[] | null;
  openQuestionsCount: number;
  brokenCommitmentsCount: number;
  goodwillScore: number;
  riskScore: number;
  driftScore: number;
}

const MAX_HORIZON_LENGTH = 3;

/**
 * Build strategic horizon (max 3 steps). Deterministic mapping only.
 */
export function buildStrategicHorizon(input: BuildStrategicHorizonInput): HorizonStep[] {
  const {
    stage,
    primaryObjective,
    openQuestionsCount,
    brokenCommitmentsCount,
    goodwillScore,
    riskScore,
    driftScore,
  } = input;
  const steps: HorizonStep[] = [];
  const goodwillLow = goodwillScore < 25;
  const riskHigh = riskScore >= 70;
  const driftHigh = driftScore >= 60;

  if (riskHigh) {
    steps.push("compliance_confirm");
    if (stage === "objection_handling") steps.push("address_objection", "verify_resolution");
    else steps.push("reinforce", "close");
    return steps.slice(0, MAX_HORIZON_LENGTH);
  }

  if (goodwillLow) {
    steps.push("trust_rebuild");
  }

  switch (stage) {
    case "information_exchange":
      if (steps.length === 0) steps.push("clarify");
      steps.push("reinforce", "commit");
      break;
    case "objection_handling":
      if (steps.length === 0) steps.push("address_objection");
      steps.push("verify_resolution", "commit");
      break;
    case "commitment_negotiation":
      if (steps.length === 0) steps.push("reinforce_commitment");
      steps.push("confirm_time", "close");
      break;
    case "escalated":
    case "terminated":
      steps.push("handoff", "close");
      break;
    default:
      if (openQuestionsCount > 0) steps.push("clarify");
      if (brokenCommitmentsCount > 0) steps.push("address_objection");
      steps.push("reinforce", "commit");
  }

  if (driftHigh && !steps.includes("verify_resolution")) {
    const idx = steps.findIndex((s) => s === "commit" || s === "close");
    if (idx >= 0) steps.splice(idx, 0, "verify_resolution");
  }

  return steps.slice(0, MAX_HORIZON_LENGTH);
}
