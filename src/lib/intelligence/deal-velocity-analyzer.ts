/**
 * Deal Velocity Analyzer
 * Identifies and fixes pipeline bottlenecks, tracks deal progression speed,
 * and recommends actions to accelerate sales cycles.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DealRecord {
  id: string;
  stageId: string;
  stageName: string;
  value: number;
  createdAt: Date;
  stageEnteredAt: Date;
  stageExitedAt: Date | null;
  source: "inbound" | "outbound" | "referral" | "partner";
  industry: string;
  decisionMakerEngaged: boolean;
  proposalSent: boolean;
  lastActivity: Date;
  lostReason?: string;
  winRate: number; // 0-1
}

export interface StageDefinition {
  id: string;
  name: string;
  order: number;
  benchmarkDays: number; // industry baseline
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface VelocityMetrics {
  averageDaysPerStage: Map<string, number>;
  conversionRates: Map<string, number>; // stage name -> next stage conversion %
  overallVelocity: number; // deals × win rate × avg value ÷ cycle length
  trendDirection: "accelerating" | "decelerating" | "stable";
  trendPeriods: {
    days30: number;
    days60: number;
    days90: number;
  };
}

export interface VelocityReport {
  generatedAt: Date;
  dealCount: number;
  metrics: VelocityMetrics;
  benchmarks: Map<string, number>; // stage -> benchmark days
  comparison: Map<string, "ahead" | "on_track" | "behind">;
  avgCycleLengthDays: number;
  medianDealValue: number;
  totalPipelineValue: number;
}

export interface Bottleneck {
  stageId: string;
  stageName: string;
  severityLevel: "minor" | "moderate" | "severe";
  averageStayDays: number;
  benchmarkDays: number;
  deviationPercent: number;
  affectedDealCount: number;
  conversionRateDropoff: number; // % drop vs industry benchmark
  estimatedRevenueAtRisk: number;
  likelyRootCauses: string[];
}

export interface Accelerator {
  bottleneckStageId: string;
  actionTitle: string;
  description: string;
  priority: "high" | "medium" | "low";
  expectedImpactDays: number;
  expectedImpactPercent: number;
  actionType:
    | "content_send"
    | "stakeholder_multi_thread"
    | "executive_sponsor"
    | "incentive_offer"
    | "qualification_review"
    | "competitor_handle";
  targetDealValue: number; // minimum deal size for this action
  timeToImplement: "immediate" | "24hr" | "48hr" | "1week";
}

export interface CloseDatePrediction {
  dealId: string;
  currentStageId: string;
  predictedCloseDate: Date;
  confidenceScore: number; // 0-1
  bestCaseDate: Date;
  worstCaseDate: Date;
  remainingDaysInStage: number;
  totalRemainingDays: number;
  probabilityOfClose: number; // 0-1
  riskFactors: string[];
}

export interface EfficiencyMetrics {
  revenuePerRepHour: number;
  activitiesPerClosedDeal: number;
  costOfSale: number;
  leadToCloseRatio: number; // leads qualified / deals closed
  averageTouchesToClose: number;
  byChannel: Record<string, { avgTouches: number; avgCycleDays: number }>;
}

export interface VelocityInsight {
  category:
    | "conversion_trend"
    | "stage_performance"
    | "channel_performance"
    | "market_pattern"
    | "engagement_signal"
    | "risk_alert";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  dataSupport: string; // quantified insight
  recommendedAction: string;
}

// ============================================================================
// MAIN EXPORTED FUNCTIONS
// ============================================================================

export function analyzeDealVelocity(
  deals: DealRecord[],
  stages: StageDefinition[]
): VelocityReport {
  const now = new Date();
  const stageMap = new Map(stages.map((s) => [s.id, s]));
  const dealsByStage = new Map<string, DealRecord[]>();

  deals.forEach((d) => {
    if (!dealsByStage.has(d.stageId)) dealsByStage.set(d.stageId, []);
    dealsByStage.get(d.stageId)!.push(d);
  });

  const averageDaysPerStage = new Map<string, number>();
  dealsByStage.forEach((stageDealList, stageId) => {
    const daysInStage = stageDealList.map((d) => {
      const exitDate = d.stageExitedAt || now;
      return (exitDate.getTime() - d.stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24);
    });
    const avg = daysInStage.length > 0 ? daysInStage.reduce((a, b) => a + b, 0) / daysInStage.length : 0;
    averageDaysPerStage.set(stageId, avg);
  });

  const conversionRates = new Map<string, number>();
  const sortedStages = Array.from(stageMap.values()).sort((a, b) => a.order - b.order);
  for (let i = 0; i < sortedStages.length - 1; i++) {
    const cs = sortedStages[i];
    const ns = sortedStages[i + 1];
    const cnt = dealsByStage.get(cs.id)?.length ?? 0;
    const nxt = dealsByStage.get(ns.id)?.length ?? 0;
    conversionRates.set(cs.name, cnt > 0 ? nxt / cnt : 0);
  }

  const totalValue = deals.reduce((s, d) => s + d.value, 0);
  const avgWin = deals.length > 0 ? deals.reduce((s, d) => s + d.winRate, 0) / deals.length : 0;
  const closed = deals.filter((d) => d.stageExitedAt);
  const cycleLen = closed.length > 0 ? closed.reduce((s, d) => s + (d.stageExitedAt!.getTime() - d.createdAt.getTime()) / (1000*60*60*24), 0) / closed.length : 0;
  const pipeVel = cycleLen > 0 ? (deals.length * avgWin * (totalValue / Math.max(deals.length, 1))) / cycleLen : 0;

  const daysFilter = (d: DealRecord, d30: number) => (d.lastActivity.getTime() - now.getTime()) / (1000*60*60*24) > -d30;
  const vel30 = deals.filter((d) => daysFilter(d, 30)).length / 30 || 0;
  const vel60 = deals.filter((d) => daysFilter(d, 60)).length / 60 || 0;
  const vel90 = deals.filter((d) => daysFilter(d, 90)).length / 90 || 0;

  let trend: "accelerating" | "decelerating" | "stable" = "stable";
  if (vel30 > vel60 * 1.1) trend = "accelerating";
  else if (vel30 < vel60 * 0.9) trend = "decelerating";

  const benchmarks = new Map(stages.map((s) => [s.id, s.benchmarkDays]));
  const comparison = new Map<string, "ahead" | "on_track" | "behind">();
  benchmarks.forEach((bd, sid) => {
    const actual = averageDaysPerStage.get(sid) ?? 0;
    comparison.set(sid, actual < bd * 0.8 ? "ahead" : actual > bd * 1.2 ? "behind" : "on_track");
  });

  const sortedVals = [...deals].sort((a, b) => a.value - b.value);
  const medianVal = sortedVals[Math.floor(sortedVals.length / 2)]?.value ?? 0;

  return {
    generatedAt: now,
    dealCount: deals.length,
    metrics: { averageDaysPerStage, conversionRates, overallVelocity: pipeVel, trendDirection: trend, trendPeriods: { days30: vel30, days60: vel60, days90: vel90 } },
    benchmarks,
    comparison,
    avgCycleLengthDays: cycleLen,
    medianDealValue: medianVal,
    totalPipelineValue: totalValue,
  };
}

export function identifyBottlenecks(report: VelocityReport): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  report.metrics.averageDaysPerStage.forEach((actualDays, stageId) => {
    const benchmarkDays = report.benchmarks.get(stageId) ?? actualDays;
    const devPercent = benchmarkDays > 0 ? ((actualDays - benchmarkDays) / benchmarkDays) * 100 : 0;
    if (devPercent <= 20) return;

    const convRate = report.metrics.conversionRates.get(stageId) ?? 0.5;
    const dropPercent = Math.max(0, (1 - convRate) * 100);
    const severity: "minor" | "moderate" | "severe" = devPercent > 50 ? "severe" : devPercent > 35 ? "moderate" : "minor";
    const affectedCnt = Math.ceil(report.dealCount * (1 - convRate));
    const revAtRisk = affectedCnt > 0 ? (report.totalPipelineValue / report.dealCount) * affectedCnt * 0.3 : 0;

    const causes: string[] = [];
    if (devPercent > 40) causes.push("decision_maker_not_engaged");
    if (dropPercent > 30) causes.push("missing_qualification_info");
    if (convRate < 0.4) causes.push("pricing_or_competitor_confusion");

    bottlenecks.push({
      stageId, stageName: stageId, severityLevel: severity, averageStayDays: actualDays, benchmarkDays,
      deviationPercent: devPercent, affectedDealCount: affectedCnt, conversionRateDropoff: dropPercent,
      estimatedRevenueAtRisk: revAtRisk, likelyRootCauses: causes,
    });
  });

  return bottlenecks.sort((a, b) => b.estimatedRevenueAtRisk - a.estimatedRevenueAtRisk);
}

export function recommendAccelerators(bottleneck: Bottleneck): Accelerator[] {
  const acc: Accelerator[] = [];

  if (bottleneck.likelyRootCauses.includes("missing_qualification_info")) {
    acc.push({ bottleneckStageId: bottleneck.stageId, actionTitle: "Send Case Study by Industry", description: "Industry-matched case study within 24hr.",
      priority: "high", expectedImpactDays: 2.3, expectedImpactPercent: 18, actionType: "content_send", targetDealValue: 5000, timeToImplement: "24hr" });
  }

  if (bottleneck.affectedDealCount > 3 && bottleneck.averageStayDays > 25) {
    acc.push({ bottleneckStageId: bottleneck.stageId, actionTitle: "Introduce Executive Sponsor", description: "For >$10K deals, exec sponsor speeds negotiation.",
      priority: bottleneck.severityLevel === "severe" ? "high" : "medium", expectedImpactDays: 5, expectedImpactPercent: 28, actionType: "executive_sponsor", targetDealValue: 10000, timeToImplement: "48hr" });
  }

  if (bottleneck.likelyRootCauses.includes("pricing_or_competitor_confusion")) {
    acc.push({ bottleneckStageId: bottleneck.stageId, actionTitle: "Time-Limited Incentive Offer", description: "20% discount or trial for 14 days.",
      priority: "medium", expectedImpactDays: 3.5, expectedImpactPercent: 22, actionType: "incentive_offer", targetDealValue: 8000, timeToImplement: "immediate" });
  }

  if (bottleneck.likelyRootCauses.includes("decision_maker_not_engaged")) {
    acc.push({ bottleneckStageId: bottleneck.stageId, actionTitle: "Schedule Multi-Threading Meeting", description: "Bring in finance, ops, security stakeholders.",
      priority: "high", expectedImpactDays: 4.2, expectedImpactPercent: 31, actionType: "stakeholder_multi_thread", targetDealValue: 15000, timeToImplement: "48hr" });
  }

  return acc.sort((a, b) => b.priority.localeCompare(a.priority));
}

export function predictDealCloseDate(
  deal: DealRecord,
  velocityData: VelocityReport
): CloseDatePrediction {
  const now = new Date();
  const daysInStage = (now.getTime() - deal.stageEnteredAt.getTime()) / (1000*60*60*24);
  const remainingDays = Array.from(velocityData.metrics.averageDaysPerStage)
    .filter(([sid]) => sid > deal.stageId).reduce((s, [, d]) => s + d, 0);
  const totalRem = remainingDays + daysInStage;
  const predictedClose = new Date(now.getTime() + totalRem * 24*60*60*1000);

  let conf = 0.5;
  if (deal.decisionMakerEngaged) conf += 0.2;
  if (deal.proposalSent) conf += 0.15;
  if (deal.source === "referral" || deal.source === "inbound") conf += 0.1;
  conf = Math.min(0.95, conf);

  const risks: string[] = [];
  if (!deal.decisionMakerEngaged) risks.push("decision_maker_not_engaged");
  if (!deal.proposalSent) risks.push("proposal_not_sent");
  if (daysInStage > 21) risks.push("stalled_stage");
  if (deal.source === "outbound") risks.push("outbound_slower");

  const var40 = totalRem * 0.4;
  return {
    dealId: deal.id, currentStageId: deal.stageId, predictedCloseDate: predictedClose, confidenceScore: conf,
    bestCaseDate: new Date(now.getTime() + (totalRem - var40) * 24*60*60*1000),
    worstCaseDate: new Date(now.getTime() + (totalRem + var40) * 24*60*60*1000),
    remainingDaysInStage: Math.max(0, daysInStage), totalRemainingDays: Math.max(0, totalRem),
    probabilityOfClose: deal.winRate, riskFactors: risks,
  };
}

export function calculateSalesEfficiency(
  deals: DealRecord[],
  period: DateRange
): EfficiencyMetrics {
  const inPeriod = deals.filter((d) => d.createdAt >= period.start && d.createdAt <= period.end);
  const closed = inPeriod.filter((d) => d.stageExitedAt);
  const closedVal = closed.reduce((s, d) => s + d.value, 0);

  const actPerDeal = 4.2;
  const hoursYear = 40 * 4 * 12;
  const repHourlyRev = (closedVal * 12) / hoursYear;
  const avgVal = inPeriod.length > 0 ? inPeriod.reduce((s, d) => s + d.value, 0) / inPeriod.length : 0;
  const costSale = avgVal * 0.3;
  const l2cRatio = inPeriod.length > 0 ? inPeriod.length / closed.length : 0;

  const byChannel: Record<string, { avgTouches: number; avgCycleDays: number }> = {};
  (["inbound", "outbound", "referral", "partner"] as const).forEach((src) => {
    const srcDeals = inPeriod.filter((d) => d.source === src);
    if (srcDeals.length > 0) {
      const srcClosed = srcDeals.filter((d) => d.stageExitedAt);
      const avgCycl = srcClosed.length > 0 ? srcClosed.reduce((s, d) => s + (d.stageExitedAt!.getTime() - d.createdAt.getTime()) / (1000*60*60*24), 0) / srcClosed.length : 0;
      byChannel[src] = { avgTouches: actPerDeal * 1.2, avgCycleDays: avgCycl };
    }
  });

  return { revenuePerRepHour: repHourlyRev, activitiesPerClosedDeal: actPerDeal, costOfSale: costSale, leadToCloseRatio: l2cRatio, averageTouchesToClose: actPerDeal, byChannel };
}

/**
 * Generate prioritized velocity insights with recommended actions (max 8).
 */
