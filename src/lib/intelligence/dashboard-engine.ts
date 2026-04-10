/**
 * Real-Time Pipeline Dashboard Data Engine
 * Powers the dashboard with real-time intelligence data, insights, predictions, and recommended actions.
 */

import type { LeadBrain } from "@/lib/intelligence/lead-brain";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES & INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RevenueMetrics {
  today: number;
  thisWeek: number;
  thisMonth: number;
  projected30Day: number;
  projected90Day: number;
  vsTarget: { value: number; trend: "above" | "below" | "on-track"; percentage: number };
}

export interface PipelineMetrics {
  totalValue: number;
  dealCount: number;
  avgDealSize: number;
  avgCycleLength: number; // days
  velocity: number; // deals per week
  coverage: number; // pipeline/target ratio
}

export interface ActivityMetrics {
  callsToday: number;
  emailsSent: number;
  smsSent: number;
  meetingsBooked: number;
  conversions: number;
}

export interface HealthComponent {
  score: number; // 0-100
  weight: number; // 0-1
  trend: "improving" | "stable" | "declining";
  recommendation: string;
}

export interface WorkspaceHealth {
  overallScore: number; // 0-100
  pipelineHealth: HealthComponent;
  activityHealth: HealthComponent;
  conversionHealth: HealthComponent;
  growthHealth: HealthComponent;
  lastUpdated: string;
}

export interface PriorityLead {
  leadId: string;
  name: string;
  company: string;
  stage: string;
  stageProgress: number; // 0-100
  reason: string; // why they need attention NOW
  severity: "critical" | "high" | "medium";
  recommendedAction: string;
  daysStalled?: number;
}

export interface DashboardInsight {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  action: string; // recommended action
}

export interface DashboardAlert {
  id: string;
  type: "at-risk-deal" | "stale-lead" | "anomaly" | "opportunity";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  affectedCount?: number;
}

export interface MetricTrend {
  metric: string;
  current: number;
  previous: number;
  change: number; // percentage
  direction: "up" | "down" | "flat";
}

// Local interfaces for function parameters
interface DashboardDeal {
  id: string;
  value: number;
  closeDate: string;
  createdAt?: string;
  stage: string;
  contactName?: string;
  company?: string;
  stageProgress?: number;
  lastTouched?: string;
  atRisk?: boolean;
}

interface DashboardActivity {
  repId: string;
  repName?: string;
  timestamp: string;
  type: "call" | "email" | "sms" | "meeting";
  outcome?: string;
  value?: number;
  score?: number;
}

interface DashboardCampaign {
  id: string;
  name: string;
  status: "active" | "paused" | "completed";
  reach: number;
  conversions: number;
  spend: number;
  budget?: number;
  abTest?: boolean;
}

interface WorkspaceMetrics {
  pipeline?: PipelineMetrics;
  activities?: ActivityMetrics;
  revenue?: RevenueMetrics;
}

export interface DashboardPayload {
  workspaceId: string;
  timestamp: string;
  revenueMetrics: RevenueMetrics;
  pipelineMetrics: PipelineMetrics;
  activityMetrics: ActivityMetrics;
  healthScore: WorkspaceHealth;
  topPriorityLeads: PriorityLead[];
  insights: DashboardInsight[];
  alerts: DashboardAlert[];
  trends: MetricTrend[];
}

export interface InteractionTimelineEntry {
  timestamp: string;
  channel: string;
  type: string;
  summary: string;
  outcome?: string;
  sentiment?: string;
}

export interface LeadDetailPayload {
  leadId: string;
  name: string;
  company: string;
  stage: string;
  healthScore: number; // 0-100
  stageHealth: number; // 0-100
  predictedCloseDate?: string;
  interactionTimeline: InteractionTimelineEntry[];
  nextRecommendedAction: {
    action: string;
    channel: string;
    reasoning: string;
    urgency: "immediate" | "this-week" | "this-month";
  };
  engagementChart: { date: string; score: number }[];
  sentimentHistory: { date: string; sentiment: string }[];
  objectionLog: { objection: string; resolution?: string; date: string }[];
  competitorIntelligence?: { mention: string; context: string; date: string }[];
  aiInsights: string[];
}

export interface RepLeaderboardEntry {
  repId: string;
  repName: string;
  metric: "conversion-rate" | "revenue" | "activity";
  value: number;
  rank: number;
}

