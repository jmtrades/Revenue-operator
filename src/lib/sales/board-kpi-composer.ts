/**
 * Phase 52 — Board-ready KPI export composer.
 *
 * Deterministic SaaS metrics package suitable for board decks, investor
 * updates, and CEO/CFO email briefings. Consumes a raw financial/sales
 * snapshot and emits a normalized payload plus narrative commentary.
 *
 * Metrics computed:
 *   - ARR (start, end, net-new)
 *   - NRR, GRR, logo churn
 *   - CAC, LTV, LTV:CAC, payback months
 *   - Magic number
 *   - Rule of 40
 *   - Burn multiple
 *   - Pipeline coverage trend
 *   - Win rate / avg deal size / sales velocity trend
 *   - Gross margin, operating margin
 *
 * Pure. Caller supplies the period snapshot.
 */

// ---------- Inputs ----------

export interface BoardPeriodRevenue {
  startArr: number;
  endArr: number;
  newArr: number; // new logo ARR acquired
  expansionArr: number;
  contractionArr: number;
  churnedArr: number;
  logosStart: number;
  logosChurned: number;
}

export interface BoardPeriodCosts {
  salesAndMarketingCost: number;
  rdCost: number;
  gaCost: number;
  cogs: number;
  cashBurn: number;
}

export interface BoardPeriodPipeline {
  pipelineValue: number; // total qualified pipeline at period end
  committedValue: number; // commit category
  quotaTarget: number;
  winRate: number; // 0..1
  avgDealSize: number;
  avgCycleDays: number;
  opportunitiesCreated: number;
}

export interface BoardPeriodSnapshot {
  label: string; // e.g. "Q1-2026"
  startIso: string;
  endIso: string;
  revenue: BoardPeriodRevenue;
  costs: BoardPeriodCosts;
  pipeline: BoardPeriodPipeline;
  /** Optional headcount for per-headcount efficiency. */
  headcount?: { sales: number; total: number };
}

export interface BoardComposerInput {
  company: { name: string; currency: string };
  current: BoardPeriodSnapshot;
  prior?: BoardPeriodSnapshot;
  yearAgo?: BoardPeriodSnapshot;
}

// ---------- Outputs ----------

export interface KpiValue {
  code: string;
  label: string;
  value: number;
  unit: "currency" | "ratio" | "pct" | "months" | "days" | "count" | "multiple";
  vsPrior?: { absoluteDelta: number; relativeDelta: number; direction: "up" | "down" | "flat" };
  vsYearAgo?: { absoluteDelta: number; relativeDelta: number; direction: "up" | "down" | "flat" };
}

export interface BoardMetricsPackage {
  period: { label: string; startIso: string; endIso: string };
  company: { name: string; currency: string };
  revenue: {
    arrStart: KpiValue;
    arrEnd: KpiValue;
    netNewArr: KpiValue;
    nrr: KpiValue;
    grr: KpiValue;
    logoChurnRate: KpiValue;
  };
  efficiency: {
    cac: KpiValue;
    ltv: KpiValue;
    ltvToCac: KpiValue;
    paybackMonths: KpiValue;
    magicNumber: KpiValue;
    burnMultiple: KpiValue;
    ruleOf40: KpiValue;
  };
  margins: {
    grossMargin: KpiValue;
    operatingMargin: KpiValue;
  };
  pipeline: {
    coverageRatio: KpiValue;
    pipelineValue: KpiValue;
    winRate: KpiValue;
    avgDealSize: KpiValue;
    salesVelocity: KpiValue;
  };
  headline: string;
  callouts: string[];
}

// ---------- Helpers ----------

function safeDiv(n: number, d: number): number {
  return d === 0 ? 0 : n / d;
}

function direction(delta: number, threshold = 0.02): "up" | "down" | "flat" {
  if (Math.abs(delta) < threshold) return "flat";
  return delta > 0 ? "up" : "down";
}

function compareKpi(
  current: number,
  prior: number | undefined,
): KpiValue["vsPrior"] | undefined {
  if (prior === undefined) return undefined;
  const absoluteDelta = current - prior;
  const relativeDelta = safeDiv(absoluteDelta, Math.abs(prior));
  return {
    absoluteDelta,
    relativeDelta,
    direction: direction(relativeDelta),
  };
}

function kpi(
  code: string,
  label: string,
  value: number,
  unit: KpiValue["unit"],
  priorValue?: number,
  yearAgoValue?: number,
): KpiValue {
  const out: KpiValue = { code, label, value, unit };
  const vsP = compareKpi(value, priorValue);
  if (vsP) out.vsPrior = vsP;
  const vsY = compareKpi(value, yearAgoValue);
  if (vsY) out.vsYearAgo = vsY;
  return out;
}

// ---------- Metric calculators ----------

function nrrOf(p: BoardPeriodSnapshot): number {
  const { startArr, expansionArr, contractionArr, churnedArr } = p.revenue;
  return safeDiv(startArr + expansionArr - contractionArr - churnedArr, startArr);
}

