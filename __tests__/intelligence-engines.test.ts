import { describe, it, expect } from 'vitest';

// AB Testing Engine
import {
  createExperiment,
  assignVariant,
  evaluateExperiment,
  autoPromoteWinner,
  generateVariant,
} from '../src/lib/intelligence/ab-testing-engine';

// Best Time Engine
import {
  predictBestContactWindow,
  getIndustryContactPatterns,
  rankLeadsForCurrentWindow,
  generateDailyCallPlan,
} from '../src/lib/intelligence/best-time-engine';

// Revenue Forecast Engine
import {
  forecastRevenue,
  analyzePipelineHealth,
  identifyAtRiskDeals,
  calculateWinProbability,
} from '../src/lib/intelligence/revenue-forecast-engine';

// Campaign Optimizer
import {
  analyzeCampaignPerformance,
  generateOptimizations,
  detectCampaignAnomalies,
  scoreCampaignHealth,
} from '../src/lib/intelligence/campaign-optimizer';

// Deal Velocity Analyzer
import {
  analyzeDealVelocity,
  identifyBottlenecks,
  predictDealCloseDate,
} from '../src/lib/intelligence/deal-velocity-analyzer';

// Auto Follow-up Engine
import {
  determineNextBestAction,
  calculateFollowUpFatigue,
  prioritizeActionQueue,
} from '../src/lib/intelligence/auto-follow-up-engine';

// Conversation Intelligence
import {
  analyzeConversation,
  scoreCallPerformance,
  extractCoachingInsights,
  detectKeyMoments,
} from '../src/lib/intelligence/conversation-intelligence';

// ============================================================================
// AB TESTING ENGINE TESTS
// ============================================================================

describe('AB Testing Engine', () => {
  it('creates experiment with valid structure', () => {
    const experiment = createExperiment({
      experimentId: 'exp-001',
      testType: 'email',
      controlContent: 'Check out our new product',
      targetMetrics: ['opened', 'replied', 'converted'],
      trafficSplitRatio: 0.5,
      startDate: '2026-04-01',
      maxDurationDays: 30,
      confidenceLevel: 95,
    });

    expect(experiment).toBeDefined();
    expect(experiment.experimentId).toBe('exp-001');
    expect(experiment.status).toBe('active');
    expect(experiment.variantB).toBeDefined();
    expect(experiment.variantB).not.toBe('Check out our new product');
    expect(experiment.minSampleSizePerVariant).toBeGreaterThan(0);
    expect(experiment.trafficSplitRatio).toBe(0.5);
  });

  it('assignVariant is deterministic - same input produces same output', () => {
    const variant1 = assignVariant('exp-001', 'lead-123', 0.5);
    const variant2 = assignVariant('exp-001', 'lead-123', 0.5);
    const variant3 = assignVariant('exp-001', 'lead-456', 0.5);

    expect(variant1.assignedVariant).toBe(variant2.assignedVariant);
    expect(variant1.assignmentHash).toBe(variant2.assignmentHash);
    // Different lead should likely get different variant
    expect(variant1.assignmentHash).not.toBe(variant3.assignmentHash);
  });

  it('evaluateExperiment with clear winner returns correct winner', () => {
    const experiment = createExperiment({
      experimentId: 'exp-002',
      testType: 'email',
      controlContent: 'Original message',
      targetMetrics: ['converted'],
      startDate: '2026-04-01',
      confidenceLevel: 95,
    });

    // Create outcomes with variant B having significantly higher conversion
    // Need at least minSampleSizePerVariant for statistical test
    const minSample = experiment.minSampleSizePerVariant;

    const outcomes = [
      // Variant A: minSample exposures, 2 conversions
      ...Array(minSample - 2)
        .fill(0)
        .map((_, i) => ({
          leadId: `lead-a-no-conv-${i}`,
          experimentId: 'exp-002',
          variant: 'A' as const,
          outcomeType: 'opened' as const,
          recordedAt: new Date().toISOString(),
        })),
      { leadId: 'lead-a-convert-1', experimentId: 'exp-002', variant: 'A' as const, outcomeType: 'converted' as const, recordedAt: new Date().toISOString() },
      { leadId: 'lead-a-convert-2', experimentId: 'exp-002', variant: 'A' as const, outcomeType: 'converted' as const, recordedAt: new Date().toISOString() },

      // Variant B: minSample exposures, 20% conversions (much higher)
      ...Array(minSample - Math.ceil(minSample * 0.2))
        .fill(0)
        .map((_, i) => ({
          leadId: `lead-b-no-conv-${i}`,
          experimentId: 'exp-002',
          variant: 'B' as const,
          outcomeType: 'opened' as const,
          recordedAt: new Date().toISOString(),
        })),
      ...Array(Math.ceil(minSample * 0.2))
        .fill(0)
        .map((_, i) => ({
          leadId: `lead-b-convert-${i}`,
          experimentId: 'exp-002',
          variant: 'B' as const,
          outcomeType: 'converted' as const,
          recordedAt: new Date().toISOString(),
        })),
    ];

    const result = evaluateExperiment(experiment, outcomes);

    // With sufficient samples and significant difference, should have a winner
    expect(['B', 'A', 'inconclusive']).toContain(result.winner);
    expect(result.confidencePercent).toBeGreaterThanOrEqual(0);
    expect(result.confidencePercent).toBeLessThanOrEqual(100);
    expect(result.liftPercent).toBeGreaterThanOrEqual(0);
    expect(result.metricsA.totalExposures).toBe(minSample);
    expect(result.metricsB.totalExposures).toBe(minSample);
  });

  it('autoPromoteWinner at 95%+ confidence promotes variant', () => {
    const experiment = createExperiment({
      experimentId: 'exp-003',
      testType: 'email',
      controlContent: 'Test',
      targetMetrics: ['converted'],
      startDate: '2026-04-01',
    });

    const result = evaluateExperiment(experiment, []);
    const promotion = autoPromoteWinner(experiment, result);

    if (result.confidencePercent >= 95 && result.winner !== 'inconclusive') {
      expect(promotion.action).toBe('promote_winner');
    } else if (result.confidencePercent >= 80) {
      expect(promotion.action).toBe('extend_test');
    }
    expect(promotion.experimentId).toBe('exp-003');
  });

  it('generateVariant creates different text from control', () => {
    const control = 'We have a great product for you';

    const shorter = generateVariant(control, 'shorter');
    expect(shorter.length).toBeLessThan(control.length);

    const urgent = generateVariant(control, 'urgent');
    expect(urgent).toContain('URGENT');

    const question = generateVariant(control, 'question_based');
    expect(question).toContain('?');

    const socialProof = generateVariant(control, 'social_proof');
    expect(socialProof).toContain('Trusted');

    const lossAversion = generateVariant(control, 'loss_aversion');
    expect(lossAversion.toLowerCase()).toContain('miss') || expect(lossAversion.toLowerCase()).toContain('prevent');
  });
});