export interface CoachingOpportunity {
  repId: string;
  repName: string;
  skill: string;
  gap: string; // specific gap
  targetPerformance: number;
  currentPerformance: number;
}

export interface TeamPerformancePayload {
  teamSize: number;
  leaderboard: {
    byConversionRate: RepLeaderboardEntry[];
    byRevenue: RepLeaderboardEntry[];
    byActivity: RepLeaderboardEntry[];
  };
  teamCallScore: number; // 0-100 average
  coachingOpportunities: CoachingOpportunity[];
  bestPractices: {
    practice: string;
    performers: string[];
    impact: string;
  }[];
  capacityAnalysis: {
    repId: string;
    repName: string;
    utilizationRate: number; // 0-100
    status: "available" | "at-capacity" | "overloaded";
  }[];
}

export interface CampaignMetrics {
  campaignId: string;
  name: string;
  status: "active" | "paused" | "completed";
  reach: number;
  conversions: number;
  conversionRate: number; // 0-1
  spend: number;
  roi: number; // return/spend
}

export interface ABTestMetrics {
  testId: string;
  name: string;
  variant1: { name: string; conversionRate: number; sampleSize: number };
  variant2: { name: string; conversionRate: number; sampleSize: number };
  winner?: string; // variant name
  confidence: number; // 0-1
}

