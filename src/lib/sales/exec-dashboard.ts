/**
 * Phase 48 — Executive revenue dashboard model.
 *
 * Pure composition layer. Consumes the outputs of other Phase-N modules
 * (pipeline-forecast, forecast-confidence, customer-health, discount-governance,
 * buying-committee, attribution-engine, win-probability, revenue-benchmarks,
 * customer-health NRR report) and produces a single consolidated executive
 * model suitable for a CRO / board view.
 *
 * No I/O. Deterministic synthesis — each input is optional; the model
 * returns only the sections whose inputs were supplied.
 */

import type { ForecastRollup } from "./forecast-confidence";
import type { HealthScore } from "./customer-health";
import type { DiscountEvaluation } from "./discount-governance";
import type { BuyingCommittee } from "./buying-committee";
import type { AttributionResult } from "./attribution-engine";
import type { BenchmarkReport } from "./revenue-benchmarks";
import type { CohortNrrReport } from "./customer-health";

// ---------- Inputs ----------

export interface ExecDashboardPeriod {
  label: string;
  startIso: string;
  endIso: string;
  /** Revenue quota for this period, in same units as deal amounts. */
  quotaTarget: number;
}

export interface DashboardDealRecord {
  dealId: string;
  name: string;
  amount: number;
  stage: string;
  ownerName?: string;
  closeDateIso?: string;
  /** Win probability from predictWinProbability (0..1). */
  winProbability?: number;
  /** If true, the deal is currently stalled (from stall detector). */
  isStalled?: boolean;
  /** Optional buying-committee snapshot for the deal. */
  committee?: BuyingCommittee;
  /** Optional discount evaluation. */
  discount?: DiscountEvaluation;
  /** Reason tags for context, e.g. ["stage_pushed", "eb_not_engaged"]. */
  riskTags?: string[];
}

export interface DashboardAccountRecord {
  accountId: string;
  name: string;
  mrr: number;
  health: HealthScore;
}

export interface ExecDashboardInput {
  period: ExecDashboardPeriod;
  forecast?: ForecastRollup;
  accounts?: DashboardAccountRecord[];
  discountEvaluations?: DiscountEvaluation[];
  deals?: DashboardDealRecord[];
  attribution?: AttributionResult;
  nrr?: CohortNrrReport;
  benchmarks?: BenchmarkReport;
}

// ---------- Outputs ----------

export interface PipelineCoverageReport {
  quotaTarget: number;
  committedValue: number;
  bestCaseValue: number;
  pipelineValue: number;
  totalPipeline: number;
  coverageRatio: number;
  gapToQuota: number;
  status: "on_track" | "at_risk" | "critical";
}

export interface ForecastSummary {
  commit: number;
  bestCase: number;
  pipelineExpected: number;
  p10: number;
  p50: number;
  p90: number;
  quotaAttainmentPct: number;
  commitCoveragePct: number;
}

export interface DealAtRisk {
  dealId: string;
  name: string;
  amount: number;
  stage: string;
  ownerName?: string;
  riskScore: number; // 0..1
  risks: string[];
}

export interface TopGrowthAccount {
  accountId: string;
  name: string;
  mrr: number;
  expansionSignal: number;
  renewalConfidence: number;
  playbook: HealthScore["playbook"];
}

export interface TopChurnRisk {
  accountId: string;
  name: string;
  mrr: number;
  churnRisk: number;
  score: number;
  status: HealthScore["status"];
  topRisks: string[];
}

export interface DiscountLeakageSummary {
  totalLeakage: number;
  avgDiscountPct: number;
  criticalCount: number;
  warningCount: number;
  worstOffenders: Array<{ dealId: string; leakage: number; discountPct: number }>;
}

export interface AttributionSummary {
  totalAttributedValue: number;
  model: string;
  topChannels: Array<{ channel: string; share: number; attributedValue: number }>;
}

export interface BenchmarkHighlights {
  winRate: number;
  avgCycleDays: number;
  avgDealSize: number;
  velocityPerQuarter: number;
  driftHeadline: string | null;
}

