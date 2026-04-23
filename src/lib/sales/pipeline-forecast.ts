/**
 * Phase 20 — Pipeline forecasting.
 *
 * Stage-weighted + velocity-adjusted forecast for a set of open opportunities.
 *
 * Formula per deal:
 *   contribution =
 *     amount
 *     × stageWeight(stage)
 *     × velocityFactor(daysInStage, stageMedianDays)
 *     × slipFactor(daysToCloseDate, expectedStageDuration)
 *
 * Where:
 *   stageWeight        — calibrated historical win-rate by stage, 0..1.
 *   velocityFactor     — penalty when a deal sits >2× median time in its
 *                        current stage (stalled deals close less often).
 *                        1.0 when fresh, decays linearly to 0.5 at 3× median.
 *   slipFactor         — penalty when close date has slipped past expected
 *                        stage duration. 1.0 when on-time, 0.6 at +30 days,
 *                        floors at 0.3.
 *
 * Returns:
 *   committed:       deals at stage weight >= 0.8
 *   bestCase:        sum of contributions for all deals weight >= 0.4
 *   pipeline:        raw sum of open-deal amounts (no weighting)
 *   weightedForecast: sum of all contributions (the operative forecast)
 *   detail:          per-deal contribution breakdown
 *
 * Pure — no DB, no network. Callers pass stage weights + median durations.
 */

export interface PipelineStageCalibration {
  /** Stage name as it appears in your CRM. */
  stage: string;
  /** Historical win-rate for deals in this stage, 0..1. */
  weight: number;
  /** Median days a deal typically spends in this stage before advancing. */
  medianDays: number;
}

export interface PipelineDeal {
  id: string;
  amount: number;
  stage: string;
  /** ISO date the deal entered the current stage. */
  stageEnteredAt: string;
  /** Expected close date (ISO). */
  expectedCloseDate: string;
  /** Owner for grouping. */
  ownerId?: string | null;
}

export interface PipelineForecastInput {
  deals: readonly PipelineDeal[];
  stages: readonly PipelineStageCalibration[];
  /** "As of" moment (ISO). Defaults to now. */
  now?: string;
}

export interface PipelineForecastDetail {
  dealId: string;
  amount: number;
  stage: string;
  stageWeight: number;
  velocityFactor: number;
  slipFactor: number;
  contribution: number;
  daysInStage: number;
  daysToClose: number;
}

export interface PipelineForecast {
  pipeline: number;
  committed: number;
  bestCase: number;
  weightedForecast: number;
  detail: PipelineForecastDetail[];
  /** Per-owner breakdown. */
  byOwner: Record<string, { weightedForecast: number; pipeline: number; deals: number }>;
}

const DEFAULT_STAGES: PipelineStageCalibration[] = [
  { stage: "prospect", weight: 0.05, medianDays: 14 },
  { stage: "qualified", weight: 0.15, medianDays: 10 },
  { stage: "discovery", weight: 0.3, medianDays: 10 },
  { stage: "demo", weight: 0.45, medianDays: 7 },
  { stage: "proposal", weight: 0.6, medianDays: 10 },
  { stage: "negotiation", weight: 0.75, medianDays: 14 },
  { stage: "verbal", weight: 0.9, medianDays: 7 },
  { stage: "contract_out", weight: 0.95, medianDays: 5 },
];

export function getDefaultStageCalibration(): PipelineStageCalibration[] {
  return DEFAULT_STAGES.map((s) => ({ ...s }));
}

function daysBetween(a: string, b: string): number {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return Math.floor((tb - ta) / 86_400_000);
}

function velocityFactor(daysInStage: number, medianDays: number): number {
  if (medianDays <= 0) return 1;
  const ratio = daysInStage / medianDays;
  if (ratio <= 1) return 1;
  if (ratio >= 3) return 0.5;
  return 1 - ((ratio - 1) / 2) * 0.5;
}

function slipFactor(daysToClose: number): number {
  // On-time (daysToClose >= 0) → 1.0.
  // Slipped past close date → linear decay: -30 days → 0.6, -60 days → 0.3 floor.
  if (daysToClose >= 0) return 1;
  const slipped = -daysToClose;
  if (slipped <= 30) return 1 - (slipped / 30) * 0.4;
  return Math.max(0.3, 0.6 - ((slipped - 30) / 30) * 0.3);
}

export function forecastPipeline(input: PipelineForecastInput): PipelineForecast {
  const now = input.now ?? new Date().toISOString();
  const stageMap = new Map<string, PipelineStageCalibration>();
  for (const s of input.stages) stageMap.set(s.stage.toLowerCase(), s);

  const detail: PipelineForecastDetail[] = [];
  let pipeline = 0;
  let committed = 0;
  let bestCase = 0;
  let weightedForecast = 0;
  const byOwner: Record<string, { weightedForecast: number; pipeline: number; deals: number }> = {};

  for (const d of input.deals) {
    const calib =
      stageMap.get(d.stage.toLowerCase()) ??
      DEFAULT_STAGES.find((s) => s.stage === d.stage.toLowerCase()) ?? {
        stage: d.stage,
        weight: 0.2,
        medianDays: 14,
      };

    const daysInStage = Math.max(0, daysBetween(d.stageEnteredAt, now));
    const daysToClose = daysBetween(now, d.expectedCloseDate);
    const vel = velocityFactor(daysInStage, calib.medianDays);
    const slip = slipFactor(daysToClose);
    const contribution = d.amount * calib.weight * vel * slip;

    pipeline += d.amount;
    weightedForecast += contribution;
    if (calib.weight >= 0.8) committed += contribution;
    if (calib.weight >= 0.4) bestCase += contribution;

    const owner = d.ownerId ?? "__unassigned__";
    if (!byOwner[owner]) byOwner[owner] = { weightedForecast: 0, pipeline: 0, deals: 0 };
    byOwner[owner].weightedForecast += contribution;
    byOwner[owner].pipeline += d.amount;
    byOwner[owner].deals += 1;

    detail.push({
      dealId: d.id,
      amount: d.amount,
      stage: d.stage,
      stageWeight: calib.weight,
      velocityFactor: vel,
      slipFactor: slip,
      contribution,
      daysInStage,
      daysToClose,
    });
  }

  return {
    pipeline,
    committed,
    bestCase,
    weightedForecast,
    detail,
    byOwner,
  };
}
