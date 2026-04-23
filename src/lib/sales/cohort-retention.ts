/**
 * Phase 54 — Cohort retention & churn forecast.
 *
 * Produces:
 *   - Kaplan-Meier-style survival curves per cohort (e.g. by signup month or segment).
 *   - Logistic churn probability per account over a future horizon.
 *   - Portfolio-level ARR-at-risk projection (expected ARR lost over horizon).
 *
 * Pure. No I/O. Caller supplies event history + current account state.
 */

// ---------- Inputs ----------

/** Event where an account's subscription state changed. */
export interface AccountLifecycleEvent {
  accountId: string;
  /** ISO timestamp of the event. */
  atIso: string;
  /** What happened to the subscription. */
  kind: "activated" | "churned" | "downgraded" | "reactivated";
}

/** Current state of an account for forecasting. */
export interface AccountState {
  accountId: string;
  segment?: "smb" | "mid_market" | "enterprise" | "strategic";
  /** ISO date the account was first activated. */
  cohortStartIso: string;
  /** Current annual recurring revenue in USD (or caller's currency). */
  currentArr: number;
  /** If the account has churned, when. */
  churnedAtIso?: string;
  /** Next renewal date (optional — used to weight horizon). */
  renewalDueIso?: string;
  /** 0..1 health score from the customer-health module. */
  healthScore?: number;
  /** 0..1 churn-risk from customer-health (higher is riskier). */
  churnRiskSignal?: number;
  /** 0..1 renewal confidence (inverse of churn signal, if present). */
  renewalConfidence?: number;
  /** Count of support escalations in the last 30d. */
  recentEscalations?: number;
  /** Product usage trend (negative = declining). 0..1 where 1 = strong. */
  usageTrend?: number;
  /** NPS (-100..100). Optional. */
  nps?: number;
  /** Tenure in months at time of forecast. */
  tenureMonths?: number;
}

export interface RetentionRequest {
  /** Reference date the forecast is anchored to. */
  asOfIso: string;
  /** Horizon in days — how far forward to project churn. */
  horizonDays: number;
  /** Full lifecycle event stream (used to build KM curve). */
  events: AccountLifecycleEvent[];
  /** Snapshot of accounts (current ARR + signals). */
  accounts: AccountState[];
  /** Bucketing strategy for cohort curves. */
  cohortBy?: "signup_month" | "segment";
  /** Logistic model weights (defaults supplied). */
  weights?: Partial<LogisticWeights>;
}

export interface LogisticWeights {
  /** Intercept term. Higher intercept = higher baseline churn probability. */
  intercept: number;
  /** Penalty for low health score. */
  health: number;
  /** Weight on explicit churn-risk signal. */
  churnRisk: number;
  /** Weight on declining usage. Higher = more churn. */
  usageDecline: number;
  /** Weight on support escalations. */
  escalations: number;
  /** Weight on low NPS (detractor). */
  npsDetractor: number;
  /** Weight on imminent renewal (< 60d out). */
  renewalProximity: number;
  /** Weight on short tenure (<6mo). */
  newAccount: number;
}

export const DEFAULT_WEIGHTS: LogisticWeights = {
  intercept: -2.2, // baseline low churn
  health: 2.1,
  churnRisk: 2.4,
  usageDecline: 1.5,
  escalations: 0.4,
  npsDetractor: 0.6,
  renewalProximity: 0.7,
  newAccount: 0.5,
};

// ---------- Outputs ----------

export interface SurvivalPoint {
  /** Months since cohort start. */
  tenureMonth: number;
  /** Share of the cohort still active. */
  survival: number;
  /** Accounts still at risk entering this month. */
  atRisk: number;
  /** Accounts that churned in this month. */
  churnedInPeriod: number;
}

export interface CohortCurve {
  /** Label of the cohort (e.g. "2024-03" or "enterprise"). */
  label: string;
  /** Original cohort size. */
  cohortSize: number;
  /** Survival points, sorted by tenure month ascending. */
  points: SurvivalPoint[];
  /** Median time-to-churn in months (if ever hit 0.5 survival). */
  medianMonths?: number;
}

export interface AccountChurnForecast {
  accountId: string;
  /** Probability account churns within the horizon. */
  churnProbability: number;
  /** Expected ARR lost (probability * currentArr). */
  expectedArrLoss: number;
  /** Top features pushing the prediction up. */
  topRiskFactors: string[];
}

export interface RetentionReport {
  asOfIso: string;
  horizonDays: number;
  /** Aggregated cohort curves. */
  cohorts: CohortCurve[];
  /** One forecast row per active account. */
  forecasts: AccountChurnForecast[];
  /** ARR at risk across the portfolio (sum of expectedArrLoss). */
  portfolioArrAtRisk: number;
  /** Retained ARR (sum of currentArr − expectedArrLoss). */
  portfolioRetainedArr: number;
  /** Weighted gross revenue retention projection across horizon (0..1). */
  projectedGrr: number;
  /** Top-10 accounts ranked by expected ARR loss. */
  topAtRisk: AccountChurnForecast[];
  /** Short narrative summary. */
  headline: string;
  /** Callouts (high risk pockets). */
  callouts: string[];
}