export interface NrrSummary {
  nrr: number;
  grr: number;
  logoChurnRate: number;
  netNewMrr: number;
}

export interface ExecDashboard {
  period: ExecDashboardPeriod;
  pipelineCoverage?: PipelineCoverageReport;
  forecastSummary?: ForecastSummary;
  dealsAtRisk: DealAtRisk[];
  topGrowthAccounts: TopGrowthAccount[];
  topChurnRisks: TopChurnRisk[];
  discountLeakage?: DiscountLeakageSummary;
  nrrSummary?: NrrSummary;
  attributionSummary?: AttributionSummary;
  benchmarkHighlights?: BenchmarkHighlights;
  healthMixPct: {
    healthy: number;
    monitoring: number;
    at_risk: number;
    critical: number;
  };
  headline: string;
}

// ---------- Helpers ----------

function pipelineCoverage(forecast: ForecastRollup | undefined, quotaTarget: number): PipelineCoverageReport | undefined {
  if (!forecast) return undefined;
  const commit = forecast.byCategory?.commit?.expected ?? 0;
  const bestCase = forecast.byCategory?.best_case?.expected ?? 0;
  const pipeline = forecast.byCategory?.pipeline?.expected ?? 0;
  const total = commit + bestCase + pipeline;
  const coverageRatio = quotaTarget > 0 ? total / quotaTarget : 0;
  const gapToQuota = Math.max(0, quotaTarget - (commit + bestCase));
  let status: PipelineCoverageReport["status"] = "on_track";
  if (coverageRatio < 2.5) status = "at_risk";
  if (coverageRatio < 1.5) status = "critical";
  return {
    quotaTarget,
    committedValue: commit,
    bestCaseValue: bestCase,
    pipelineValue: pipeline,
    totalPipeline: total,
    coverageRatio,
    gapToQuota,
    status,
  };
}

function forecastSummary(forecast: ForecastRollup | undefined, quotaTarget: number): ForecastSummary | undefined {
  if (!forecast) return undefined;
  const commit = forecast.byCategory?.commit?.expected ?? 0;
  const bestCase = forecast.byCategory?.best_case?.expected ?? 0;
  const pipeline = forecast.byCategory?.pipeline?.expected ?? 0;
  const interval = forecast.total;
  const p50 = interval?.p50 ?? interval?.expected ?? commit + bestCase + pipeline;
  const quotaAttainmentPct = quotaTarget > 0 ? (commit + bestCase) / quotaTarget : 0;
  const commitCoveragePct = quotaTarget > 0 ? commit / quotaTarget : 0;
  return {
    commit,
    bestCase,
    pipelineExpected: pipeline,
    p10: interval?.p10 ?? 0,
    p50,
    p90: interval?.p90 ?? 0,
    quotaAttainmentPct,
    commitCoveragePct,
  };
}

function scoreDealRisk(d: DashboardDealRecord): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (d.isStalled) {
    score += 0.3;
    reasons.push("stalled");
  }
  if (typeof d.winProbability === "number") {
    if (d.winProbability < 0.2) {
      score += 0.4;
      reasons.push(`very low win prob (${(d.winProbability * 100).toFixed(0)}%)`);
    } else if (d.winProbability < 0.35) {
      score += 0.25;
      reasons.push(`low win prob (${(d.winProbability * 100).toFixed(0)}%)`);
    }
  }
  if (d.committee) {
    const crit = (d.committee.gaps ?? []).filter((g) => g.severity === "critical").length;
    if (crit > 0) {
      score += 0.2 * Math.min(3, crit) / 3 + 0.1;
      reasons.push(`committee gaps: ${crit}`);
    }
  }
  if (d.discount) {
    const criticalFlags = (d.discount.flags ?? []).filter((f) => f.severity === "critical").length;
    if (criticalFlags > 0) {
      score += 0.15;
      reasons.push("discount policy breach");
    }
  }
  if (d.riskTags && d.riskTags.length > 0) {
    score += Math.min(0.15, d.riskTags.length * 0.05);
    reasons.push(...d.riskTags);
  }
  return { score: Math.min(1, score), reasons };
}