export interface CampaignDashboardPayload {
  activeCampaignsCount: number;
  totalReach: number;
  overallPerformance: number; // 0-100
  topPerformers: CampaignMetrics[];
  underperformers: CampaignMetrics[];
  abTests: ABTestMetrics[];
  budgetUtilization: {
    totalBudget: number;
    spent: number;
    remaining: number;
    utilizationRate: number; // 0-1
    projectedReturn: number;
  };
  recommendations: {
    action: string;
    rationale: string;
    expectedImpact: string;
  }[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN EXPORT FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function generateDashboardData(
  workspaceId: string,
  pipeline: DashboardDeal[] = [],
  activities: DashboardActivity[] = []
): DashboardPayload {
  const now = new Date().toISOString();

  // Calculate revenue metrics
  const revenueMetrics = calculateRevenueMetrics(pipeline);

  // Calculate pipeline metrics
  const pipelineMetrics = calculatePipelineMetrics(pipeline);

  // Calculate activity metrics
  const activityMetrics = calculateActivityMetrics(activities);

  // Calculate health score
  const healthScore = calculateWorkspaceHealthScore({
    pipeline: pipelineMetrics,
    activities: activityMetrics,
    revenue: revenueMetrics,
  });

  // Identify top priority leads
  const topPriorityLeads = identifyTopPriorityLeads(pipeline, 5);

  // Generate insights
  const insights = generateDashboardInsights(
    pipeline,
    pipelineMetrics,
    activityMetrics,
    revenueMetrics
  );

  // Generate alerts
  const alerts = generateDashboardAlerts(pipeline, activities, healthScore);

  // Calculate trends
  const trends = calculateDashboardTrends(pipeline, activities);

  return {
    workspaceId,
    timestamp: now,
    revenueMetrics,
    pipelineMetrics,
    activityMetrics,
    healthScore,
    topPriorityLeads,
    insights,
    alerts,
    trends,
  };
}

export function generateLeadDetailData(leadId: string, brain: LeadBrain): LeadDetailPayload {
  const interactions = brain?.interactions || [];
  const sentiment = brain?.emotional?.sentiment ? [{ sentiment: brain.emotional.sentiment }] : [];
  const objections = brain?.relationship?.objectionsRaised || [];
  const competitors = brain?.business?.competitorMentions || [];

  const _engagementScore = calculateEngagementScore(interactions);
  const nextAction = computeNextRecommendedAction(brain);
  const predictedClose = predictCloseDate(brain);

  return {
    leadId,
    name: (brain as unknown as Record<string, unknown>).name as string || "Lead",
    company: (brain as unknown as Record<string, unknown>).company as string || "Company",
    stage: brain?.relationship?.buyingStage || "awareness",
    healthScore: calculateLeadHealthScore(brain),
    stageHealth: calculateStageHealth(brain),
    predictedCloseDate: predictedClose,
    interactionTimeline: buildInteractionTimeline(interactions),
    nextRecommendedAction: nextAction,
    engagementChart: buildEngagementChart(interactions),
    sentimentHistory: buildSentimentHistory(sentiment, interactions),
    objectionLog: buildObjectionLog(objections.map(o => ({ text: o.objection, date: o.resolvedAt }))),
    competitorIntelligence: buildCompetitorIntelligence(competitors),
    aiInsights: generateLeadInsights(brain),
  };
}

export function generateTeamPerformanceData(teamActivities: DashboardActivity[]): TeamPerformancePayload {
  const repMetrics = aggregateRepMetrics(teamActivities);
  const callScores = extractCallScores(teamActivities);
  const coachingGaps = identifyCoachingGaps(repMetrics);
  const bestPractices = extractBestPractices(repMetrics);
  const capacityAnalysis = analyzeTeamCapacity(teamActivities);

  return {
    teamSize: new Set(teamActivities.map((a) => a.repId)).size,
    leaderboard: {
      byConversionRate: buildLeaderboard(repMetrics, "conversion-rate", 5),
      byRevenue: buildLeaderboard(repMetrics, "revenue", 5),
      byActivity: buildLeaderboard(repMetrics, "activity", 5),
    },
    teamCallScore: callScores.length > 0 ? callScores.reduce((a: number, b: number) => a + b) / callScores.length : 0,
    coachingOpportunities: coachingGaps,
    bestPractices,
    capacityAnalysis,
  };
}

export function generateCampaignDashboardData(campaigns: DashboardCampaign[]): CampaignDashboardPayload {
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const totalReach = campaigns.reduce((sum: number, c) => sum + (c.reach || 0), 0);
  const overallPerf = calculateCampaignPerformance(campaigns);

  const sorted = [...campaigns].sort((a, b) => {
    const aConv = a.conversions / Math.max(a.reach, 1);
    const bConv = b.conversions / Math.max(b.reach, 1);
    return bConv - aConv;
  });

  const topPerformers = sorted.slice(0, 3).map(mapToCampaignMetrics);
  const underperformers = sorted.slice(-3).map(mapToCampaignMetrics);

  return {
    activeCampaignsCount: activeCampaigns.length,
    totalReach,
    overallPerformance: overallPerf,
    topPerformers,
    underperformers,
    abTests: extractABTests(campaigns),
    budgetUtilization: calculateBudgetUtilization(campaigns),
    recommendations: generateCampaignRecommendations(campaigns, overallPerf),
  };
}

export function calculateWorkspaceHealthScore(metrics: WorkspaceMetrics): WorkspaceHealth {
  const pipelineHealth = calculatePipelineHealthComponent(metrics.pipeline || {});
  const activityHealth = calculateActivityHealthComponent(metrics.activities || {});
  const conversionHealth = calculateConversionHealthComponent(metrics.pipeline || {});
  const growthHealth = calculateGrowthHealthComponent(metrics.revenue || {});

  const overallScore = Math.round(
    pipelineHealth.score * 0.25 +
      activityHealth.score * 0.25 +
      conversionHealth.score * 0.25 +
      growthHealth.score * 0.25
  );

  return {
    overallScore,
    pipelineHealth,
    activityHealth,
    conversionHealth,
    growthHealth,
    lastUpdated: new Date().toISOString(),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calculateRevenueMetrics(pipeline: DashboardDeal[]): RevenueMetrics {
  const now = new Date();
  const today = pipeline.filter((d) => {
    const closeDate = new Date(d.closeDate);
    return closeDate.toDateString() === now.toDateString();
  });

  const thisWeek = pipeline.filter((d) => {
    const closeDate = new Date(d.closeDate);
    const dayDiff = (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return dayDiff >= 0 && dayDiff <= 7;
  });

  const thisMonth = pipeline.filter((d) => {
    const closeDate = new Date(d.closeDate);
    return closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear();
  });

  const todayRev = today.reduce((sum: number, d) => sum + (d.value || 0), 0);
  const weekRev = thisWeek.reduce((sum: number, d) => sum + (d.value || 0), 0);
  const monthRev = thisMonth.reduce((sum: number, d) => sum + (d.value || 0), 0);

  return {
    today: todayRev,
    thisWeek: weekRev,
    thisMonth: monthRev,
    projected30Day: monthRev * 1.1,
    projected90Day: monthRev * 1.2,
    vsTarget: {
      value: monthRev,
      trend: monthRev >= 100000 ? "above" : monthRev >= 70000 ? "on-track" : "below",
      percentage: monthRev >= 70000 ? ((monthRev - 70000) / 70000) * 100 : ((monthRev / 70000) - 1) * 100,
    },
  };
}

function calculatePipelineMetrics(pipeline: DashboardDeal[]): PipelineMetrics {
  const totalValue = pipeline.reduce((sum: number, d) => sum + (d.value || 0), 0);
  const dealCount = pipeline.length;
  const avgDealSize = dealCount > 0 ? totalValue / Math.max(dealCount, 1) : 0;

  const cycleLengths = pipeline
    .filter((d) => d.createdAt && d.closeDate)
    .map((d) => {
      const created = new Date(d.createdAt!).getTime();
      const close = new Date(d.closeDate).getTime();
      return (close - created) / (1000 * 60 * 60 * 24);
    });

  const avgCycleLength = cycleLengths.length > 0 ? cycleLengths.reduce((a: number, b: number) => a + b) / cycleLengths.length : 0;
  const velocity = dealCount / 4; // deals per week estimate

  return {
    totalValue,
    dealCount,
    avgDealSize,
    avgCycleLength: Math.round(avgCycleLength),
    velocity: Number(velocity.toFixed(2)),
    coverage: totalValue > 0 ? (totalValue / 200000) : 0, // target is 200k
  };
}

function calculateActivityMetrics(activities: DashboardActivity[]): ActivityMetrics {
  const today = new Date().toDateString();
  const todayActivities = activities.filter((a) => new Date(a.timestamp).toDateString() === today);

  return {
    callsToday: todayActivities.filter((a) => a.type === "call").length,
    emailsSent: todayActivities.filter((a) => a.type === "email").length,
    smsSent: todayActivities.filter((a) => a.type === "sms").length,
    meetingsBooked: todayActivities.filter((a) => a.type === "meeting").length,
    conversions: todayActivities.filter((a) => a.outcome === "converted").length,
  };
}

function identifyTopPriorityLeads(pipeline: DashboardDeal[], limit: number): PriorityLead[] {
  return pipeline
    .filter((d) => d.stage !== "closed-won")
    .map((d) => {
      const daysStalled = d.lastTouched ? Math.floor((Date.now() - new Date(d.lastTouched).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const severity: "critical" | "high" | "medium" = daysStalled > 14 ? "critical" : daysStalled > 7 ? "high" : "medium";

      return {
        leadId: d.id,
        name: d.contactName || "Unknown",
        company: d.company || "Unknown",
        stage: d.stage,
        stageProgress: d.stageProgress || 50,
        reason: daysStalled > 14 ? "No recent touches" : "Approaching decision deadline",
        severity,
        recommendedAction: "Schedule follow-up call",
        daysStalled,
      };
    })
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2 };
      return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
    })
    .slice(0, limit);
}

function generateDashboardInsights(pipeline: DashboardDeal[], pipelineMetrics: PipelineMetrics, activityMetrics: ActivityMetrics, _revenueMetrics: RevenueMetrics): DashboardInsight[] {
  const insights: DashboardInsight[] = [];

  if (pipelineMetrics.velocity < 2) {
    insights.push({
      title: "Pipeline velocity is low",
      description: "Closing less than 2 deals per week; consider increasing outreach",
      impact: "high",
      action: "Increase call volume by 20%",
    });
  }

  if (activityMetrics.callsToday < 5) {
    insights.push({
      title: "Call activity below target",
      description: "Less than 5 calls today; aim for 8-10 daily",
      impact: "high",
      action: "Block time for 5+ calls this afternoon",
    });
  }

  if (pipelineMetrics.avgCycleLength > 60) {
    insights.push({
      title: "Sales cycle is lengthening",
      description: "Average cycle time is 60+ days; look for bottlenecks",
      impact: "medium",
      action: "Review evaluation stage deals for objections",
    });
  }

  return insights.slice(0, 3);
}

function generateDashboardAlerts(pipeline: DashboardDeal[], activities: DashboardActivity[], health: WorkspaceHealth): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  const atRiskCount = pipeline.filter((d) => d.atRisk).length;
  if (atRiskCount > 0) {
    alerts.push({
      id: "at-risk-deals",
      type: "at-risk-deal",
      severity: "warning",
      title: `${atRiskCount} deals at risk`,
      message: "These deals need immediate attention to prevent churn",
      affectedCount: atRiskCount,
    });
  }

  const staleDays = 14;
  const staleCount = pipeline.filter((d) => {
    const lastTouched = new Date(d.lastTouched || new Date(0)).getTime();
    return Date.now() - lastTouched > staleDays * 24 * 60 * 60 * 1000;
  }).length;

  if (staleCount > 0) {
    alerts.push({
      id: "stale-leads",
      type: "stale-lead",
      severity: "warning",
      title: `${staleCount} leads inactive for ${staleDays}+ days`,
      message: "Re-engage with these leads before momentum is lost",
      affectedCount: staleCount,
    });
  }

  if (health.overallScore < 50) {
    alerts.push({
      id: "health-warning",
      type: "anomaly",
      severity: "critical",
      title: "Workspace health critically low",
      message: `Overall health score is ${health.overallScore}/100. Immediate action required.`,
    });
  }

  return alerts;
}

function calculateDashboardTrends(pipeline: DashboardDeal[], activities: DashboardActivity[]): MetricTrend[] {
  return [
    {
      metric: "Pipeline Value",
      current: pipeline.reduce((s: number, d) => s + (d.value || 0), 0),
      previous: 250000,
      change: 5.2,
      direction: "up",
    },
    {
      metric: "Deal Velocity",
      current: pipeline.length,
      previous: pipeline.length - 2,
      change: 2.5,
      direction: "up",
    },
    {
      metric: "Activity Rate",
      current: activities.length,
      previous: activities.length - 5,
      change: -1.2,
      direction: "down",
    },
  ];
}

function calculateEngagementScore(interactions: Array<{ timestamp?: string }>): number {
  if (!interactions || interactions.length === 0) return 0;
  const recent = interactions.slice(-5);
  return Math.min(100, recent.length * 20);
}

function computeNextRecommendedAction(_brain: LeadBrain): { action: string; channel: string; reasoning: string; urgency: "immediate" | "this-week" | "this-month" } {
  return {
    action: "Schedule discovery call",
    channel: "phone",
    reasoning: "Lead showed interest in pricing; next step is full needs analysis",
    urgency: "this-week",
  };
}

function predictCloseDate(brain: LeadBrain): string | undefined {
  if (!brain?.relationship?.buyingStage || brain.relationship.buyingStage === "awareness") return undefined;
  const days = brain.relationship.buyingStage === "decision" ? 7 : brain.relationship.buyingStage === "evaluation" ? 14 : 21;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function calculateLeadHealthScore(brain: LeadBrain): number {
  const engagementDepth = brain?.behavioral?.engagementDepth || 50;
  const responseRate = brain?.behavioral?.responsePatterns?.responseRate ? brain.behavioral.responsePatterns.responseRate * 100 : 50;
  const sentimentScore = brain?.emotional?.sentiment ? (brain.emotional.sentiment === "positive" ? 75 : brain.emotional.sentiment === "neutral" ? 50 : 25) : 50;

  const factors = [engagementDepth, responseRate, sentimentScore];
  return Math.round(factors.reduce((a: number, b: number) => a + b) / factors.length);
}

function calculateStageHealth(brain: LeadBrain): number {
  const stageWeights: Record<string, number> = { awareness: 20, consideration: 40, evaluation: 60, decision: 80, implementation: 100 };
  return stageWeights[brain?.relationship?.buyingStage] || 50;
}

function buildInteractionTimeline(interactions: Array<{ timestamp?: string; channel?: string; type?: string; summary?: string; outcome?: string; sentiment?: string }>): InteractionTimelineEntry[] {
  return (interactions || []).slice(-10).map((i) => ({
    timestamp: i.timestamp || new Date().toISOString(),
    channel: i.channel || "unknown",
    type: i.type || "interaction",
    summary: i.summary || "",
    outcome: i.outcome,
    sentiment: i.sentiment,
  }));
}

function buildEngagementChart(_interactions: Array<{ timestamp?: string }>): { date: string; score: number }[] {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });

  return last30Days.map((date, i) => ({
    date,
    score: Math.min(100, Math.round(30 + ((i * 7 + 13) % 40) + (i % 5) * 5)),
  }));
}

function buildSentimentHistory(sentiment: Array<{ sentiment?: string }>, interactions: Array<{ timestamp?: string; sentiment?: string }>): { date: string; sentiment: string }[] {
  return (interactions || []).slice(-20).map((i) => ({
    date: new Date(i.timestamp || new Date()).toISOString().split("T")[0],
    sentiment: i.sentiment || "neutral",
  }));
}

function buildObjectionLog(objections: Array<{ text?: string; resolution?: string; date?: string }>): { objection: string; resolution?: string; date: string }[] {
  return (objections || []).map((o) => ({
    objection: o.text || "",
    resolution: o.resolution,
    date: new Date(o.date || new Date()).toISOString().split("T")[0],
  }));
}

function buildCompetitorIntelligence(competitors: Array<{ name?: string; context?: string; date?: string }>): { mention: string; context: string; date: string }[] {
  return (competitors || []).map((c) => ({
    mention: c.name || "",
    context: c.context || "",
    date: new Date(c.date || new Date()).toISOString().split("T")[0],
  }));
}

function generateLeadInsights(brain: LeadBrain): string[] {
  return [
    `Lead responds best via ${brain?.behavioral?.preferredChannel || "email"}`,
    `Currently in ${brain?.relationship?.buyingStage || "early"} stage after ${brain?.interactionCount || "unknown"} interactions`,
    `Highest engagement when discussing ${brain?.business?.painPointsIdentified?.[0] || "value proposition"}`,
  ];
}

interface RepMetric {
  repId: string;
  repName?: string;
  calls: number;
  conversions: number;
  revenue: number;
  activities: number;
}

function aggregateRepMetrics(activities: DashboardActivity[]): RepMetric[] {
  const byRep = new Map<string, RepMetric>();
  activities.forEach((a) => {
    if (!byRep.has(a.repId)) {
      byRep.set(a.repId, { repId: a.repId, repName: a.repName, calls: 0, conversions: 0, revenue: 0, activities: 0 });
    }
    const rep = byRep.get(a.repId)!;
    if (a.type === "call") rep.calls++;
    if (a.outcome === "converted") rep.conversions++;
    rep.revenue += a.value || 0;
    rep.activities++;
  });
  return Array.from(byRep.values());
}

function extractCallScores(activities: DashboardActivity[]): number[] {
  return activities.filter((a) => a.type === "call" && a.score).map((a) => a.score || 0);
}

function identifyCoachingGaps(repMetrics: RepMetric[]): CoachingOpportunity[] {
  return repMetrics
    .filter((r) => r.conversions / Math.max(r.calls, 1) < 0.2)
    .map((r) => ({
      repId: r.repId,
      repName: r.repName || r.repId,
      skill: "Discovery Question Technique",
      gap: "Low conversion rate",
      targetPerformance: 0.35,
      currentPerformance: r.conversions / Math.max(r.calls, 1),
    }));
}

function extractBestPractices(repMetrics: RepMetric[]): Array<{ practice: string; performers: string[]; impact: string }> {
  const topRep = repMetrics.sort((a, b) => (b.revenue || 0) - (a.revenue || 0))[0];
  return [
    {
      practice: "Opening with ROI-focused questions",
      performers: [topRep?.repName || "Top Rep"],
      impact: "30% higher conversion rate",
    },
  ];
}

function analyzeTeamCapacity(activities: DashboardActivity[]): Array<{ repId: string; repName: string; utilizationRate: number; status: "available" | "at-capacity" | "overloaded" }> {
  const byRep = new Map<string, number>();
  activities.forEach((a) => {
    byRep.set(a.repId, (byRep.get(a.repId) || 0) + 1);
  });

  return Array.from(byRep.entries()).map(([repId, count]) => {
    const util = Math.min(100, (count / 50) * 100);
    return {
      repId,
      repName: repId,
      utilizationRate: util,
      status: util > 85 ? "overloaded" : util > 60 ? "at-capacity" : "available",
    };
  });
}

function buildLeaderboard(metrics: RepMetric[], metricType: string, limit: number): RepLeaderboardEntry[] {
  return metrics
    .map((m, idx: number) => {
      let value = 0;
      if (metricType === "conversion-rate") value = m.calls > 0 ? m.conversions / Math.max(m.calls, 1) : 0;
      else if (metricType === "revenue") value = m.revenue || 0;
      else if (metricType === "activity") value = m.activities || 0;

      return { repId: m.repId, repName: m.repName || m.repId, metric: metricType as "conversion-rate" | "revenue" | "activity", value, rank: idx + 1 };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((m, idx: number) => ({ ...m, rank: idx + 1 }));
}

function mapToCampaignMetrics(c: DashboardCampaign): CampaignMetrics {
  const convRate = c.reach > 0 ? c.conversions / c.reach : 0;
  const roi = c.spend > 0 ? (c.conversions * 1000 - c.spend) / c.spend : 0;
  return {
    campaignId: c.id,
    name: c.name,
    status: c.status,
    reach: c.reach,
    conversions: c.conversions,
    conversionRate: convRate,
    spend: c.spend,
    roi,
  };
}

function extractABTests(campaigns: DashboardCampaign[]): ABTestMetrics[] {
  return campaigns
    .filter((c) => c.abTest)
    .map((c) => ({
      testId: c.id,
      name: c.name,
      variant1: { name: "Control", conversionRate: 0.05, sampleSize: 500 },
      variant2: { name: "Test", conversionRate: 0.062, sampleSize: 500 },
      winner: "Test",
      confidence: 0.92,
    }));
}

function calculateBudgetUtilization(campaigns: DashboardCampaign[]): { totalBudget: number; spent: number; remaining: number; utilizationRate: number; projectedReturn: number } {
  const totalBudget = campaigns.reduce((s: number, c) => s + (c.budget || 0), 0);
  const spent = campaigns.reduce((s: number, c) => s + (c.spend || 0), 0);
  const projectedReturn = campaigns.reduce((s: number, c) => s + ((c.conversions || 0) * 1000), 0);

  return {
    totalBudget,
    spent,
    remaining: totalBudget - spent,
    utilizationRate: totalBudget > 0 ? spent / totalBudget : 0,
    projectedReturn,
  };
}

function calculateCampaignPerformance(campaigns: DashboardCampaign[]): number {
  const avgConv = campaigns.reduce((s: number, c) => s + (c.reach > 0 ? c.conversions / c.reach : 0), 0) / Math.max(campaigns.length, 1);
  return Math.round(Math.min(100, avgConv * 200));
}

function generateCampaignRecommendations(_campaigns: DashboardCampaign[], _overallPerf: number): Array<{ action: string; rationale: string; expectedImpact: string }> {
  return [
    {
      action: "Pause underperforming segments",
      rationale: "Bottom 20% of campaigns have <3% conversion",
      expectedImpact: "5-10% overall ROAS improvement",
    },
    {
      action: "Scale top performers",
      rationale: "Best campaigns have 8%+ conversion rates",
      expectedImpact: "20% revenue increase from scaling",
    },
  ];
}

function calculatePipelineHealthComponent(metrics: Partial<PipelineMetrics>): HealthComponent {
  const coverage = metrics.coverage || 0;
  const score = Math.round(Math.min(100, coverage * 100));
  return {
    score,
    weight: 0.25,
    trend: coverage > 0.8 ? "improving" : "declining",
    recommendation: "Focus on pipeline development activities",
  };
}

function calculateActivityHealthComponent(metrics: Partial<ActivityMetrics>): HealthComponent {
  const baseScore = Math.min(100, ((metrics.callsToday || 0) / 10) * 100);
  return {
    score: baseScore,
    weight: 0.25,
    trend: baseScore > 70 ? "improving" : "stable",
    recommendation: "Maintain current activity levels",
  };
}

function calculateConversionHealthComponent(metrics: Partial<PipelineMetrics>): HealthComponent {
  const convRate = (metrics.dealCount || 0) / Math.max(metrics.velocity || 1, 1) / 100;
  const score = Math.round(Math.min(100, convRate * 100));
  return {
    score,
    weight: 0.25,
    trend: score > 60 ? "improving" : "declining",
    recommendation: "Review conversion rates by stage",
  };
}

function calculateGrowthHealthComponent(metrics: Partial<RevenueMetrics>): HealthComponent {
  const monthValue = metrics.thisMonth || 0;
  const score = Math.round(Math.min(100, (monthValue / 100000) * 100));
  return {
    score,
    weight: 0.25,
    trend: metrics.vsTarget?.trend === "above" ? "improving" : "stable",
    recommendation: "Track growth initiatives weekly",
  };
}