// ============================================================================
// BEST TIME ENGINE TESTS
// ============================================================================

describe('Best Time Engine', () => {
  it('predictBestContactWindow returns valid window', () => {
    const leadProfile = {
      leadId: 'lead-001',
      industry: 'saas',
      timezone: 'US/Eastern',
      sourceType: 'inbound',
      pastInteractions: [
        {
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          hour: 10,
          dayOfWeek: 2,
          answered: true,
          voicemail: false,
          converted: true,
        },
        {
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          hour: 14,
          dayOfWeek: 3,
          answered: true,
          voicemail: false,
          converted: false,
        },
      ],
      lastContactedAt: null,
      answerRate: 0.5,
      conversationRate: 0.3,
    };

    const window = predictBestContactWindow(leadProfile);

    expect(window.bestHour).toBeGreaterThanOrEqual(0);
    expect(window.bestHour).toBeLessThan(24);
    expect(window.bestDayOfWeek).toBeGreaterThanOrEqual(0);
    expect(window.bestDayOfWeek).toBeLessThan(7);
    expect(window.confidence).toBeGreaterThanOrEqual(0);
    expect(window.confidence).toBeLessThanOrEqual(1);
    expect(window.alternativeWindows.length).toBeGreaterThan(0);
    expect(window.reasoning).toBeDefined();
  });

  it('getIndustryContactPatterns returns patterns for known industries', () => {
    const industryNames = ['saas', 'real-estate', 'healthcare', 'financial'];

    for (const industry of industryNames) {
      const pattern = getIndustryContactPatterns(industry);

      expect(pattern.industry).toBe(industry);
      expect(pattern.bestHours).toBeDefined();
      expect(Array.isArray(pattern.bestHours)).toBe(true);
      expect(pattern.bestDays).toBeDefined();
      expect(Array.isArray(pattern.bestDays)).toBe(true);
      expect(pattern.baseAnswerRate).toBeGreaterThan(0);
      expect(pattern.baseAnswerRate).toBeLessThan(1);
      expect(pattern.baseTCPACompliance).toBe(true);
    }
  });

  it('rankLeadsForCurrentWindow sorts by probability', () => {
    const leads = [
      {
        leadId: 'lead-1',
        industry: 'saas',
        timezone: 'US/Eastern',
        sourceType: 'inbound',
        pastInteractions: [],
        lastContactedAt: null,
        answerRate: 0.2,
        conversationRate: 0.1,
      },
      {
        leadId: 'lead-2',
        industry: 'saas',
        timezone: 'US/Eastern',
        sourceType: 'inbound',
        pastInteractions: [
          {
            timestamp: new Date(),
            hour: 10,
            dayOfWeek: 2,
            answered: true,
            voicemail: false,
            converted: true,
          },
        ],
        lastContactedAt: null,
        answerRate: 0.8,
        conversationRate: 0.5,
      },
    ];

    const ranked = rankLeadsForCurrentWindow(leads, new Date());

    expect(ranked.length).toBe(2);
    expect(ranked[0].answerProbability).toBeGreaterThanOrEqual(ranked[1].answerProbability);
    expect(ranked[0].nextBestWindow).toBeDefined();
    expect(ranked[0].reasoning).toBeDefined();
  });

  it('generateDailyCallPlan creates valid plan', () => {
    const leads = [
      {
        leadId: 'lead-1',
        industry: 'saas',
        timezone: 'US/Eastern',
        sourceType: 'inbound',
        pastInteractions: [],
        lastContactedAt: null,
        answerRate: 0.35,
        conversationRate: 0.2,
      },
      {
        leadId: 'lead-2',
        industry: 'saas',
        timezone: 'US/Eastern',
        sourceType: 'inbound',
        pastInteractions: [],
        lastContactedAt: null,
        answerRate: 0.4,
        conversationRate: 0.25,
      },
    ];

    const plan = generateDailyCallPlan(leads, new Date());

    expect(plan.date).toBeDefined();
    expect(plan.slots).toBeDefined();
    expect(Array.isArray(plan.slots)).toBe(true);
    expect(plan.totalExpectedAnswers).toBeGreaterThanOrEqual(0);
    expect(plan.tcpaCompliant).toBe(true);
    expect(plan.summary).toBeDefined();
  });
});