function grrOf(p: BoardPeriodSnapshot): number {
  const { startArr, contractionArr, churnedArr } = p.revenue;
  return safeDiv(startArr - contractionArr - churnedArr, startArr);
}

function logoChurnOf(p: BoardPeriodSnapshot): number {
  return safeDiv(p.revenue.logosChurned, p.revenue.logosStart);
}

function cacOf(p: BoardPeriodSnapshot): number {
  return safeDiv(p.costs.salesAndMarketingCost, Math.max(1, p.revenue.newArr / Math.max(1, p.pipeline.avgDealSize)));
}

function ltvOf(p: BoardPeriodSnapshot, grossMargin: number): number {
  const churn = logoChurnOf(p);
  const avgAnnualContract = p.pipeline.avgDealSize;
  if (churn <= 0) return avgAnnualContract * grossMargin * 5;
  return safeDiv(avgAnnualContract * grossMargin, churn);
}

function paybackMonthsOf(p: BoardPeriodSnapshot, grossMargin: number): number {
  const monthlyGP = (p.revenue.newArr * grossMargin) / 12;
  return safeDiv(p.costs.salesAndMarketingCost, Math.max(1, monthlyGP));
}

function magicNumberOf(current: BoardPeriodSnapshot, prior?: BoardPeriodSnapshot): number {
  // (Q ARR - Prev Q ARR) * 4 / Prev Q S&M spend
  if (!prior) return safeDiv((current.revenue.endArr - current.revenue.startArr) * 4, current.costs.salesAndMarketingCost);
  return safeDiv((current.revenue.endArr - prior.revenue.endArr) * 4, prior.costs.salesAndMarketingCost);
}

function burnMultipleOf(p: BoardPeriodSnapshot): number {
  const netNewArr = p.revenue.endArr - p.revenue.startArr;
  return safeDiv(p.costs.cashBurn, Math.max(1, netNewArr));
}

function growthRateOf(current: BoardPeriodSnapshot, prior?: BoardPeriodSnapshot): number {
  if (!prior) return 0;
  return safeDiv(current.revenue.endArr - prior.revenue.endArr, Math.max(1, prior.revenue.endArr));
}

function operatingMarginOf(p: BoardPeriodSnapshot): number {
  const { revenue, costs } = p;
  const annualRevenueProxy = revenue.endArr;
  const annualCost = costs.salesAndMarketingCost + costs.rdCost + costs.gaCost + costs.cogs;
  return safeDiv(annualRevenueProxy - annualCost, annualRevenueProxy);
}

function grossMarginOf(p: BoardPeriodSnapshot): number {
  return safeDiv(p.revenue.endArr - p.costs.cogs, Math.max(1, p.revenue.endArr));
}

function ruleOf40Of(current: BoardPeriodSnapshot, prior?: BoardPeriodSnapshot): number {
  return growthRateOf(current, prior) + operatingMarginOf(current);
}

function coverageOf(p: BoardPeriodSnapshot): number {
  return safeDiv(p.pipeline.pipelineValue, Math.max(1, p.pipeline.quotaTarget));
}

function velocityOf(p: BoardPeriodSnapshot): number {
  const { opportunitiesCreated, winRate, avgDealSize, avgCycleDays } = p.pipeline;
  return safeDiv(opportunitiesCreated * winRate * avgDealSize, Math.max(1, avgCycleDays));
}

// ---------- Narrative ----------

function buildHeadline(pack: BoardMetricsPackage): string {
  const arrEnd = pack.revenue.arrEnd.value;
  const nrr = pack.revenue.nrr.value;
  const growth =
    pack.revenue.arrEnd.vsPrior?.relativeDelta !== undefined
      ? pack.revenue.arrEnd.vsPrior.relativeDelta
      : 0;
  return `${pack.period.label}: ARR ${arrEnd.toLocaleString()} · ${(growth * 100).toFixed(1)}% QoQ · NRR ${(nrr * 100).toFixed(0)}%`;
}

function buildCallouts(pack: BoardMetricsPackage): string[] {
  const out: string[] = [];
  if (pack.revenue.nrr.value >= 1.2) out.push(`NRR ${(pack.revenue.nrr.value * 100).toFixed(0)}% — best-in-class retention.`);
  if (pack.revenue.nrr.value < 0.95) out.push(`NRR below 95% — investigate churn and contraction drivers.`);
  if (pack.efficiency.ltvToCac.value >= 5) out.push(`LTV:CAC ${pack.efficiency.ltvToCac.value.toFixed(1)}× — efficient growth.`);
  if (pack.efficiency.ltvToCac.value < 3) out.push(`LTV:CAC ${pack.efficiency.ltvToCac.value.toFixed(1)}× — below 3×, reassess acquisition spend.`);
  if (pack.efficiency.magicNumber.value >= 1) out.push(`Magic number ${pack.efficiency.magicNumber.value.toFixed(2)} — growth justifies additional S&M.`);
  if (pack.efficiency.burnMultiple.value > 2) out.push(`Burn multiple ${pack.efficiency.burnMultiple.value.toFixed(2)} — capital efficiency needs attention.`);
  if (pack.efficiency.ruleOf40.value >= 0.4) out.push(`Rule of 40: ${(pack.efficiency.ruleOf40.value * 100).toFixed(0)} — on-target.`);
  if (pack.pipeline.coverageRatio.value < 2.5) out.push(`Pipeline coverage ${pack.pipeline.coverageRatio.value.toFixed(1)}× — below 2.5× floor.`);
  return out;
}