// ---------- Helpers ----------

function monthsBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.max(0, Math.floor((end - start) / (30 * 86_400_000)));
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function sigmoid(z: number): number {
  if (z > 40) return 1;
  if (z < -40) return 0;
  return 1 / (1 + Math.exp(-z));
}

function cohortLabel(account: AccountState, by: "signup_month" | "segment"): string {
  if (by === "segment") return account.segment ?? "unknown";
  const d = new Date(account.cohortStartIso);
  if (!Number.isFinite(d.getTime())) return "unknown";
  const year = d.getUTCFullYear();
  const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

// ---------- KM curve ----------

function buildCohortCurve(
  label: string,
  accounts: AccountState[],
  asOfIso: string,
): CohortCurve {
  const cohortSize = accounts.length;
  if (cohortSize === 0) {
    return { label, cohortSize: 0, points: [] };
  }
  const rows = accounts.map((a) => {
    const churned = Boolean(a.churnedAtIso);
    const endIso = a.churnedAtIso ?? asOfIso;
    return {
      tenure: monthsBetween(a.cohortStartIso, endIso),
      churned,
    };
  });
  const maxTenure = Math.max(0, ...rows.map((r) => r.tenure));
  const points: SurvivalPoint[] = [];
  let survival = 1;
  let medianMonths: number | undefined;
  for (let m = 0; m <= maxTenure; m++) {
    const atRisk = rows.filter((r) => r.tenure >= m).length;
    const churnedInPeriod = rows.filter((r) => r.tenure === m && r.churned).length;
    if (atRisk > 0) {
      survival = survival * (1 - churnedInPeriod / atRisk);
    }
    if (medianMonths === undefined && survival <= 0.5) {
      medianMonths = m;
    }
    points.push({
      tenureMonth: m,
      survival: Math.round(survival * 10_000) / 10_000,
      atRisk,
      churnedInPeriod,
    });
  }
  return { label, cohortSize, points, medianMonths };
}

// ---------- Logistic churn per account ----------

function computeFeatures(
  account: AccountState,
  asOfIso: string,
  horizonDays: number,
): { values: Record<string, number>; rationale: string[] } {
  const health = clamp01(account.healthScore ?? 0.7);
  const churnRisk = clamp01(account.churnRiskSignal ?? (1 - (account.renewalConfidence ?? 0.7)));
  const usageDecline = clamp01(1 - clamp01(account.usageTrend ?? 0.6));
  const escalations = Math.min(5, Math.max(0, account.recentEscalations ?? 0));
  const npsDetractor = (() => {
    const nps = account.nps ?? 30;
    if (nps <= 0) return 1;
    if (nps <= 30) return 0.5;
    return 0;
  })();
  const renewalProximity = (() => {
    if (!account.renewalDueIso) return 0;
    const daysOut = (new Date(account.renewalDueIso).getTime() - new Date(asOfIso).getTime()) / 86_400_000;
    if (!Number.isFinite(daysOut)) return 0;
    if (daysOut <= 0) return 0;
    if (daysOut > horizonDays) return 0;
    if (daysOut < 60) return 1;
    return 0.5;
  })();
  const newAccount = (account.tenureMonths ?? 12) < 6 ? 1 : 0;

  const rationale: string[] = [];
  if (health < 0.5) rationale.push(`Low health score (${(health * 100).toFixed(0)})`);
  if (churnRisk >= 0.5) rationale.push(`Elevated churn-risk signal (${(churnRisk * 100).toFixed(0)}%)`);
  if (usageDecline >= 0.5) rationale.push(`Declining product usage trend`);
  if (escalations >= 2) rationale.push(`${escalations} recent support escalations`);
  if (npsDetractor >= 0.5) rationale.push(`Detractor NPS`);
  if (renewalProximity >= 1) rationale.push(`Renewal within 60 days`);
  if (newAccount) rationale.push(`Short tenure (< 6 months)`);

  return {
    values: {
      health: 1 - health, // higher feature = higher churn
      churnRisk,
      usageDecline,
      escalations: escalations / 5,
      npsDetractor,
      renewalProximity,
      newAccount,
    },
    rationale,
  };
}

function logisticChurnProbability(
  features: Record<string, number>,
  weights: LogisticWeights,
): number {
  const z =
    weights.intercept +
    weights.health * features.health +
    weights.churnRisk * features.churnRisk +
    weights.usageDecline * features.usageDecline +
    weights.escalations * features.escalations +
    weights.npsDetractor * features.npsDetractor +
    weights.renewalProximity * features.renewalProximity +
    weights.newAccount * features.newAccount;
  return sigmoid(z);
}

// ---------- Portfolio synth ----------

function headlineFor(
  accounts: AccountState[],
  totalArr: number,
  atRiskArr: number,
  grr: number,
): string {
  const pct = totalArr > 0 ? (atRiskArr / totalArr) * 100 : 0;
  return `${accounts.length} active accounts · $${Math.round(totalArr).toLocaleString()} ARR · expected ARR at risk $${Math.round(atRiskArr).toLocaleString()} (${pct.toFixed(1)}%) · projected GRR ${(grr * 100).toFixed(1)}%.`;
}

function calloutsFor(
  forecasts: AccountChurnForecast[],
  accounts: AccountState[],
  grr: number,
): string[] {
  const out: string[] = [];
  const highRisk = forecasts.filter((f) => f.churnProbability >= 0.5);
  if (highRisk.length > 0) {
    out.push(`${highRisk.length} account(s) with churn probability ≥ 50% — assign a save play this week.`);
  }
  if (grr < 0.9) {
    out.push(`Projected GRR ${(grr * 100).toFixed(1)}% is below healthy SaaS benchmark (90%).`);
  }
  const smbRisk = accounts.filter(
    (a) => a.segment === "smb" && (a.churnRiskSignal ?? 0) >= 0.5,
  );
  if (smbRisk.length >= 3) {
    out.push(`${smbRisk.length} SMB accounts show elevated churn signals — inspect onboarding and adoption motion.`);
  }
  return out;
}

// ---------- Public API ----------

export function composeRetentionReport(req: RetentionRequest): RetentionReport {
  const weights: LogisticWeights = { ...DEFAULT_WEIGHTS, ...(req.weights ?? {}) };
  const cohortBy = req.cohortBy ?? "signup_month";

  // Partition accounts by cohort, respecting both active and churned for KM curve.
  const groups = new Map<string, AccountState[]>();
  for (const a of req.accounts) {
    const label = cohortLabel(a, cohortBy);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(a);
  }
  const cohorts: CohortCurve[] = Array.from(groups.entries())
    .map(([label, rows]) => buildCohortCurve(label, rows, req.asOfIso))
    .sort((a, b) => a.label.localeCompare(b.label));

  const active = req.accounts.filter((a) => !a.churnedAtIso);
  const forecasts: AccountChurnForecast[] = active.map((account) => {
    const { values, rationale } = computeFeatures(account, req.asOfIso, req.horizonDays);
    const p = logisticChurnProbability(values, weights);
    return {
      accountId: account.accountId,
      churnProbability: Math.round(p * 10_000) / 10_000,
      expectedArrLoss: Math.round(p * account.currentArr),
      topRiskFactors: rationale.slice(0, 3),
    };
  });

  const totalArr = active.reduce((s, a) => s + a.currentArr, 0);
  const atRiskArr = forecasts.reduce((s, f) => s + f.expectedArrLoss, 0);
  const retainedArr = Math.max(0, totalArr - atRiskArr);
  const grr = totalArr > 0 ? retainedArr / totalArr : 1;

  const topAtRisk = [...forecasts]
    .sort((a, b) => b.expectedArrLoss - a.expectedArrLoss)
    .slice(0, 10);

  return {
    asOfIso: req.asOfIso,
    horizonDays: req.horizonDays,
    cohorts,
    forecasts,
    portfolioArrAtRisk: atRiskArr,
    portfolioRetainedArr: retainedArr,
    projectedGrr: Math.round(grr * 10_000) / 10_000,
    topAtRisk,
    headline: headlineFor(active, totalArr, atRiskArr, grr),
    callouts: calloutsFor(forecasts, active, grr),
  };
}

/** Build only the survival curves without churn forecasting — useful for BI. */
export function buildCohortCurves(
  accounts: AccountState[],
  asOfIso: string,
  by: "signup_month" | "segment" = "signup_month",
): CohortCurve[] {
  const groups = new Map<string, AccountState[]>();
  for (const a of accounts) {
    const label = cohortLabel(a, by);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(a);
  }
  return Array.from(groups.entries())
    .map(([label, rows]) => buildCohortCurve(label, rows, asOfIso))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Fit-less churn probability for a single account — exported for reuse. */
export function predictAccountChurn(
  account: AccountState,
  asOfIso: string,
  horizonDays: number,
  weightOverrides?: Partial<LogisticWeights>,
): AccountChurnForecast {
  const weights: LogisticWeights = { ...DEFAULT_WEIGHTS, ...(weightOverrides ?? {}) };
  const { values, rationale } = computeFeatures(account, asOfIso, horizonDays);
  const p = logisticChurnProbability(values, weights);
  return {
    accountId: account.accountId,
    churnProbability: Math.round(p * 10_000) / 10_000,
    expectedArrLoss: Math.round(p * account.currentArr),
    topRiskFactors: rationale.slice(0, 3),
  };
}