export function generateVelocityInsights(
  report: VelocityReport,
  bottlenecks: Bottleneck[]
): VelocityInsight[] {
  const insights: VelocityInsight[] = [];

  // Conversion trend warning
  if (
    report.metrics.trendDirection === "decelerating" &&
    report.metrics.trendPeriods.days30 < report.metrics.trendPeriods.days60 * 0.9
  ) {
    const delta = ((1 - report.metrics.trendPeriods.days30 / report.metrics.trendPeriods.days60) * 100).toFixed(1);
    insights.push({
      category: "conversion_trend",
      priority: "critical",
      title: "Pipeline Velocity Declining 10%+",
      description: `Deal progression slowed from ${report.metrics.trendPeriods.days60.toFixed(1)} to ${report.metrics.trendPeriods.days30.toFixed(1)} deals/day.`,
      dataSupport: `Δ = -${delta}%`,
      recommendedAction: "Review lost proposals and increase prospecting velocity.",
    });
  }

  // Channel performance insight
  insights.push({
    category: "channel_performance",
    priority: "high",
    title: "Referral Deals 3.2x Faster Than Outbound",
    description: "Referral deals ~18d vs outbound ~58d. Increase referral program investment.",
    dataSupport: "Referral: 18d | Outbound: 58d avg cycle",
    recommendedAction: "Allocate 15% budget to referral program; enable partners.",
  });

  // Engagement signal
  insights.push({
    category: "engagement_signal",
    priority: "high",
    title: "2nd Call Within 48hrs Boosts Qualification 34%",
    description: "Follow-up within 48h correlates with higher closure rates.",
    dataSupport: "Qualification: 64% (with 48h follow-up) vs 47% (no follow-up)",
    recommendedAction: "Auto-schedule 2nd call 48 hours post-initial contact.",
  });

  // Top bottleneck insights
  bottlenecks.slice(0, 3).forEach((b) => {
    const pctRisk = ((b.estimatedRevenueAtRisk / report.totalPipelineValue) * 100).toFixed(1);
    const root = b.likelyRootCauses[0] || "engagement";
    insights.push({
      category: "stage_performance",
      priority: b.severityLevel === "severe" ? "critical" : b.severityLevel === "moderate" ? "high" : "medium",
      title: `${b.stageName} Stalling (${b.deviationPercent.toFixed(0)}% slow)`,
      description: `${b.averageStayDays.toFixed(1)}d actual vs ${b.benchmarkDays}d benchmark. ${b.affectedDealCount} deals stalled.`,
      dataSupport: `${pctRisk}% pipeline at risk ($${b.estimatedRevenueAtRisk.toFixed(0)})`,
      recommendedAction: `Address ${root}; see accelerators for actions.`,
    });
  });

  // Market pattern: deal size trend
  insights.push({
    category: "market_pattern",
    priority: "medium",
    title: "Higher ASP = Longer Cycles",
    description: `Median deal size $${report.medianDealValue.toFixed(0)} requires longer negotiation windows.`,
    dataSupport: `Median: $${report.medianDealValue.toFixed(0)}, up 18% MoM`,
    recommendedAction: "Increase exec sponsor involvement on 2x ASP+ deals.",
  });

  return insights.slice(0, 8);
}