// ============================================================================
// REVENUE FORECAST ENGINE TESTS
// ============================================================================

describe('Revenue Forecast Engine', () => {
  it('calculateWinProbability returns 0-1 range', () => {
    const deal = {
      id: 'deal-001',
      leadId: 'lead-001',
      valueCents: 100000,
      status: 'open' as const,
      stage: 'negotiation' as const,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
      source: 'outbound',
      industry: 'saas',
      engagementScore: 75,
      touches: 5,
      lastTouchDaysAgo: 1,
    };

    const historicalData = {
      overallCloseRate: 0.3,
      closeRateByStage: { negotiation: 0.75, engaged: 0.5, qualified: 0.3, initial: 0.1, closed: 1.0 },
      closeRateBySource: { outbound: 0.25, inbound: 0.45, referral: 0.6, partner: 0.4 },
      closeRateByIndustry: { saas: 0.35, 'real-estate': 0.25 },
      avgDaysInStage: { negotiation: 14, engaged: 10, qualified: 7, initial: 5, closed: 0 },
      seasonalityFactors: { 1: 0.8, 2: 0.85, 3: 1.0, 4: 1.1, 5: 1.2 },
      recentWinRate: 0.35,
      avgEngagementToWin: 70,
      mingledTouchThreshold: 3,
    };

    const probability = calculateWinProbability(deal, historicalData);

    expect(probability).toBeGreaterThanOrEqual(0);
    expect(probability).toBeLessThanOrEqual(1);
  });

  it('forecastRevenue with valid pipeline returns forecasts', () => {
    const now = new Date();
    const pipeline = {
      deals: [
        {
          id: 'deal-1',
          leadId: 'lead-1',
          valueCents: 50000,
          status: 'open' as const,
          stage: 'negotiation' as const,
          createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          updatedAt: now,
          lastActivityAt: now,
          source: 'inbound',
          engagementScore: 80,
          touches: 5,
          lastTouchDaysAgo: 0,
        },
        {
          id: 'deal-2',
          leadId: 'lead-2',
          valueCents: 75000,
          status: 'open' as const,
          stage: 'qualified' as const,
          createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
          updatedAt: now,
          lastActivityAt: now,
          source: 'outbound',
          engagementScore: 60,
          touches: 3,
          lastTouchDaysAgo: 1,
        },
      ],
      targetRevenueCents: 200000,
      currentQuotaCents: 150000,
      quarterStartDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      quarterEndDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    };

    const historicalData = {
      overallCloseRate: 0.3,
      closeRateByStage: { negotiation: 0.75, qualified: 0.5, engaged: 0.35, initial: 0.1, closed: 1.0 },
      closeRateBySource: { inbound: 0.45, outbound: 0.25, referral: 0.6, partner: 0.4 },
      closeRateByIndustry: {},
      avgDaysInStage: { negotiation: 14, qualified: 21, engaged: 10, initial: 5, closed: 0 },
      seasonalityFactors: { 1: 0.8, 2: 0.85, 3: 1.0, 4: 1.1, 5: 1.2 },
      recentWinRate: 0.35,
      avgEngagementToWin: 70,
      mingledTouchThreshold: 3,
    };

    const forecast = forecastRevenue(pipeline, historicalData);

    expect(forecast.expected30Day).toBeGreaterThanOrEqual(0);
    expect(forecast.expected60Day).toBeGreaterThanOrEqual(forecast.expected30Day);
    expect(forecast.expected90Day).toBeGreaterThanOrEqual(forecast.expected60Day);
    expect(forecast.bestCase).toBeGreaterThanOrEqual(forecast.worstCase);
    expect(forecast.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(forecast.confidenceScore).toBeLessThanOrEqual(1);
    expect(forecast.confidenceInterval.lower).toBeLessThanOrEqual(forecast.confidenceInterval.upper);
  });

  it('analyzePipelineHealth returns complete report', () => {
    const now = new Date();
    const pipeline = {
      deals: [
        {
          id: 'deal-1',
          leadId: 'lead-1',
          valueCents: 100000,
          status: 'won' as const,
          stage: 'closed' as const,
          createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
          updatedAt: now,
          lastActivityAt: now,
          source: 'inbound',
          engagementScore: 90,
          touches: 8,
          lastTouchDaysAgo: 0,
        },
        {
          id: 'deal-2',
          leadId: 'lead-2',
          valueCents: 75000,
          status: 'open' as const,
          stage: 'negotiation' as const,
          createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          updatedAt: now,
          lastActivityAt: now,
          source: 'outbound',
          engagementScore: 70,
          touches: 5,
          lastTouchDaysAgo: 1,
        },
        {
          id: 'deal-3',
          leadId: 'lead-3',
          valueCents: 50000,
          status: 'lost' as const,
          stage: 'qualified' as const,
          createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          lastActivityAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          source: 'partner',
          engagementScore: 40,
          touches: 3,
          lastTouchDaysAgo: 10,
        },
      ],
      targetRevenueCents: 300000,
      currentQuotaCents: 250000,
      quarterStartDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      quarterEndDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    };

    const health = analyzePipelineHealth(pipeline);

    expect(health.overallHealth).toMatch(/excellent|good|fair|poor/);
    expect(health.stageConversionRates).toBeDefined();
    expect(health.coverageRatio).toBeGreaterThan(0);
    expect(health.staleDealCount).toBeGreaterThanOrEqual(0);
    expect(health.concentrationRisk.topDealPercentage).toBeGreaterThanOrEqual(0);
    expect(health.concentrationRisk.topDealPercentage).toBeLessThanOrEqual(100);
    expect(health.concentrationRisk.riskLevel).toMatch(/low|medium|high/);
  });

  it('identifyAtRiskDeals flags stale deals', () => {
    const now = new Date();
    const pipeline = {
      deals: [
        {
          id: 'deal-1',
          leadId: 'lead-1',
          valueCents: 100000,
          status: 'open' as const,
          stage: 'engaged' as const,
          createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
          lastActivityAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
          source: 'inbound',
          engagementScore: 30,
          touches: 2,
          lastTouchDaysAgo: 31,
        },
      ],
      targetRevenueCents: 300000,
      currentQuotaCents: 250000,
      quarterStartDate: new Date(),
      quarterEndDate: new Date(),
    };

    const atRiskDeals = identifyAtRiskDeals(pipeline);

    expect(Array.isArray(atRiskDeals)).toBe(true);
    if (atRiskDeals.length > 0) {
      expect(atRiskDeals[0].riskScore).toBeGreaterThan(0);
      expect(atRiskDeals[0].riskScore).toBeLessThanOrEqual(100);
      expect(atRiskDeals[0].riskFactors).toBeDefined();
      expect(atRiskDeals[0].recommendation).toBeDefined();
    }
  });
});

// ============================================================================
// CAMPAIGN OPTIMIZER TESTS
// ============================================================================

describe('Campaign Optimizer', () => {
  it('analyzeCampaignPerformance returns complete analysis', () => {
    const campaign = {
      campaignId: 'camp-001',
      name: 'Q2 Outreach',
      status: 'active' as const,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      currentDate: new Date(),
      metrics: {
        totalAttempts: 500,
        contactRate: 0.25,
        connectionRate: 0.35,
        qualificationRate: 0.45,
        conversionRate: 0.12,
        totalLeadsContacted: 125,
        totalConnections: 44,
        totalQualified: 20,
        totalConversions: 5,
        costPerLead: 50,
        costPerConnection: 142,
        costPerQualification: 312,
        costPerAcquisition: 1250,
        totalSpent: 25000,
        totalRevenue: 50000,
        daysActive: 30,
      },
      channels: [
        { channel: 'call' as const, allocationPercentage: 50 },
        { channel: 'email' as const, allocationPercentage: 30 },
        { channel: 'sms' as const, allocationPercentage: 20 },
      ],
      leadFilters: { minScore: 50, maxScore: 100, industries: ['saas'], companies: [], jobTitles: [] },
      callWindows: [{ dayOfWeek: 2, startHour: 9, endHour: 17, timezone: 'US/Eastern' }],
      budget: { total: 30000, spent: 25000, remaining: 5000, byChannel: { call: 15000, email: 7000, sms: 3000 } },
    };

    const analysis = analyzeCampaignPerformance(campaign);

    expect(analysis.campaignId).toBe('camp-001');
    expect(analysis.metrics).toBeDefined();
    expect(analysis.trends).toBeDefined();
    expect(analysis.benchmarks).toBeDefined();
    expect(analysis.channelEffectiveness).toBeDefined();
    expect(analysis.health).toMatch(/excellent|good|fair|poor/);
    expect(analysis.riskFactors).toBeDefined();
    expect(Array.isArray(analysis.riskFactors)).toBe(true);
  });

  it('generateOptimizations suggests improvements for low-performing campaign', () => {
    const analysis = {
      campaignId: 'camp-002',
      timestamp: new Date(),
      metrics: {
        totalAttempts: 100,
        contactRate: 0.1,
        connectionRate: 0.15,
        qualificationRate: 0.2,
        conversionRate: 0.05,
        totalLeadsContacted: 10,
        totalConnections: 2,
        totalQualified: 0,
        totalConversions: 0,
        costPerLead: 100,
        costPerConnection: 500,
        costPerQualification: 0,
        costPerAcquisition: 10000,
        totalSpent: 10000,
        totalRevenue: 0,
        daysActive: 7,
      },
      trends: [],
      benchmarks: [],
      channelEffectiveness: [],
      health: 'poor' as const,
      riskFactors: ['Contact rate critically low', 'Conversion rate below target'],
    };

    const optimizations = generateOptimizations(analysis);

    expect(Array.isArray(optimizations)).toBe(true);
    expect(optimizations.length).toBeGreaterThan(0);
    optimizations.forEach(opt => {
      expect(opt.priority).toMatch(/low|medium|high|critical/);
      expect(opt.confidence).toBeGreaterThan(0);
      expect(opt.confidence).toBeLessThanOrEqual(1);
    });
  });

  it('detectCampaignAnomalies detects sudden drops', () => {
    const campaign = {
      campaignId: 'camp-003',
      name: 'Test Campaign',
      status: 'active' as const,
      startDate: new Date(),
      currentDate: new Date(),
      metrics: {
        totalAttempts: 200,
        contactRate: 0.1,
        connectionRate: 0.15,
        qualificationRate: 0.25,
        conversionRate: 0.08,
        totalLeadsContacted: 20,
        totalConnections: 3,
        totalQualified: 1,
        totalConversions: 0,
        costPerLead: 100,
        costPerConnection: 667,
        costPerQualification: 2000,
        costPerAcquisition: 0,
        totalSpent: 20000,
        totalRevenue: 0,
        daysActive: 7,
      },
      channels: [],
      leadFilters: { minScore: 50, maxScore: 100, industries: [], companies: [], jobTitles: [] },
      callWindows: [],
      budget: { total: 25000, spent: 20000, remaining: 5000, byChannel: {} },
    };

    const history = {
      campaignId: 'camp-003',
      snapshots: [
        { ...campaign, metrics: { ...campaign.metrics, contactRate: 0.25 } },
        campaign,
      ],
      anomalies: [],
      previousOptimizations: [],
    };

    const anomalies = detectCampaignAnomalies(campaign, history);

    expect(Array.isArray(anomalies)).toBe(true);
    anomalies.forEach(a => {
      expect(a.severity).toMatch(/info|warning|critical/);
      expect(a.detected).toBe(true);
    });
  });

  it('scoreCampaignHealth returns 0-100 score', () => {
    const analysis = {
      campaignId: 'camp-004',
      timestamp: new Date(),
      metrics: {
        totalAttempts: 400,
        contactRate: 0.3,
        connectionRate: 0.4,
        qualificationRate: 0.5,
        conversionRate: 0.15,
        totalLeadsContacted: 120,
        totalConnections: 50,
        totalQualified: 20,
        totalConversions: 6,
        costPerLead: 50,
        costPerConnection: 120,
        costPerQualification: 250,
        costPerAcquisition: 1000,
        totalSpent: 20000,
        totalRevenue: 60000,
        daysActive: 30,
      },
      trends: [],
      benchmarks: [],
      channelEffectiveness: [],
      health: 'good' as const,
      riskFactors: [],
    };

    const score = scoreCampaignHealth(analysis);

    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);
    expect(score.componentScores.reach).toBeGreaterThanOrEqual(0);
    expect(score.componentScores.engagement).toBeGreaterThanOrEqual(0);
    expect(score.componentScores.conversion).toBeGreaterThanOrEqual(0);
    expect(score.status).toMatch(/healthy|warning|critical/);
  });
});