// ---------- Public API ----------

export function composeBoardPackage(input: BoardComposerInput): BoardMetricsPackage {
  const { current, prior, yearAgo } = input;
  const gm = grossMarginOf(current);
  const priorGm = prior ? grossMarginOf(prior) : undefined;
  const yearGm = yearAgo ? grossMarginOf(yearAgo) : undefined;

  const pack: BoardMetricsPackage = {
    period: { label: current.label, startIso: current.startIso, endIso: current.endIso },
    company: input.company,
    revenue: {
      arrStart: kpi("arr_start", "ARR — period start", current.revenue.startArr, "currency", prior?.revenue.startArr, yearAgo?.revenue.startArr),
      arrEnd: kpi("arr_end", "ARR — period end", current.revenue.endArr, "currency", prior?.revenue.endArr, yearAgo?.revenue.endArr),
      netNewArr: kpi(
        "net_new_arr",
        "Net-new ARR",
        current.revenue.endArr - current.revenue.startArr,
        "currency",
        prior ? prior.revenue.endArr - prior.revenue.startArr : undefined,
        yearAgo ? yearAgo.revenue.endArr - yearAgo.revenue.startArr : undefined,
      ),
      nrr: kpi("nrr", "Net Revenue Retention", nrrOf(current), "ratio", prior ? nrrOf(prior) : undefined, yearAgo ? nrrOf(yearAgo) : undefined),
      grr: kpi("grr", "Gross Revenue Retention", grrOf(current), "ratio", prior ? grrOf(prior) : undefined),
      logoChurnRate: kpi("logo_churn", "Logo churn rate", logoChurnOf(current), "ratio", prior ? logoChurnOf(prior) : undefined),
    },
    efficiency: {
      cac: kpi("cac", "CAC — blended", cacOf(current), "currency", prior ? cacOf(prior) : undefined),
      ltv: kpi("ltv", "LTV (GM-adjusted)", ltvOf(current, gm), "currency", prior ? ltvOf(prior, priorGm ?? gm) : undefined),
      ltvToCac: kpi(
        "ltv_to_cac",
        "LTV:CAC",
        safeDiv(ltvOf(current, gm), cacOf(current)),
        "multiple",
        prior ? safeDiv(ltvOf(prior, priorGm ?? gm), cacOf(prior)) : undefined,
      ),
      paybackMonths: kpi(
        "payback_months",
        "CAC payback — months",
        paybackMonthsOf(current, gm),
        "months",
        prior ? paybackMonthsOf(prior, priorGm ?? gm) : undefined,
      ),
      magicNumber: kpi("magic_number", "Magic number", magicNumberOf(current, prior), "multiple"),
      burnMultiple: kpi("burn_multiple", "Burn multiple", burnMultipleOf(current), "multiple", prior ? burnMultipleOf(prior) : undefined),
      ruleOf40: kpi("rule_of_40", "Rule of 40", ruleOf40Of(current, prior), "ratio", prior ? ruleOf40Of(prior, yearAgo) : undefined),
    },
    margins: {
      grossMargin: kpi("gross_margin", "Gross margin", gm, "ratio", priorGm, yearGm),
      operatingMargin: kpi("op_margin", "Operating margin", operatingMarginOf(current), "ratio", prior ? operatingMarginOf(prior) : undefined),
    },
    pipeline: {
      coverageRatio: kpi("pipeline_coverage", "Pipeline coverage", coverageOf(current), "multiple", prior ? coverageOf(prior) : undefined),
      pipelineValue: kpi("pipeline_value", "Pipeline value", current.pipeline.pipelineValue, "currency", prior?.pipeline.pipelineValue),
      winRate: kpi("win_rate", "Win rate", current.pipeline.winRate, "ratio", prior?.pipeline.winRate),
      avgDealSize: kpi("avg_deal_size", "Avg deal size", current.pipeline.avgDealSize, "currency", prior?.pipeline.avgDealSize),
      salesVelocity: kpi("sales_velocity", "Sales velocity (per day)", velocityOf(current), "currency", prior ? velocityOf(prior) : undefined),
    },
    headline: "",
    callouts: [],
  };
  pack.headline = buildHeadline(pack);
  pack.callouts = buildCallouts(pack);
  return pack;
}

/**
 * Flatten a BoardMetricsPackage into a KpiValue[] for CSV/XLSX export.
 */
export function flattenBoardPackage(pack: BoardMetricsPackage): KpiValue[] {
  return [
    ...Object.values(pack.revenue),
    ...Object.values(pack.efficiency),
    ...Object.values(pack.margins),
    ...Object.values(pack.pipeline),
  ];
}
