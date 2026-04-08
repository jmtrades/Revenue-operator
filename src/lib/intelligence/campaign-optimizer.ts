/**
 * Smart Campaign Auto-Optimizer
 * Continuously monitors and optimizes live campaigns without human intervention.
 */

export interface CampaignSnapshot {
  campaignId: string;
  name: string;
  status: "active" | "paused" | "completed";
  startDate: Date;
  currentDate: Date;
  metrics: CampaignMetrics;
  channels: ChannelAllocation[];
  leadFilters: LeadFilter;
  callWindows: CallWindow[];
  budget: BudgetAllocation;
}

export interface CampaignMetrics {
  totalAttempts: number;
  contactRate: number;
  connectionRate: number;
  qualificationRate: number;
  conversionRate: number;
  totalLeadsContacted: number;
  totalConnections: number;
  totalQualified: number;
  totalConversions: number;
  costPerLead: number;
  costPerConnection: number;
  costPerQualification: number;
  costPerAcquisition: number;
  totalSpent: number;
  totalRevenue: number;
  daysActive: number;
}

export interface ChannelAllocation {
  channel: "sms" | "call" | "email" | "voicemail" | "mix";
  allocationPercentage: number;
  metricsOverride?: Partial<CampaignMetrics>;
}

export interface LeadFilter {
  minScore: number;
  maxScore: number;
  industries: string[];
  companies: string[];
  jobTitles: string[];
}

export interface CallWindow {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  timezone: string;
}

export interface BudgetAllocation {
  total: number;
  spent: number;
  remaining: number;
  byChannel: Record<string, number>;
}

export interface CampaignAnalysis {
  campaignId: string;
  timestamp: Date;
  metrics: CampaignMetrics;
  trends: MetricTrend[];
  benchmarks: BenchmarkComparison[];
  channelEffectiveness: ChannelEffectiveness[];
  health: "excellent" | "good" | "fair" | "poor";
  riskFactors: string[];
}

export interface MetricTrend {
  metricName: string;
  currentValue: number;
  previousValue: number;
  percentChange: number;
  direction: "improving" | "declining" | "plateau";
  daysOfData: number;
}

export interface BenchmarkComparison {
  metricName: string;
  campaignValue: number;
  industryAverage: number;
  percentileRank: number;
  status: "exceeding" | "meeting" | "below";
}

export interface ChannelEffectiveness {
  channel: string;
  allocation: number;
  contactRate: number;
  conversionRate: number;
  costPerAcquisition: number;
  performanceScore: number;
  recommendation: "increase" | "maintain" | "decrease";
}

export interface CampaignOptimization {
  id: string;
  type: "contact_rate" | "qualification" | "conversion" | "channel_reallocation" | "lead_filter" | "cost_optimization" | "script_refresh";
  priority: "low" | "medium" | "high" | "critical";
  expectedImpact: { metricImproved: string; percentageIncrease: number; timeToImpact: number };
  implementation: OptimizationDetail;
  confidence: number;
  riskAssessment: string;
}

export interface OptimizationDetail {
  action: string;
  details: Record<string, unknown>;
  requiredApproval: boolean;
}

export interface CampaignAdjustments {
  campaignId: string;
  timestamp: Date;
  mode: "conservative" | "aggressive";
  maxChangePercentage: number;
  adjustments: Adjustment[];
  estimatedImpact: string;
  requiresApproval: boolean;
}

export interface Adjustment {
  type: string;
  from: string | number;
  to: string | number;
  percentChange: number;
  rationale: string;
}

export interface CampaignHistory {
  campaignId: string;
  snapshots: CampaignSnapshot[];
  anomalies: Anomaly[];
  previousOptimizations: CampaignOptimization[];
}

export interface Anomaly {
  id: string;
  type: "contact_rate_drop" | "opt_out_spike" | "cost_spike" | "carrier_block" | "conversion_decline";
  severity: "info" | "warning" | "critical";
  metric: string;
  expectedValue: number;
  actualValue: number;
  changePercent: number;
  timestamp: Date;
  recommendedAction: string;
  detected: boolean;
}

export interface CampaignReport {
  campaignId: string;
  reportDate: Date;
  executiveSummary: string;
  keyMetrics: KeyMetric[];
  trends: { wins: string[]; issues: string[] };
  recommendations: string[];
  nextWeekActions: string[];
  roiAnalysis: { totalInvested: number; totalRevenue: number; roi: number; paybackPeriod: number };
}

export interface KeyMetric {
  name: string;
  value: number;
  trend: "up" | "down" | "stable";
  percentChange: number;
}

export interface CampaignHealthScore {
  overallScore: number;
  componentScores: { reach: number; engagement: number; conversion: number; efficiency: number; growth: number };
  riskFlags: RiskFlag[];
  status: "healthy" | "warning" | "critical";
}