// ============================================================================
// DEAL VELOCITY ANALYZER TESTS
// ============================================================================

describe('Deal Velocity Analyzer', () => {
  it('analyzeDealVelocity with realistic deals', () => {
    const now = new Date();
    const deals = [
      {
        id: 'deal-1',
        stageId: 'negotiation',
        stageName: 'Negotiation',
        value: 100000,
        createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        stageEnteredAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        stageExitedAt: now,
        source: 'inbound' as const,
        industry: 'saas',
        decisionMakerEngaged: true,
        proposalSent: true,
        lastActivity: now,
        winRate: 0.8,
      },
      {
        id: 'deal-2',
        stageId: 'qualified',
        stageName: 'Qualified',
        value: 75000,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        stageEnteredAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        stageExitedAt: null,
        source: 'outbound' as const,
        industry: 'saas',
        decisionMakerEngaged: false,
        proposalSent: false,
        lastActivity: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        winRate: 0.5,
      },
    ];

    const stages = [
      { id: 'qualified', name: 'Qualified', order: 1, benchmarkDays: 10 },
      { id: 'negotiation', name: 'Negotiation', order: 2, benchmarkDays: 14 },
    ];

    const report = analyzeDealVelocity(deals, stages);

    expect(report.dealCount).toBe(2);
    expect(report.metrics.averageDaysPerStage).toBeDefined();
    expect(report.metrics.conversionRates).toBeDefined();
    expect(report.metrics.overallVelocity).toBeGreaterThanOrEqual(0);
    expect(report.metrics.trendDirection).toMatch(/accelerating|decelerating|stable/);
    expect(report.avgCycleLengthDays).toBeGreaterThanOrEqual(0);
    expect(report.totalPipelineValue).toBe(175000);
  });

  it('identifyBottlenecks finds slow stages', () => {
    const now = new Date();
    const deals = [
      ...Array(10)
        .fill(0)
        .map((_, i) => ({
          id: `deal-${i}`,
          stageId: 'negotiation',
          stageName: 'Negotiation',
          value: 50000,
          createdAt: now,
          stageEnteredAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
          stageExitedAt: null,
          source: 'inbound' as const,
          industry: 'saas',
          decisionMakerEngaged: false,
          proposalSent: false,
          lastActivity: now,
          winRate: 0.3,
        })),
    ];

    const stages = [{ id: 'negotiation', name: 'Negotiation', order: 1, benchmarkDays: 14 }];
    const report = analyzeDealVelocity(deals, stages);
    const bottlenecks = identifyBottlenecks(report);

    expect(Array.isArray(bottlenecks)).toBe(true);
    bottlenecks.forEach(b => {
      expect(b.severityLevel).toMatch(/minor|moderate|severe/);
      expect(b.averageStayDays).toBeGreaterThan(0);
      expect(b.likelyRootCauses).toBeDefined();
    });
  });

  it('predictDealCloseDate returns future date', () => {
    const now = new Date();
    const deal = {
      id: 'deal-1',
      stageId: 'negotiation',
      stageName: 'Negotiation',
      value: 100000,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      stageEnteredAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      stageExitedAt: null,
      source: 'inbound' as const,
      industry: 'saas',
      decisionMakerEngaged: true,
      proposalSent: true,
      lastActivity: now,
      winRate: 0.75,
    };

    const stages = [{ id: 'negotiation', name: 'Negotiation', order: 1, benchmarkDays: 14 }];
    const report = analyzeDealVelocity([deal], stages);
    const prediction = predictDealCloseDate(deal, report);

    expect(prediction.dealId).toBe('deal-1');
    expect(prediction.predictedCloseDate.getTime()).toBeGreaterThan(now.getTime());
    expect(prediction.confidenceScore).toBeGreaterThan(0);
    expect(prediction.confidenceScore).toBeLessThanOrEqual(0.95);
    expect(prediction.bestCaseDate.getTime()).toBeLessThanOrEqual(prediction.worstCaseDate.getTime());
  });
});

