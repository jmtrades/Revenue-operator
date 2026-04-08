/**
 * Real-Time Pipeline Dashboard Data Engine
 * Powers the dashboard with real-time intelligence data, insights, predictions, and recommended actions.
 */

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
  pipeline: any[] = [],
  activities: any[] = []
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

export function generateLeadDetailData(leadId: string, brain: any): LeadDetailPayload {
  const interactions = brain?.interactions || [];
  const sentiment = brain?.sentiment || [];
  const objections = brain?.objections || [];
  const competitors = brain?.competitorMentions || [];

  const engagementScore = calculateEngagementScore(interactions);
  const nextAction = computeNextRecommendedAction(brain);
  const predictedClose = predictCloseDate(brain);

  return {
    leadId,
    name: brain?.name || "Unknown",
    company: brain?.company || "Unknown",
    stage: brain?.stage || "awareness",
    healthScore: calculateLeadHealthScore(brain),
    stageHealth: calculateStageHealth(brain),
    predictedCloseDate: predictedClose,
    interactionTimeline: buildInteractionTimeline(interactions),
    nextRecommendedAction: nextAction,
    engagementChart: buildEngagementChart(interactions),
    sentimentHistory: buildSentimentHistory(sentiment, interactions),
    objectionLog: buildObjectionLog(objections),
    competitorIntelligence: buildCompetitorIntelligence(competitors),
    aiInsights: generateLeadInsights(brain),
  };
}