function dealsAtRisk(deals: DashboardDealRecord[] | undefined, limit: number): DealAtRisk[] {
  if (!deals) return [];
  const scored = deals.map((d) => {
    const { score, reasons } = scoreDealRisk(d);
    return { d, score, reasons };
  });
  // weighted by amount × score
  scored.sort((a, b) => b.score * b.d.amount - a.score * a.d.amount);
  return scored
    .filter((s) => s.score >= 0.2)
    .slice(0, limit)
    .map((s) => ({
      dealId: s.d.dealId,
      name: s.d.name,
      amount: s.d.amount,
      stage: s.d.stage,
      ownerName: s.d.ownerName,
      riskScore: s.score,
      risks: s.reasons,
    }));
}

function topGrowth(accounts: DashboardAccountRecord[] | undefined, limit: number): TopGrowthAccount[] {
  if (!accounts) return [];
  return accounts
    .filter((a) => (a.health?.expansionSignal ?? 0) > 0.3 || a.health?.playbook === "expansion_play" || a.health?.playbook === "advocate")
    .sort((a, b) => (b.health.expansionSignal ?? 0) * b.mrr - (a.health.expansionSignal ?? 0) * a.mrr)
    .slice(0, limit)
    .map((a) => ({
      accountId: a.accountId,
      name: a.name,
      mrr: a.mrr,
      expansionSignal: a.health.expansionSignal ?? 0,
      renewalConfidence: a.health.renewalConfidence ?? 0,
      playbook: a.health.playbook,
    }));
}

function topChurn(accounts: DashboardAccountRecord[] | undefined, limit: number): TopChurnRisk[] {
  if (!accounts) return [];
  return accounts
    .filter((a) => (a.health?.churnRisk ?? 0) >= 0.35 || a.health?.status === "at_risk" || a.health?.status === "critical")
    .sort((a, b) => (b.health.churnRisk ?? 0) * b.mrr - (a.health.churnRisk ?? 0) * a.mrr)
    .slice(0, limit)
    .map((a) => ({
      accountId: a.accountId,
      name: a.name,
      mrr: a.mrr,
      churnRisk: a.health.churnRisk ?? 0,
      score: a.health.score,
      status: a.health.status,
      topRisks: (a.health.topRisks ?? []).slice(0, 3),
    }));
}

function discountSummary(evs: DiscountEvaluation[] | undefined): DiscountLeakageSummary | undefined {
  if (!evs || evs.length === 0) return undefined;
  let totalLeakage = 0;
  let _totalList = 0;
  let totalDisc = 0;
  let critical = 0;
  let warning = 0;
  const rows: Array<{ dealId: string; leakage: number; discountPct: number }> = [];
  for (const e of evs) {
    const listPrice = e.listPrice ?? 0;
    const quoted = e.quotedPrice ?? 0;
    const leak = Math.max(0, listPrice - quoted);
    totalLeakage += leak;
    _totalList += listPrice;
    totalDisc += e.grossDiscountPct ?? 0;
    for (const f of e.flags ?? []) {
      if (f.severity === "critical") critical += 1;
      if (f.severity === "warning") warning += 1;
    }
    rows.push({
      dealId: e.dealId ?? "unknown",
      leakage: leak,
      discountPct: e.grossDiscountPct ?? 0,
    });
  }
  rows.sort((a, b) => b.leakage - a.leakage);
  return {
    totalLeakage,
    avgDiscountPct: evs.length > 0 ? totalDisc / evs.length : 0,
    criticalCount: critical,
    warningCount: warning,
    worstOffenders: rows.slice(0, 5),
  };
}

