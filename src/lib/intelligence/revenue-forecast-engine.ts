/**
 * Revenue Forecasting & Pipeline Intelligence Engine
 * AI-powered revenue prediction, pipeline health analysis, and actionable insights
 * No external dependencies — pure TypeScript
 */

/**
 * INTERFACES
 */

export interface DealSnapshot {
  id: string;
  leadId: string;
  valueCents: number;
  status: "open" | "won" | "lost";
  stage: "initial" | "qualified" | "engaged" | "negotiation" | "closed";
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  source: string;
  industry?: string;
  engagementScore: number; // 0-100
  touches: number;
  lastTouchDaysAgo: number;
}

export interface PipelineSnapshot {
  deals: DealSnapshot[];
  targetRevenueCents: number;
  currentQuotaCents: number;
  quarterStartDate: Date;
  quarterEndDate: Date;
  segmentId?: string;
}

export interface HistoricalMetrics {
  overallCloseRate: number; // 0-1
  closeRateByStage: Record<string, number>;
  closeRateBySource: Record<string, number>;
  closeRateByIndustry: Record<string, number>;
  avgDealSizeByStage: Record<string, number>;
  avgDaysInStage: Record<string, number>;
  seasonalityFactors: Record<number, number>; // month -> multiplier
  recentWinRate: number; // last 30 days
  avgEngagementToWin: number;
  mingledTouchThreshold: number;
}

export interface RevenueForecast {
  expected30Day: number;
  expected60Day: number;
  expected90Day: number;
  bestCase: number;
  worstCase: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  confidenceScore: number; // 0-1
  seasonalityAdjustment: number;
  pipelineVelocity: number; // deals advancing per day
}

export interface PipelineHealthReport {
  overallHealth: "excellent" | "good" | "fair" | "poor";
  stageConversionRates: Record<string, number>;
  conversionVsBenchmark: Record<string, number>; // -0.5 to 0.5
  coverageRatio: number; // pipeline / target
  coverageStatus: "above_target" | "at_target" | "below_target";
  avgDealAgeByStage: Record<string, number>; // days
  staleDealCount: number; // > 30 days no activity
  concentrationRisk: {
    topDealPercentage: number;
    top3DealPercentage: number;
    riskLevel: "low" | "medium" | "high";
  };
  sourceQualityAnalysis: Record<string, { winRate: number; avgDays: number }>;
  stageLeakage: Array<{
    stage: string;
    lossDealCount: number;
    lossRate: number;
  }>;
}

export interface AtRiskDeal {
  dealId: string;
  leadId: string;
  valueCents: number;
  riskFactors: string[];
  riskScore: number; // 0-100
  daysSinceActivity: number;
  engagementScore: number;
  stageDurationDaysAboveAvg: number;
  recommendation: string;
}

export interface RevenueInsight {
  type:
    | "pipeline_gap"
    | "stage_conversion"
    | "deal_aging"
    | "source_quality"
    | "concentration"
    | "engagement";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  metric: number | null;
  benchmark: number | null;
  actionItems: string[];
}

/**
 * FUNCTIONS
 */