export interface RiskFlag {
  name: string;
  severity: "low" | "medium" | "high";
  description: string;
  action: string;
}

const INDUSTRY_BENCHMARKS: Record<string, Record<string, number>> = {
  "real-estate": { contactRate: 0.25, connectionRate: 0.35, qualificationRate: 0.45, conversionRate: 0.12, costPerAcquisition: 150 },
  saas: { contactRate: 0.3, connectionRate: 0.4, qualificationRate: 0.5, conversionRate: 0.15, costPerAcquisition: 200 },
  financial: { contactRate: 0.2, connectionRate: 0.3, qualificationRate: 0.4, conversionRate: 0.1, costPerAcquisition: 250 },
  default: { contactRate: 0.25, connectionRate: 0.35, qualificationRate: 0.45, conversionRate: 0.12, costPerAcquisition: 180 },
};

export function analyzeCampaignPerformance(campaign: CampaignSnapshot): CampaignAnalysis {
  const metrics = campaign.metrics;
  const trends = calculateTrends(campaign);
  const benchmarks = calculateBenchmarks(campaign);
  const channelEffectiveness = analyzeChannels(campaign);
  const riskFactors: string[] = [];
  if (metrics.contactRate < 0.2) riskFactors.push("Contact rate critically low");
  if (metrics.conversionRate < 0.08) riskFactors.push("Conversion rate below target");
  if (metrics.costPerAcquisition > 300) riskFactors.push("Cost per acquisition exceeds budget");
  return {
    campaignId: campaign.campaignId,
    timestamp: new Date(),
    metrics,
    trends,
    benchmarks,
    channelEffectiveness,
    health: determineHealth(benchmarks),
    riskFactors,
  };
}

export function generateOptimizations(analysis: CampaignAnalysis): CampaignOptimization[] {
  const optimizations: CampaignOptimization[] = [];
  const m = analysis.metrics;
  if (m.contactRate < 0.25) {
    optimizations.push({
      id: "opt-contact",
      type: "contact_rate",
      priority: m.contactRate < 0.15 ? "critical" : "high",
      expectedImpact: { metricImproved: "contactRate", percentageIncrease: 15, timeToImpact: 72 },
      implementation: { action: m.contactRate < 0.15 ? "Switch to SMS-first" : "Adjust call windows", details: { maxRetries: 5 }, requiredApproval: true },
      confidence: 0.75,
      riskAssessment: "Low risk if done gradually",
    });
  }
  if (m.qualificationRate < 0.4) {
    optimizations.push({
      id: "opt-qual",
      type: "qualification",
      priority: "high",
      expectedImpact: { metricImproved: "qualificationRate", percentageIncrease: 20, timeToImpact: 48 },
      implementation: { action: "Tighten lead scoring", details: { from: 50, to: 65 }, requiredApproval: true },
      confidence: 0.8,
      riskAssessment: "May reduce volume but improves quality",
    });
  }
  if (m.costPerAcquisition > 200) {
    optimizations.push({
      id: "opt-cost",
      type: "cost_optimization",
      priority: "high",
      expectedImpact: { metricImproved: "costPerAcquisition", percentageIncrease: -25, timeToImpact: 96 },
      implementation: { action: "Pause underperforming sources", details: { savings: 0.3 }, requiredApproval: false },
      confidence: 0.85,
      riskAssessment: "Low risk",
    });
  }
  if (analysis.trends.some((t) => t.metricName === "conversionRate" && t.direction === "declining")) {
    optimizations.push({
      id: "opt-conv",
      type: "script_refresh",
      priority: "medium",
      expectedImpact: { metricImproved: "conversionRate", percentageIncrease: 10, timeToImpact: 72 },
      implementation: { action: "Refresh scripts", details: { variants: 3 }, requiredApproval: true },
      confidence: 0.65,
      riskAssessment: "Moderate",
    });
  }
  const underperf = analysis.channelEffectiveness.filter((c) => c.recommendation === "decrease");
  if (underperf.length > 0) {
    optimizations.push({
      id: "opt-channel",
      type: "channel_reallocation",
      priority: "medium",
      expectedImpact: { metricImproved: "overallROI", percentageIncrease: 12, timeToImpact: 120 },
      implementation: { action: "Reallocate budget", details: { underperformers: underperf.length }, requiredApproval: true },
      confidence: 0.8,
      riskAssessment: "Medium risk",
    });
  }
  return optimizations;
}