function attributionSummary(att: AttributionResult | undefined): AttributionSummary | undefined {
  if (!att) return undefined;
  const total = att.outcomeValue ?? 0;
  const ch = (att.channelSummary ?? []).map((c) => ({
    channel: c.channel,
    share: c.share,
    attributedValue: c.credit,
  }));
  ch.sort((a, b) => b.attributedValue - a.attributedValue);
  return {
    totalAttributedValue: total,
    model: att.model,
    topChannels: ch.slice(0, 5),
  };
}

function benchmarkHighlights(b: BenchmarkReport | undefined): BenchmarkHighlights | undefined {
  if (!b) return undefined;
  let driftHeadline: string | null = null;
  const wr = b.drift?.find((d) => d.metric === "winRate");
  if (wr && wr.direction !== "flat") {
    const dir = wr.direction === "up" ? "up" : "down";
    driftHeadline = `Win rate trending ${dir} ${(wr.relativeDelta * 100).toFixed(1)}% vs prior`;
  }
  return {
    winRate: b.overall.winRate,
    avgCycleDays: b.overall.avgCycleDays,
    avgDealSize: b.overall.avgDealSize,
    velocityPerQuarter: b.overall.velocityPerQuarter,
    driftHeadline,
  };
}

function nrrSummary(nrr: CohortNrrReport | undefined): NrrSummary | undefined {
  if (!nrr) return undefined;
  const netNewMrr = nrr.endMrr - nrr.startMrr;
  return {
    nrr: nrr.nrr,
    grr: nrr.grr,
    logoChurnRate: nrr.logoChurnRate,
    netNewMrr,
  };
}

function healthMixPct(accounts: DashboardAccountRecord[] | undefined) {
  const mix = { healthy: 0, monitoring: 0, at_risk: 0, critical: 0 };
  if (!accounts || accounts.length === 0) return mix;
  for (const a of accounts) {
    const s = a.health?.status;
    if (s && s in mix) (mix as Record<string, number>)[s] += 1;
  }
  const total = accounts.length;
  return {
    healthy: mix.healthy / total,
    monitoring: mix.monitoring / total,
    at_risk: mix.at_risk / total,
    critical: mix.critical / total,
  };
}

function dollar(x: number): string {
  return x.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function buildHeadline(
  period: ExecDashboardPeriod,
  coverage: PipelineCoverageReport | undefined,
  fc: ForecastSummary | undefined,
  nrr: NrrSummary | undefined,
): string {
  const bits: string[] = [`${period.label}:`];
  if (fc) {
    const commit = dollar(fc.commit);
    const pct = (fc.quotaAttainmentPct * 100).toFixed(0);
    bits.push(`commit ${commit} (${pct}% of quota)`);
  }
  if (coverage) {
    bits.push(`pipeline coverage ${coverage.coverageRatio.toFixed(1)}x [${coverage.status}]`);
  }
  if (nrr) {
    bits.push(`NRR ${(nrr.nrr * 100).toFixed(0)}%, GRR ${(nrr.grr * 100).toFixed(0)}%`);
  }
  return bits.join(" • ");
}

// ---------- Public ----------

export function buildExecDashboard(input: ExecDashboardInput): ExecDashboard {
  const coverage = pipelineCoverage(input.forecast, input.period.quotaTarget);
  const fc = forecastSummary(input.forecast, input.period.quotaTarget);
  const risks = dealsAtRisk(input.deals, 10);
  const growth = topGrowth(input.accounts, 5);
  const churn = topChurn(input.accounts, 5);
  const disc = discountSummary(input.discountEvaluations);
  const attr = attributionSummary(input.attribution);
  const bench = benchmarkHighlights(input.benchmarks);
  const nrr = nrrSummary(input.nrr);
  const mix = healthMixPct(input.accounts);
  const headline = buildHeadline(input.period, coverage, fc, nrr);

  return {
    period: input.period,
    pipelineCoverage: coverage,
    forecastSummary: fc,
    dealsAtRisk: risks,
    topGrowthAccounts: growth,
    topChurnRisks: churn,
    discountLeakage: disc,
    nrrSummary: nrr,
    attributionSummary: attr,
    benchmarkHighlights: bench,
    healthMixPct: mix,
    headline,
  };
}