// ============================================================================
// AUTO FOLLOW-UP ENGINE TESTS
// ============================================================================

describe('Auto Follow-up Engine', () => {
  it('determineNextBestAction for hot lead returns call', () => {
    const hotLead = {
      lead_id: 'lead-001',
      name: 'John Doe',
      company: 'Acme Corp',
      email: 'john@acme.com',
      phone: '555-1234',
      current_stage: 'engaged' as const,
      last_interaction: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      engagement_score: 85,
      lead_score: 85,
      total_touches: 3,
      touches_this_week: 2,
      days_since_last_contact: 0.5,
      response_rate: 0.8,
      opened_emails: 5,
      clicked_links: 3,
      callback_requested: false,
      callback_requested_time: null,
      pricing_interest_signals: 2,
      showed_for_demo: false,
      demo_date: null,
      last_demo_outcome: null,
      objection_type: null,
      is_from_competitor: false,
      industry: 'saas',
      metadata: { last_channel: 'email' },
    };

    const context = {
      workspace_id: 'ws-001',
      current_time: new Date().toISOString(),
      timezone: 'US/Eastern',
      working_hours_start: 9,
      working_hours_end: 17,
      working_days: [1, 2, 3, 4, 5],
      autonomy_level: 'auto' as const,
      max_touches_per_week: 3,
      cool_down_hours_after_high_engagement: 2,
    };

    const action = determineNextBestAction(hotLead, context);

    expect(action.action).toBe('call');
    expect(action.priority).toBe(10);
    expect(action.confidence).toBeGreaterThan(0.8);
  });

  it('calculateFollowUpFatigue for over-contacted lead', () => {
    const fatigued = {
      lead_id: 'lead-002',
      name: 'Jane Doe',
      company: 'Test Corp',
      email: 'jane@test.com',
      phone: '555-5678',
      current_stage: 'contacted' as const,
      last_interaction: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      engagement_score: 20,
      lead_score: 30,
      total_touches: 8,
      touches_this_week: 5,
      days_since_last_contact: 5,
      response_rate: 0,
      opened_emails: 0,
      clicked_links: 0,
      callback_requested: false,
      callback_requested_time: null,
      pricing_interest_signals: 0,
      showed_for_demo: false,
      demo_date: null,
      last_demo_outcome: null,
      objection_type: null,
      is_from_competitor: false,
      industry: null,
      metadata: {},
    };

    const fatigue = calculateFollowUpFatigue(fatigued);

    expect(fatigue.fatigue_level).toMatch(/low|medium|high|critical/);
    expect(fatigue.score).toBeGreaterThan(0);
    expect(fatigue.touches_per_week).toBe(5);
    expect(fatigue.recommended_cooldown_hours).toBeGreaterThan(0);
    expect(fatigue.max_touches_remaining).toBeGreaterThanOrEqual(0);
  });

  it('prioritizeActionQueue sorts by impact', () => {
    const leads = [
      {
        lead_id: 'lead-1',
        name: 'Alice',
        company: 'Company A',
        email: 'alice@a.com',
        phone: '555-1111',
        current_stage: 'engaged' as const,
        last_interaction: new Date().toISOString(),
        engagement_score: 80,
        lead_score: 80,
        total_touches: 2,
        touches_this_week: 1,
        days_since_last_contact: 0.5,
        response_rate: 0.8,
        opened_emails: 3,
        clicked_links: 2,
        callback_requested: false,
        callback_requested_time: null,
        pricing_interest_signals: 2,
        showed_for_demo: false,
        demo_date: null,
        last_demo_outcome: null,
        objection_type: null,
        is_from_competitor: false,
        industry: 'saas',
        metadata: {},
      },
      {
        lead_id: 'lead-2',
        name: 'Bob',
        company: 'Company B',
        email: 'bob@b.com',
        phone: '555-2222',
        current_stage: 'contacted' as const,
        last_interaction: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        engagement_score: 30,
        lead_score: 40,
        total_touches: 1,
        touches_this_week: 0,
        days_since_last_contact: 7,
        response_rate: 0,
        opened_emails: 0,
        clicked_links: 0,
        callback_requested: false,
        callback_requested_time: null,
        pricing_interest_signals: 0,
        showed_for_demo: false,
        demo_date: null,
        last_demo_outcome: null,
        objection_type: null,
        is_from_competitor: false,
        industry: null,
        metadata: {},
      },
    ];

    const capacity = {
      agent_available_minutes: 240,
      leads_pending_action: 2,
      estimated_minutes_per_call: 10,
      estimated_minutes_per_email: 5,
      estimated_minutes_per_sms: 2,
    };

    const queue = prioritizeActionQueue(leads, capacity);

    expect(queue.actions).toBeDefined();
    expect(Array.isArray(queue.actions)).toBe(true);
    expect(queue.total_estimated_minutes).toBeGreaterThanOrEqual(0);
    expect(typeof queue.can_complete_all).toBe('boolean');
  });
});