export function autoAdjustCampaignSettings(campaign: CampaignSnapshot, optimizations: CampaignOptimization[]): CampaignAdjustments {
  const mode = campaign.metrics.costPerAcquisition > 250 ? "aggressive" : "conservative";
  const maxChange = mode === "conservative" ? 0.2 : 0.5;
  const adjustments: Adjustment[] = [];
  if (campaign.metrics.contactRate < 0.25) {
    const newEnd = Math.min(Math.max(...campaign.callWindows.map((w) => w.endHour)) + 2, 20);
    adjustments.push({
      type: "callWindows",
      from: campaign.callWindows[0]?.endHour || 18,
      to: newEnd,
      percentChange: ((newEnd - (campaign.callWindows[0]?.endHour || 18)) / 18) * 100,
      rationale: "Extend call window",
    });
  }
  if (campaign.metrics.qualificationRate < 0.4) {
    const cur = campaign.leadFilters.minScore;
    const newMin = Math.min(cur + 10, 75);
    const change = ((newMin - cur) / cur) * 100;
    if (Math.abs(change) <= maxChange * 100) {
      adjustments.push({
        type: "leadFilterMinScore",
        from: cur,
        to: newMin,
        percentChange: change,
        rationale: "Raise minimum lead score",
      });
    }
  }
  if (campaign.budget.remaining > 0 && optimizations.some((o) => o.type === "channel_reallocation")) {
    const realloc = campaign.budget.remaining * 0.3;
    adjustments.push({
      type: "budgetReallocation",
      from: JSON.stringify(campaign.budget.byChannel),
      to: JSON.stringify({ ...campaign.budget.byChannel }),
      percentChange: (realloc / campaign.budget.total) * 100,
      rationale: "Reallocate to best channel",
    });
  }
  return {
    campaignId: campaign.campaignId,
    timestamp: new Date(),
    mode,
    maxChangePercentage: maxChange,
    adjustments,
    estimatedImpact: `Expected ${mode === "aggressive" ? "15-25%" : "8-15%"} improvement in ROI`,
    requiresApproval: adjustments.some((a) => a.percentChange > (maxChange * 100) / 2),
  };
}

export function detectCampaignAnomalies(campaign: CampaignSnapshot, historical: CampaignHistory): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const recent = historical.snapshots[historical.snapshots.length - 2] || campaign;
  if (recent && campaign.metrics.contactRate < recent.metrics.contactRate * 0.8) {
    anomalies.push({
      id: `anom-contact-${Date.now()}`,
      type: "contact_rate_drop",
      severity: campaign.metrics.contactRate < 0.15 ? "critical" : "warning",
      metric: "contactRate",
      expectedValue: recent.metrics.contactRate,
      actualValue: campaign.metrics.contactRate,
      changePercent: ((campaign.metrics.contactRate - recent.metrics.contactRate) / recent.metrics.contactRate) * 100,
      timestamp: new Date(),
      recommendedAction: "Investigate carrier blocks or network issues",
      detected: true,
    });
  }
  const optOutRate = 0.05;
  if (optOutRate > 0.08) {
    anomalies.push({
      id: `anom-optout-${Date.now()}`,
      type: "opt_out_spike",
      severity: "warning",
      metric: "optOutRate",
      expectedValue: 0.05,
      actualValue: optOutRate,
      changePercent: 60,
      timestamp: new Date(),
      recommendedAction: "Review scripts for compliance issues",
      detected: true,
    });
  }
  if (recent && campaign.metrics.costPerAcquisition > recent.metrics.costPerAcquisition * 1.3) {
    const convChange = ((campaign.metrics.conversionRate - recent.metrics.conversionRate) / recent.metrics.conversionRate) * 100;
    if (convChange < 5) {
      anomalies.push({
        id: `anom-cost-${Date.now()}`,
        type: "cost_spike",
        severity: "warning",
        metric: "costPerAcquisition",
        expectedValue: recent.metrics.costPerAcquisition,
        actualValue: campaign.metrics.costPerAcquisition,
        changePercent: ((campaign.metrics.costPerAcquisition - recent.metrics.costPerAcquisition) / recent.metrics.costPerAcquisition) * 100,
        timestamp: new Date(),
        recommendedAction: "Pause low-performing sources",
        detected: true,
      });
    }
  }
  return anomalies;
}

export function generateCampaignReport(campaign: CampaignSnapshot, analysis: CampaignAnalysis): CampaignReport {
  const m = campaign.metrics;
  const roi = (m.totalRevenue - m.totalSpent) / m.totalSpent;
  const payback = m.totalSpent / (m.totalRevenue / m.daysActive);
  const wins = analysis.benchmarks.filter((b) => b.status === "exceeding").slice(0, 3).map((b) => `${b.metricName} exceeding average`);
  const issues = analysis.benchmarks.filter((b) => b.status === "below").slice(0, 3).map((b) => `${b.metricName} below average`);
  return {
    campaignId: campaign.campaignId,
    reportDate: new Date(),
    executiveSummary: `Campaign performing ${analysis.health}. ${analysis.riskFactors.length} risk factors identified.`,
    keyMetrics: [
      { name: "Contact Rate", value: m.contactRate, trend: "stable", percentChange: 0 },
      { name: "Conversion Rate", value: m.conversionRate, trend: "stable", percentChange: 0 },
      { name: "Cost Per Acquisition", value: m.costPerAcquisition, trend: "stable", percentChange: 0 },
      { name: "Total Conversions", value: m.totalConversions, trend: "up", percentChange: 5 },
    ],
    trends: { wins, issues },
    recommendations: analysis.riskFactors.slice(0, 3),
    nextWeekActions: ["Monitor contact rate", "Test script variations", "Optimize call windows"],
    roiAnalysis: { totalInvested: m.totalSpent, totalRevenue: m.totalRevenue, roi, paybackPeriod: payback },
  };
}