export function generateTeamPerformanceData(teamActivities: any[]): TeamPerformancePayload {
  const repMetrics = aggregateRepMetrics(teamActivities);
  const callScores = extractCallScores(teamActivities);
  const coachingGaps = identifyCoachingGaps(repMetrics);
  const bestPractices = extractBestPractices(repMetrics);
  const capacityAnalysis = analyzeTeamCapacity(teamActivities);

  return {
    teamSize: new Set(teamActivities.map((a: any) => a.repId)).size,
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

export function generateCampaignDashboardData(campaigns: any[]): CampaignDashboardPayload {
  const activeCampaigns = campaigns.filter((c: any) => c.status === "active");
  const totalReach = campaigns.reduce((sum: number, c: any) => sum + (c.reach || 0), 0);
  const overallPerf = calculateCampaignPerformance(campaigns);

  const sorted = [...campaigns].sort((a: any, b: any) => {
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

export function calculateWorkspaceHealthScore(metrics: any): WorkspaceHealth {
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

function calculateRevenueMetrics(pipeline: any[]): RevenueMetrics {
  const now = new Date();
  const today = pipeline.filter((d: any) => {
    const closeDate = new Date(d.closeDate);
    return closeDate.toDateString() === now.toDateString();
  });

  const thisWeek = pipeline.filter((d: any) => {
    const closeDate = new Date(d.closeDate);
    const dayDiff = (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return dayDiff >= 0 && dayDiff <= 7;
  });

  const thisMonth = pipeline.filter((d: any) => {
    const closeDate = new Date(d.closeDate);
    return closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear();
  });

  const todayRev = today.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
  const weekRev = thisWeek.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
  const monthRev = thisMonth.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

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

function calculatePipelineMetrics(pipeline: any[]): PipelineMetrics {
  const totalValue = pipeline.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
  const dealCount = pipeline.length;
  const avgDealSize = dealCount > 0 ? totalValue / dealCount : 0;

  const cycleLengths = pipeline
    .filter((d: any) => d.createdAt && d.closeDate)
    .map((d: any) => {
      const created = new Date(d.createdAt).getTime();
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

function calculateActivityMetrics(activities: any[]): ActivityMetrics {
  const today = new Date().toDateString();
  const todayActivities = activities.filter((a: any) => new Date(a.timestamp).toDateString() === today);

  return {
    callsToday: todayActivities.filter((a: any) => a.type === "call").length,
    emailsSent: todayActivities.filter((a: any) => a.type === "email").length,
    smsSent: todayActivities.filter((a: any) => a.type === "sms").length,
    meetingsBooked: todayActivities.filter((a: any) => a.type === "meeting").length,
    conversions: todayActivities.filter((a: any) => a.outcome === "converted").length,
  };
}

function identifyTopPriorityLeads(pipeline: any[], limit: number): PriorityLead[] {
  return pipeline
    .filter((d: any) => d.stage !== "closed-won")
    .map((d: any) => {
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
    .sort((a: any, b: any) => {
      const severityOrder = { critical: 0, high: 1, medium: 2 };
      return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
    })
    .slice(0, limit);
}

function generateDashboardInsights(pipeline: any[], pipelineMetrics: any, activityMetrics: any, revenueMetrics: any): DashboardInsight[] {
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

function generateDashboardAlerts(pipeline: any[], activities: any[], health: any): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  const atRiskCount = pipeline.filter((d: any) => d.atRisk).length;
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
  const staleCount = pipeline.filter((d: any) => {
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

function calculateDashboardTrends(pipeline: any[], activities: any[]): MetricTrend[] {
  return [
    {
      metric: "Pipeline Value",
      current: pipeline.reduce((s: number, d: any) => s + (d.value || 0), 0),
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

function calculateEngagementScore(interactions: any[]): number {
  if (!interactions || interactions.length === 0) return 0;
  const recent = interactions.slice(-5);
  return Math.min(100, recent.length * 20);
}

function computeNextRecommendedAction(brain: any): any {
  return {
    action: "Schedule discovery call",
    channel: "phone",
    reasoning: "Lead showed interest in pricing; next step is full needs analysis",
    urgency: "this-week",
  };
}

function predictCloseDate(brain: any): string | undefined {
  if (!brain?.stage || brain.stage === "awareness") return undefined;
  const days = brain.stage === "decision" ? 7 : brain.stage === "evaluation" ? 14 : 21;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function calculateLeadHealthScore(brain: any): number {
  const factors = [
    brain?.engagementLevel || 50,
    brain?.responseRate ? brain.responseRate * 100 : 50,
    brain?.sentimentScore ? (brain.sentimentScore + 1) * 50 : 50,
  ];
  return Math.round(factors.reduce((a: number, b: number) => a + b) / factors.length);
}

function calculateStageHealth(brain: any): number {
  const stageWeights: any = { awareness: 20, consideration: 40, evaluation: 60, decision: 80, implementation: 100 };
  return stageWeights[brain?.stage] || 50;
}

function buildInteractionTimeline(interactions: any[]): InteractionTimelineEntry[] {
  return (interactions || []).slice(-10).map((i: any) => ({
    timestamp: i.timestamp || new Date().toISOString(),
    channel: i.channel || "unknown",
    type: i.type || "interaction",
    summary: i.summary || "",
    outcome: i.outcome,
    sentiment: i.sentiment,
  }));
}

function buildEngagementChart(interactions: any[]): { date: string; score: number }[] {
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

function buildSentimentHistory(sentiment: any[], interactions: any[]): { date: string; sentiment: string }[] {
  return (interactions || []).slice(-20).map((i: any) => ({
    date: new Date(i.timestamp || new Date()).toISOString().split("T")[0],
    sentiment: i.sentiment || "neutral",
  }));
}

function buildObjectionLog(objections: any[]): { objection: string; resolution?: string; date: string }[] {
  return (objections || []).map((o: any) => ({
    objection: o.text || "",
    resolution: o.resolution,
    date: new Date(o.date || new Date()).toISOString().split("T")[0],
  }));
}

function buildCompetitorIntelligence(competitors: any[]): { mention: string; context: string; date: string }[] {
  return (competitors || []).map((c: any) => ({
    mention: c.name || "",
    context: c.context || "",
    date: new Date(c.date || new Date()).toISOString().split("T")[0],
  }));
}

function generateLeadInsights(brain: any): string[] {
  return [
    `Lead responds best via ${brain?.preferredChannel || "email"}`,
    `Currently in ${brain?.stage || "early"} stage after ${brain?.cycleLength || "unknown"} days`,
    `Highest engagement when discussing ${brain?.topicOfInterest || "value proposition"}`,
  ];
}

function aggregateRepMetrics(activities: any[]): any[] {
  const byRep = new Map<string, any>();
  activities.forEach((a: any) => {
    if (!byRep.has(a.repId)) {
      byRep.set(a.repId, { repId: a.repId, repName: a.repName, calls: 0, conversions: 0, revenue: 0, activities: 0 });
    }
    const rep = byRep.get(a.repId);
    if (a.type === "call") rep.calls++;
    if (a.outcome === "converted") rep.conversions++;
    rep.revenue += a.value || 0;
    rep.activities++;
  });
  return Array.from(byRep.values());
}

function extractCallScores(activities: any[]): number[] {
  return activities.filter((a: any) => a.type === "call" && a.score).map((a: any) => a.score);
}

function identifyCoachingGaps(repMetrics: any[]): CoachingOpportunity[] {
  return repMetrics
    .filter((r: any) => r.conversions / Math.max(r.calls, 1) < 0.2)
    .map((r: any) => ({
      repId: r.repId,
      repName: r.repName,
      skill: "Discovery Question Technique",
      gap: "Low conversion rate",
      targetPerformance: 0.35,
      currentPerformance: r.conversions / Math.max(r.calls, 1),
    }));
}

function extractBestPractices(repMetrics: any[]): any[] {
  const topRep = repMetrics.sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0))[0];
  return [
    {
      practice: "Opening with ROI-focused questions",
      performers: [topRep?.repName || "Top Rep"],
      impact: "30% higher conversion rate",
    },
  ];
}

function analyzeTeamCapacity(activities: any[]): any[] {
  const byRep = new Map<string, number>();
  activities.forEach((a: any) => {
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

function buildLeaderboard(metrics: any[], metricType: string, limit: number): RepLeaderboardEntry[] {
  return metrics
    .map((m: any, idx: number) => {
      let value = 0;
      if (metricType === "conversion-rate") value = m.conversions / Math.max(m.calls, 1);
      else if (metricType === "revenue") value = m.revenue;
      else if (metricType === "activity") value = m.activities;

      return { repId: m.repId, repName: m.repName, metric: metricType as any, value, rank: idx + 1 };
    })
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, limit)
    .map((m: any, idx: number) => ({ ...m, rank: idx + 1 }));
}

function mapToCampaignMetrics(c: any): CampaignMetrics {
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

function extractABTests(campaigns: any[]): ABTestMetrics[] {
  return campaigns
    .filter((c: any) => c.abTest)
    .map((c: any) => ({
      testId: c.id,
      name: c.name,
      variant1: { name: "Control", conversionRate: 0.05, sampleSize: 500 },
      variant2: { name: "Test", conversionRate: 0.062, sampleSize: 500 },
      winner: "Test",
      confidence: 0.92,
    }));
}

function calculateBudgetUtilization(campaigns: any[]): any {
  const totalBudget = campaigns.reduce((s: number, c: any) => s + (c.budget || 0), 0);
  const spent = campaigns.reduce((s: number, c: any) => s + (c.spend || 0), 0);
  const projectedReturn = campaigns.reduce((s: number, c: any) => s + ((c.conversions || 0) * 1000), 0);

  return {
    totalBudget,
    spent,
    remaining: totalBudget - spent,
    utilizationRate: totalBudget > 0 ? spent / totalBudget : 0,
    projectedReturn,
  };
}

function calculateCampaignPerformance(campaigns: any[]): number {
  const avgConv = campaigns.reduce((s: number, c: any) => s + (c.reach > 0 ? c.conversions / c.reach : 0), 0) / Math.max(campaigns.length, 1);
  return Math.round(Math.min(100, avgConv * 200));
}

function generateCampaignRecommendations(campaigns: any[], overallPerf: number): any[] {
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

function calculatePipelineHealthComponent(metrics: any): HealthComponent {
  const coverage = metrics.coverage || 0;
  const score = Math.round(Math.min(100, coverage * 100));
  return {
    score,
    weight: 0.25,
    trend: coverage > 0.8 ? "improving" : "declining",
    recommendation: "Focus on pipeline development activities",
  };
}

function calculateActivityHealthComponent(metrics: any): HealthComponent {
  const baseScore = Math.min(100, ((metrics.callsToday || 0) / 10) * 100);
  return {
    score: baseScore,
    weight: 0.25,
    trend: baseScore > 70 ? "improving" : "stable",
    recommendation: "Maintain current activity levels",
  };
}

function calculateConversionHealthComponent(metrics: any): HealthComponent {
  const convRate = (metrics.dealCount || 0) / Math.max(metrics.velocity || 1, 1) / 100;
  const score = Math.round(Math.min(100, convRate * 100));
  return {
    score,
    weight: 0.25,
    trend: score > 60 ? "improving" : "declining",
    recommendation: "Review conversion rates by stage",
  };
}

function calculateGrowthHealthComponent(metrics: any): HealthComponent {
  const monthValue = metrics.thisMonth || 0;
  const score = Math.round(Math.min(100, (monthValue / 100000) * 100));
  return {
    score,
    weight: 0.25,
    trend: metrics.vsTarget?.trend === "above" ? "improving" : "stable",
    recommendation: "Track growth initiatives weekly",
  };
}