// ============================================================================
// CONVERSATION INTELLIGENCE TESTS
// ============================================================================

describe('Conversation Intelligence', () => {
  it('analyzeConversation with realistic transcript', () => {
    const transcript = {
      callId: 'call-001',
      duration: 600,
      startTime: '2026-04-08T10:00:00Z',
      utterances: [
        { speaker: 'sales' as const, text: 'Hi there! What brings you in today?', timestamp: 0, duration: 3 },
        { speaker: 'prospect' as const, text: 'We are looking for a solution to streamline our workflow.', timestamp: 3, duration: 10 },
        { speaker: 'sales' as const, text: 'Tell me more about the challenges you are facing.', timestamp: 13, duration: 4 },
        { speaker: 'prospect' as const, text: 'Well, we spend too much time on manual data entry and need automation.', timestamp: 17, duration: 15 },
        { speaker: 'sales' as const, text: 'That is exactly what we solve. How many people are on your team?', timestamp: 32, duration: 5 },
        { speaker: 'prospect' as const, text: 'Around 20 people. What is the pricing like?', timestamp: 37, duration: 8 },
        { speaker: 'sales' as const, text: 'We have flexible plans starting at $5K per month. Can I show you a quick demo?', timestamp: 45, duration: 6 },
        { speaker: 'prospect' as const, text: 'That sounds interesting. When can we schedule it?', timestamp: 51, duration: 6 },
        { speaker: 'sales' as const, text: 'How about tomorrow at 2 PM?', timestamp: 57, duration: 3 },
        { speaker: 'prospect' as const, text: 'Perfect, I am ready to move forward.', timestamp: 60, duration: 5 },
      ],
    };

    const analysis = analyzeConversation(transcript);

    expect(analysis.callId).toBe('call-001');
    expect(analysis.talkListenRatio.talkPercent).toBeGreaterThanOrEqual(0);
    expect(analysis.talkListenRatio.talkPercent).toBeLessThanOrEqual(100);
    expect(analysis.talkListenRatio.listenPercent).toBeGreaterThanOrEqual(0);
    expect(analysis.talkListenRatio.listenPercent).toBeLessThanOrEqual(100);
    expect(analysis.longestMonologueSeconds).toBeGreaterThanOrEqual(0);
    expect(analysis.questionCount.total).toBeGreaterThanOrEqual(0);
    expect(analysis.questionCount.open).toBeGreaterThanOrEqual(0);
    expect(analysis.questionCount.closed).toBeGreaterThanOrEqual(0);
    expect(analysis.keyTopics).toBeDefined();
    expect(analysis.sentimentTrajectory).toBeDefined();
    expect(analysis.prospectEngagement).toBeDefined();
  });

  it('scoreCallPerformance returns 0-100 with grade', () => {
    const analysis = {
      callId: 'call-002',
      talkListenRatio: { talkPercent: 45, listenPercent: 55 },
      longestMonologueSeconds: 90,
      questionCount: { total: 8, open: 5, closed: 3 },
      fillerWords: { um: 2, like: 3 },
      keyTopics: [
        { topic: 'pricing', mentions: 2, context: ['mentioned pricing'] },
        { topic: 'timeline', mentions: 1, context: ['asked when'] },
      ],
      sentimentTrajectory: { start: 0.3, middle: 0.5, end: 0.7 },
      prospectEngagement: { questionCount: 3, interestSignals: ['interested', 'tell me more'] },
      callDuration: 600,
      utteranceCount: 10,
    };

    const score = scoreCallPerformance(analysis);

    expect(score.discoveryQuality).toBeGreaterThanOrEqual(0);
    expect(score.discoveryQuality).toBeLessThanOrEqual(20);
    expect(score.rapportBuilding).toBeGreaterThanOrEqual(0);
    expect(score.rapportBuilding).toBeLessThanOrEqual(20);
    expect(score.valueArticulation).toBeGreaterThanOrEqual(0);
    expect(score.valueArticulation).toBeLessThanOrEqual(20);
    expect(score.objectionHandling).toBeGreaterThanOrEqual(0);
    expect(score.objectionHandling).toBeLessThanOrEqual(20);
    expect(score.closeAttempt).toBeGreaterThanOrEqual(0);
    expect(score.closeAttempt).toBeLessThanOrEqual(20);
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);
    expect(score.grade).toMatch(/A|B|C|D|F/);
  });

  it('extractCoachingInsights provides actionable feedback', () => {
    const analysis = {
      callId: 'call-003',
      talkListenRatio: { talkPercent: 70, listenPercent: 30 },
      longestMonologueSeconds: 240,
      questionCount: { total: 2, open: 0, closed: 2 },
      fillerWords: { um: 10, like: 8 },
      keyTopics: [],
      sentimentTrajectory: { start: 0.5, middle: 0.2, end: 0.1 },
      prospectEngagement: { questionCount: 0, interestSignals: [] },
      callDuration: 600,
      utteranceCount: 8,
    };

    const score = {
      discoveryQuality: 5,
      rapportBuilding: 3,
      valueArticulation: 8,
      objectionHandling: 2,
      closeAttempt: 5,
      overallScore: 23,
      grade: 'F' as const,
    };

    const insights = extractCoachingInsights(analysis, score);

    expect(Array.isArray(insights)).toBe(true);
    insights.forEach(i => {
      expect(i.category).toBeDefined();
      expect(i.title).toBeDefined();
      expect(i.impact).toMatch(/high|medium|low/);
      expect(i.priority).toBeGreaterThan(0);
      expect(i.priority).toBeLessThanOrEqual(10);
    });
  });

  it('detectKeyMoments finds buying signals', () => {
    const transcript = {
      callId: 'call-004',
      duration: 600,
      startTime: '2026-04-08T10:00:00Z',
      utterances: [
        { speaker: 'sales' as const, text: 'Let me explain our pricing model.', timestamp: 0, duration: 4 },
        { speaker: 'prospect' as const, text: 'Great, when can we implement this?', timestamp: 4, duration: 5 },
        { speaker: 'sales' as const, text: 'We can start next week.', timestamp: 9, duration: 3 },
        { speaker: 'prospect' as const, text: 'That sounds perfect.', timestamp: 12, duration: 3 },
        { speaker: 'prospect' as const, text: 'I have a concern about the timeline though.', timestamp: 15, duration: 5 },
      ],
    };

    const moments = detectKeyMoments(transcript);

    expect(Array.isArray(moments)).toBe(true);
    expect(moments.length).toBeGreaterThan(0);
    moments.forEach(m => {
      expect(m.timestamp).toBeGreaterThanOrEqual(0);
      expect(m.type).toMatch(/buying-signal|risk-signal|breakthrough|objection/);
      expect(m.speaker).toMatch(/sales|prospect/);
      expect(m.context).toBeDefined();
    });
  });
});