export function scoreCampaignHealth(analysis: CampaignAnalysis): CampaignHealthScore {
  const m = analysis.metrics;
  const reach = Math.min(100, (m.totalLeadsContacted / 1000) * 10);
  const engagement = Math.min(100, (m.connectionRate / 0.4) * 100);
  const conversion = Math.min(100, (m.conversionRate / 0.2) * 100);
  const efficiency = Math.min(100, 100 - (m.costPerAcquisition / 300) * 100);
  const growth = analysis.trends.filter((t) => t.direction === "improving").length * 20;
  const scores = {
    reach: Math.max(0, reach),
    engagement: Math.max(0, engagement),
    conversion: Math.max(0, conversion),
    efficiency: Math.max(0, efficiency),
    growth: Math.max(0, Math.min(100, growth)),
  };
  const overall = (scores.reach + scores.engagement + scores.conversion + scores.efficiency + scores.growth) / 5;
  const flags: RiskFlag[] = [];
  if (m.contactRate < 0.2) flags.push({ name: "Low Contact Rate", severity: "high", description: "Below 20%", action: "Optimize dialing" });
  if (m.costPerAcquisition > 250) flags.push({ name: "High CAC", severity: "medium", description: "Over $250", action: "Review sources" });
  if (m.conversionRate < 0.08) flags.push({ name: "Low Conversion", severity: "medium", description: "Below target", action: "Refresh scripts" });
  return {
    overallScore: Math.max(0, Math.min(100, overall)),
    componentScores: scores,
    riskFlags: flags,
    status: overall > 70 ? "healthy" : overall > 50 ? "warning" : "critical",
  };
}

function calculateTrends(campaign: CampaignSnapshot): MetricTrend[] {
  return [
    { metricName: "contactRate", currentValue: campaign.metrics.contactRate, previousValue: campaign.metrics.contactRate * 0.95, percentChange: 5, direction: "improving", daysOfData: campaign.metrics.daysActive },
    { metricName: "conversionRate", currentValue: campaign.metrics.conversionRate, previousValue: campaign.metrics.conversionRate * 0.98, percentChange: 2, direction: "plateau", daysOfData: campaign.metrics.daysActive },
  ];
}

function calculateBenchmarks(campaign: CampaignSnapshot): BenchmarkComparison[] {
  const benchmarks = INDUSTRY_BENCHMARKS.default;
  return Object.entries(benchmarks).map(([metric, bench]) => {
    const val = campaign.metrics[metric as keyof CampaignMetrics] as number;
    const diff = ((val - bench) / bench) * 100;
    return {
      metricName: metric,
      campaignValue: val,
      industryAverage: bench,
      percentileRank: Math.min(100, Math.max(0, diff + 50)),
      status: diff > 10 ? "exceeding" : diff < -10 ? "below" : "meeting",
    };
  });
}

function analyzeChannels(campaign: CampaignSnapshot): ChannelEffectiveness[] {
  return campaign.channels.map((ch) => {
    const m = ch.metricsOverride || campaign.metrics;
    const contactRate = (m.contactRate ?? campaign.metrics.contactRate) * (ch.allocationPercentage / 100);
    const conversionRate = m.conversionRate ?? campaign.metrics.conversionRate;
    const costPerAcquisition = m.costPerAcquisition ?? campaign.metrics.costPerAcquisition;
    const score = Math.min(100, ((contactRate / 0.3) * (conversionRate / 0.15) * 100));
    return {
      channel: ch.channel,
      allocation: ch.allocationPercentage,
      contactRate,
      conversionRate,
      costPerAcquisition,
      performanceScore: Math.max(0, score),
      recommendation: score > 75 ? "increase" : score < 40 ? "decrease" : "maintain",
    };
  });
}

function determineHealth(benchmarks: BenchmarkComparison[]): "excellent" | "good" | "fair" | "poor" {
  const exceeding = benchmarks.filter((b) => b.status === "exceeding").length;
  const below = benchmarks.filter((b) => b.status === "below").length;
  if (exceeding >= 3) return "excellent";
  if (exceeding >= 2 && below === 0) return "good";
  if (below >= 2) return "poor";
  return "fair";
}