export function calculateWinProbability(
  deal: DealSnapshot,
  historicalData: HistoricalMetrics
): number {
  if (deal.status !== "open") {
    return deal.status === "won" ? 1.0 : 0.0;
  }

  // Multi-factor win probability calculation
  let probability = 0.5; // baseline

  // Stage weight: 40%
  const stageCloseRate = historicalData.closeRateByStage[deal.stage] ?? 0.3;
  probability += (stageCloseRate - 0.5) * 0.4;

  // Engagement score: 25%
  const engagementFactor = (deal.engagementScore / 100) * 0.25;
  probability += engagementFactor - 0.125;

  // Deal age adjustment: 15% (newer deals tend to close faster)
  const daysOld = Math.floor(
    (Date.now() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const ageStageAvg = historicalData.avgDaysInStage[deal.stage] ?? 14;
  const ageFactor = Math.max(0, Math.min(1, 1 - daysOld / (ageStageAvg * 2)));
  probability += (ageFactor - 0.5) * 0.15;

  // Source quality: 10%
  const sourceCloseRate = historicalData.closeRateBySource[deal.source] ?? 0.5;
  probability += (sourceCloseRate - 0.5) * 0.1;

  // Industry factor: 10% (if available)
  if (deal.industry) {
    const industryCloseRate =
      historicalData.closeRateByIndustry[deal.industry] ?? 0.5;
    probability += (industryCloseRate - 0.5) * 0.1;
  }

  // Touches factor: deals with engagement above threshold get slight boost
  if (deal.touches >= Math.max(3, historicalData.mingledTouchThreshold)) {
    probability += 0.05;
  }

  return Math.max(0, Math.min(1, probability));
}

export function forecastRevenue(
  pipeline: PipelineSnapshot,
  historicalData: HistoricalMetrics
): RevenueForecast {
  const now = new Date();
  const _days30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const _days60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const _days90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Calculate seasonality adjustment
  const currentMonth = now.getMonth() + 1;
  const seasonalityMultiplier =
    pipeline.segmentId && historicalData.seasonalityFactors[currentMonth]
      ? historicalData.seasonalityFactors[currentMonth]
      : 1.0;

  // Calculate probability-weighted revenue for each timeframe
  const deals = pipeline.deals.filter((d) => d.status === "open");

  let revenue30 = 0;
  let revenue60 = 0;
  let revenue90 = 0;
  let worstCaseRevenue = 0;
  let bestCaseRevenue = 0;

  const probabilityByDeal: Array<{
    dealId: string;
    probability: number;
    valueCents: number;
  }> = [];

  for (const deal of deals) {
    const probability = calculateWinProbability(deal, historicalData);
    probabilityByDeal.push({
      dealId: deal.id,
      probability,
      valueCents: deal.valueCents,
    });

    // Estimate close date based on stage and historical avg
    const stageAvgDays = historicalData.avgDaysInStage[deal.stage] ?? 14;
    const estimatedCloseDays = stageAvgDays * (1 - probability);

    // Weighted revenue by probability and stage
    const weightedRevenue = deal.valueCents * probability;

    if (estimatedCloseDays <= 30) {
      revenue30 += weightedRevenue;
      revenue60 += weightedRevenue;
      revenue90 += weightedRevenue;
    } else if (estimatedCloseDays <= 60) {
      revenue60 += weightedRevenue;
      revenue90 += weightedRevenue;
    } else if (estimatedCloseDays <= 90) {
      revenue90 += weightedRevenue;
    }

    // Best case: all deals with some probability close
    if (probability > 0.3) bestCaseRevenue += deal.valueCents;

    // Worst case: only very high-probability deals close
    if (probability > 0.8) worstCaseRevenue += deal.valueCents;
  }

  // Apply seasonality
  revenue30 *= seasonalityMultiplier;
  revenue60 *= seasonalityMultiplier;
  revenue90 *= seasonalityMultiplier;
  worstCaseRevenue *= seasonalityMultiplier;
  bestCaseRevenue *= seasonalityMultiplier;

  // Calculate confidence based on pipeline size and velocity
  const pipelineVelocity = Math.max(0, deals.length / 30); // deals per day
  const dataPoints = probabilityByDeal.length;
  const confidenceScore = Math.min(
    1,
    0.5 + (dataPoints / 20) * 0.3 + (pipelineVelocity / 2) * 0.2
  );

  // Confidence interval (using 68% confidence = 1 std dev)
  const stdDev = Math.sqrt(
    probabilityByDeal.reduce((sum, p) => sum + p.probability * (1 - p.probability) * p.valueCents ** 2, 0) /
      Math.max(1, dataPoints)
  );
  const lower = Math.max(0, revenue60 - stdDev);
  const upper = revenue60 + stdDev;

  return {
    expected30Day: Math.round(revenue30),
    expected60Day: Math.round(revenue60),
    expected90Day: Math.round(revenue90),
    bestCase: Math.round(bestCaseRevenue),
    worstCase: Math.round(worstCaseRevenue),
    confidenceInterval: {
      lower: Math.round(lower),
      upper: Math.round(upper),
    },
    confidenceScore,
    seasonalityAdjustment: seasonalityMultiplier,
    pipelineVelocity,
  };
}

export function analyzePipelineHealth(
  pipeline: PipelineSnapshot
): PipelineHealthReport {
  const deals = pipeline.deals;
  const _totalDealCount = deals.length;
  const openDealCount = deals.filter((d) => d.status === "open").length;
  const _wonDealCount = deals.filter((d) => d.status === "won").length;
  const _lostDealCount = deals.filter((d) => d.status === "lost").length;

  // Stage conversion rates
  const stageConversionRates: Record<string, number> = {};
  const stageGrouped = deals.reduce(
    (acc, d) => {
      if (!acc[d.stage]) acc[d.stage] = [];
      acc[d.stage].push(d);
      return acc;
    },
    {} as Record<string, DealSnapshot[]>
  );

  const stages = [
    "initial",
    "qualified",
    "engaged",
    "negotiation",
    "closed",
  ];
  for (const stage of stages) {
    const stageDeals = stageGrouped[stage] ?? [];
    const stageWons = stageDeals.filter((d) => d.status === "won").length;
    stageConversionRates[stage] =
      stageDeals.length > 0 ? stageWons / stageDeals.length : 0;
  }

  // Benchmark comparison (industry standard benchmarks)
  const benchmarks: Record<string, number> = {
    initial: 0.3,
    qualified: 0.5,
    engaged: 0.65,
    negotiation: 0.8,
    closed: 1.0,
  };
  const conversionVsBenchmark: Record<string, number> = {};
  for (const stage of stages) {
    conversionVsBenchmark[stage] =
      (stageConversionRates[stage] ?? 0) - (benchmarks[stage] ?? 0.5);
  }

  // Coverage ratio
  const totalPipelineValue = deals.reduce((sum, d) => sum + d.valueCents, 0);
  const coverageRatio = totalPipelineValue / pipeline.targetRevenueCents;
  const coverageStatus =
    coverageRatio > 1.2
      ? "above_target"
      : coverageRatio > 0.8
        ? "at_target"
        : "below_target";

  // Average deal age by stage
  const avgDealAgeByStage: Record<string, number> = {};
  const now = new Date();
  for (const stage of stages) {
    const stageDeals = stageGrouped[stage] ?? [];
    const avgAge =
      stageDeals.length > 0
        ? stageDeals.reduce(
            (sum, d) =>
              sum +
              Math.floor(
                (now.getTime() - d.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
              ),
            0
          ) / stageDeals.length
        : 0;
    avgDealAgeByStage[stage] = Math.round(avgAge);
  }

  // Stale deals (no activity in 30+ days)
  const staleDealCount = deals.filter((d) => {
    const daysSinceActivity = Math.floor(
      (now.getTime() - d.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceActivity >= 30 && d.status === "open";
  }).length;

  // Concentration risk
  const sortedByValue = [...deals].sort((a, b) => b.valueCents - a.valueCents);
  const topDealValue =
    sortedByValue.length > 0 ? sortedByValue[0].valueCents : 0;
  const top3DealValue =
    sortedByValue.slice(0, 3).reduce((sum, d) => sum + d.valueCents, 0) ?? 0;
  const topDealPercentage =
    totalPipelineValue > 0
      ? Math.round((topDealValue / totalPipelineValue) * 100)
      : 0;
  const top3DealPercentage =
    totalPipelineValue > 0
      ? Math.round((top3DealValue / totalPipelineValue) * 100)
      : 0;
  const concentrationRiskLevel =
    topDealPercentage > 40 ? "high" : topDealPercentage > 25 ? "medium" : "low";

  // Source quality analysis
  const sourceGrouped = deals.reduce(
    (acc, d) => {
      if (!acc[d.source]) acc[d.source] = [];
      acc[d.source].push(d);
      return acc;
    },
    {} as Record<string, DealSnapshot[]>
  );
  const sourceQualityAnalysis: Record<
    string,
    { winRate: number; avgDays: number }
  > = {};
  for (const [source, sourceDeal] of Object.entries(sourceGrouped)) {
    const winCount = sourceDeal.filter((d) => d.status === "won").length;
    const avgDays = Math.round(
      sourceDeal.reduce(
        (sum, d) =>
          sum +
          Math.floor(
            (now.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          ),
        0
      ) / Math.max(1, sourceDeal.length)
    );
    sourceQualityAnalysis[source] = {
      winRate: sourceDeal.length > 0 ? winCount / sourceDeal.length : 0,
      avgDays,
    };
  }

  // Stage-by-stage leakage
  const stageLeakage: Array<{
    stage: string;
    lossDealCount: number;
    lossRate: number;
  }> = [];
  for (const stage of stages) {
    const stageDeals = stageGrouped[stage] ?? [];
    const lossDealCount = stageDeals.filter((d) => d.status === "lost").length;
    const lossRate =
      stageDeals.length > 0 ? lossDealCount / stageDeals.length : 0;
    stageLeakage.push({ stage, lossDealCount, lossRate });
  }

  // Overall health
  const healthScore =
    (coverageRatio > 1 ? 1 : coverageRatio) * 0.3 +
    (1 - staleDealCount / Math.max(1, openDealCount)) * 0.3 +
    (concentrationRiskLevel === "low" ? 1 : concentrationRiskLevel === "medium" ? 0.6 : 0.2) * 0.2 +
    (Object.values(conversionVsBenchmark).filter((v) => v > -0.2).length / Object.keys(conversionVsBenchmark).length) * 0.2;

  const overallHealth =
    healthScore > 0.8
      ? "excellent"
      : healthScore > 0.6
        ? "good"
        : healthScore > 0.4
          ? "fair"
          : "poor";

  return {
    overallHealth,
    stageConversionRates,
    conversionVsBenchmark,
    coverageRatio: Math.round(coverageRatio * 100) / 100,
    coverageStatus,
    avgDealAgeByStage,
    staleDealCount,
    concentrationRisk: {
      topDealPercentage,
      top3DealPercentage,
      riskLevel: concentrationRiskLevel,
    },
    sourceQualityAnalysis,
    stageLeakage,
  };
}

export function identifyAtRiskDeals(pipeline: PipelineSnapshot): AtRiskDeal[] {
  const now = new Date();
  const atRiskDeals: AtRiskDeal[] = [];

  for (const deal of pipeline.deals) {
    if (deal.status !== "open") continue;

    const riskFactors: string[] = [];
    let riskScore = 0;

    // Stale deals (no activity in 7+ days)
    const daysSinceActivity = Math.floor(
      (now.getTime() - deal.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceActivity >= 7) {
      riskFactors.push(`No activity in ${daysSinceActivity} days`);
      riskScore += Math.min(25, daysSinceActivity / 2);
    }

    // Declining engagement
    if (deal.engagementScore < 30) {
      riskFactors.push("Low engagement score");
      riskScore += 20;
    }

    // Deal aging (past average stage duration)
    const daysInStage = Math.floor(
      (now.getTime() - deal.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const avgStageTime = {
      initial: 7,
      qualified: 10,
      engaged: 14,
      negotiation: 21,
      closed: 0,
    } as Record<string, number>;
    const stageDurationAboveAvg = Math.max(
      0,
      daysInStage - (avgStageTime[deal.stage] ?? 14)
    );
    if (stageDurationAboveAvg > 7) {
      riskFactors.push(`In ${deal.stage} stage ${stageDurationAboveAvg} days over average`);
      riskScore += Math.min(20, stageDurationAboveAvg / 2);
    }

    // Missing next steps
    if (deal.touches === 0) {
      riskFactors.push("No touches recorded");
      riskScore += 15;
    }

    // Ghost leads (no response in 3+ touches)
    if (deal.touches >= 3 && daysSinceActivity >= 5) {
      riskFactors.push(`Ghost lead: ${deal.touches} touches, no response`);
      riskScore += 25;
    }

    if (riskScore > 0) {
      atRiskDeals.push({
        dealId: deal.id,
        leadId: deal.leadId,
        valueCents: deal.valueCents,
        riskFactors,
        riskScore: Math.min(100, riskScore),
        daysSinceActivity,
        engagementScore: deal.engagementScore,
        stageDurationDaysAboveAvg: stageDurationAboveAvg,
        recommendation: generateAtRiskRecommendation(riskScore, riskFactors),
      });
    }
  }

  return atRiskDeals.sort((a, b) => b.riskScore - a.riskScore);
}

export function generateRevenueInsights(
  forecast: RevenueForecast,
  health: PipelineHealthReport
): RevenueInsight[] {
  const insights: RevenueInsight[] = [];

  // Pipeline gap
  if (health.coverageStatus === "below_target") {
    const gap = Math.round(health.coverageRatio * 100);
    insights.push({
      type: "pipeline_gap",
      priority: gap < 50 ? "critical" : "high",
      title: "Pipeline Below Target",
      description: `Pipeline coverage is at ${gap}% of target. You need ${Math.round((1 - health.coverageRatio) * 100)}% more qualified opportunities.`,
      metric: health.coverageRatio,
      benchmark: 1.0,
      actionItems: [
        `Generate ${Math.ceil((1 - health.coverageRatio) * 20)} new qualified leads`,
        "Review source quality and increase sourcing from top-performing channels",
        "Accelerate conversion of existing engaged opportunities",
      ],
    });
  }

  // Stage conversion issues
  for (const [stage, vs] of Object.entries(health.conversionVsBenchmark)) {
    if (vs < -0.15) {
      insights.push({
        type: "stage_conversion",
        priority: vs < -0.25 ? "high" : "medium",
        title: `${stage.charAt(0).toUpperCase() + stage.slice(1)} Conversion Below Benchmark`,
        description: `${stage} conversion rate is ${Math.round(vs * 100)}% below benchmark. Review qualification criteria and sales process.`,
        metric: health.stageConversionRates[stage] ?? 0,
        benchmark: vs + (health.stageConversionRates[stage] ?? 0),
        actionItems: [
          `Analyze failed ${stage} deals for common rejection patterns`,
          "Train team on improved qualification questions",
          "Consider stage criteria adjustment",
        ],
      });
    }
  }

  // Deal aging
  if (health.staleDealCount > 0) {
    insights.push({
      type: "deal_aging",
      priority: health.staleDealCount > 5 ? "high" : "medium",
      title: `${health.staleDealCount} Deals Stale (30+ Days No Activity)`,
      description: `${health.staleDealCount} open deals have no activity in 30+ days. They are at high risk of loss.`,
      metric: health.staleDealCount,
      benchmark: 0,
      actionItems: [
        "Contact stale deals within 24 hours",
        "Escalate or disqualify deals with no response",
        "Implement automated stale deal alerts",
      ],
    });
  }

  // Source quality
  const poorSources = Object.entries(health.sourceQualityAnalysis)
    .filter(([_, { winRate }]) => winRate < 0.2)
    .map(([source]) => source);
  if (poorSources.length > 0) {
    insights.push({
      type: "source_quality",
      priority: "medium",
      title: "Low-Quality Lead Sources",
      description: `Sources ${poorSources.join(", ")} have win rates below 20%. Consider reducing allocation.`,
      metric: null,
      benchmark: null,
      actionItems: [
        `Audit ${poorSources[0]} source for qualification issues`,
        "Redirect budget to higher-converting sources",
        "Improve source qualification criteria",
      ],
    });
  }

  // Concentration risk
  if (health.concentrationRisk.riskLevel === "high") {
    insights.push({
      type: "concentration",
      priority: "high",
      title: "High Revenue Concentration Risk",
      description: `Top deal represents ${health.concentrationRisk.topDealPercentage}% of pipeline. Diversify to reduce risk.`,
      metric: health.concentrationRisk.topDealPercentage,
      benchmark: 25,
      actionItems: [
        "Identify second-tier opportunities for acceleration",
        "Reduce dependency on single large deal",
        "Increase sourcing velocity",
      ],
    });
  }

  // Low engagement
  const avgEngagement =
    health.coverageRatio > 0
      ? Object.values(health.sourceQualityAnalysis).reduce(
          (sum, { winRate }) => sum + winRate,
          0
        ) / Object.keys(health.sourceQualityAnalysis).length
      : 0;
  if (avgEngagement < 0.4) {
    insights.push({
      type: "engagement",
      priority: "medium",
      title: "Overall Pipeline Engagement Low",
      description: "Average deal engagement is below 40%. Increase touch frequency and value delivery.",
      metric: Math.round(avgEngagement * 100),
      benchmark: 60,
      actionItems: [
        "Implement daily engagement cadence",
        "Create stronger value propositions",
        "Schedule discovery calls for top opportunities",
      ],
    });
  }

  return insights.slice(0, 10).sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * HELPERS
 */

function generateAtRiskRecommendation(
  riskScore: number,
  _riskFactors: string[]
): string {
  if (riskScore >= 70) {
    return "Escalate immediately or disqualify. Contact required within 24 hours.";
  }
  if (riskScore >= 50) {
    return "Increase engagement. Schedule touchpoint within 3 days.";
  }
  if (riskScore >= 30) {
    return "Monitor closely. Add to daily check-in list.";
  }
  return "Continue normal cadence. Monitor engagement.";
}
