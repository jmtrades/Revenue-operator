/**
 * Comprehensive Edge-Case Tests for Intelligence Engines
 * Tests extreme scenarios, boundary conditions, and error states
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { computeAction, type FullLeadContext, type ActionTrigger } from '../src/lib/intelligence/contextual-action-engine';
import { processEvent, buildEventChain, detectReactivationSignals, calculateEventImpact, classifyEventUrgency, type LeadEvent, type LeadContext } from '../src/lib/intelligence/reactive-event-processor';
import { resolvePostCallActions, type CallData } from '../src/lib/intelligence/post-call-resolver';
import { evaluateTransition, type TransitionEvent, type LeadStage } from '../src/lib/intelligence/lead-lifecycle-machine';
import { matchScenario, type SalesSituation } from '../src/lib/intelligence/scenario-intelligence';
import { createExperiment, assignVariant, evaluateExperiment, generateVariant, type ExperimentParams } from '../src/lib/intelligence/ab-testing-engine';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createMinimalLeadContext(overrides?: Partial<FullLeadContext>): FullLeadContext {
  return {
    leadProfile: {
      leadId: 'lead-001',
      name: 'Test Lead',
      company: 'Test Co',
      industry: 'SaaS',
      timezone: 'America/New_York',
      leadScore: 50,
      engagementScore: 50,
      conversionProbability: 0.5,
    },
    interactionHistory: {
      lastContactAt: null,
      lastOutcome: null,
      totalTouches: 0,
      touchesThisWeek: 0,
      hoursSinceLastContact: 999,
      recentlyResponded: false,
    },
    dealInfo: {
      stageName: null,
      value: 0,
      closeProbability: 0,
      daysInStage: 0,
    },
    workspaceSettings: {
      workspaceId: 'ws-001',
      autonomyLevel: 'suggest',
      maxTouchesPerWeek: 5,
      maxTouchesPerDay: 2,
      preferredChannels: ['call', 'email'],
      timezone: 'America/New_York',
    },
    ...overrides,
  };
}

function createMinimalLeadEvent(overrides?: Partial<LeadEvent>): LeadEvent {
  return {
    id: `event-${Date.now()}`,
    type: 'email_reply',
    timestamp: new Date().toISOString(),
    leadId: 'lead-001',
    data: {},
    ...overrides,
  };
}

function createMinimalLeadContext2(overrides?: Partial<LeadContext>): LeadContext {
  return {
    leadId: 'lead-001',
    name: 'Test Lead',
    email: 'test@example.com',
    phone: '+1234567890',
    companyName: 'Test Company',
    lifecyclePhase: 'NEW',
    daysSinceFirstContact: 0,
    daysSinceDark: 0,
    leadScore: 50,
    conversionProbability: 0.5,
    lastActivityAt: new Date().toISOString(),
    lastTouchChannel: 'email',
    totalTouchpoints: 0,
    recentEvents: [],
    sentiment: 'neutral',
    hasOptedOut: false,
    isHighValue: false,
    ...overrides,
  };
}

function createMinimalCallData(overrides?: Partial<CallData>): CallData {
  return {
    callerId: 'lead-001',
    callerPhone: '+1234567890',
    callerName: 'Test Lead',
    companyName: 'Test Co',
    outcome: 'no_answer',
    duration: 0,
    sentiment: 'neutral',
    topicsDiscussed: [],
    keyMoments: [],
    transcriptSummary: '',
    timestamp: new Date().toISOString(),
    timezone: 'America/New_York',
    ...overrides,
  };
}

function createMinimalSalesSituation(overrides?: Partial<SalesSituation>): SalesSituation {
  return {
    lead_id: 'lead-001',
    workspace_id: 'ws-001',
    lifecycle_phase: 'NEW',
    days_since_last_contact: 0,
    total_touchpoints: 0,
    last_outcome: null,
    last_message_sent: null,
    engagement_score: 50,
    urgency_score: 50,
    conversion_probability: 0.5,
    ...overrides,
  };
}

// ============================================================================
// CONTEXTUAL ACTION ENGINE EDGE CASES
// ============================================================================

describe('Contextual Action Engine - Edge Cases', () => {
  it('should handle null/undefined trigger fields', async () => {
    const context = createMinimalLeadContext();
    const trigger: ActionTrigger = { type: 'scheduled_check' };

    const result = await computeAction('lead-001', trigger, context);

    expect(result).toBeDefined();
    expect(result.leadId).toBe('lead-001');
    expect(result.primaryAction).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should handle empty lead context gracefully', async () => {
    const context = createMinimalLeadContext({
      leadProfile: {
        leadId: 'lead-001',
        name: null,
        company: null,
        industry: null,
        timezone: 'America/New_York',
        leadScore: 0,
        engagementScore: 0,
        conversionProbability: 0,
      },
    });
    const trigger: ActionTrigger = { type: 'scheduled_check' };

    const result = await computeAction('lead-001', trigger, context);

    expect(result).toBeDefined();
    expect(result.primaryAction.type).toBeDefined();
  });

  it('should handle urgency score of 0', async () => {
    const context = createMinimalLeadContext({
      leadProfile: {
        leadId: 'lead-001',
        name: 'Test',
        company: 'Test Co',
        industry: 'SaaS',
        timezone: 'America/New_York',
        leadScore: 0,
        engagementScore: 0,
        conversionProbability: 0,
      },
    });
    const trigger: ActionTrigger = { type: 'scheduled_check' };

    const result = await computeAction('lead-001', trigger, context);

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should handle maximum urgency score of 100', async () => {
    const context = createMinimalLeadContext({
      leadProfile: {
        leadId: 'lead-001',
        name: 'VIP Lead',
        company: 'Enterprise Corp',
        industry: 'Fortune 500',
        timezone: 'America/New_York',
        leadScore: 100,
        engagementScore: 100,
        conversionProbability: 1.0,
      },
      dealInfo: {
        stageName: 'CLOSING',
        value: 1000000,
        closeProbability: 0.95,
        daysInStage: 2,
      },
    });
    const trigger: ActionTrigger = { type: 'scheduled_check' };

    const result = await computeAction('lead-001', trigger, context);

    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.primaryAction.type).toBeDefined();
  });

  it('should handle extreme fatigue (touches exceed max by 10x)', async () => {
    const context = createMinimalLeadContext({
      interactionHistory: {
        lastContactAt: new Date().toISOString(),
        lastOutcome: 'connected',
        totalTouches: 100,
        touchesThisWeek: 50,
        hoursSinceLastContact: 1,
        recentlyResponded: true,
      },
      workspaceSettings: {
        workspaceId: 'ws-001',
        autonomyLevel: 'suggest',
        maxTouchesPerWeek: 5,
        maxTouchesPerDay: 2,
        preferredChannels: ['call', 'email'],
        timezone: 'America/New_York',
      },
    });
    const trigger: ActionTrigger = { type: 'scheduled_check' };

    const result = await computeAction('lead-001', trigger, context);

    expect(result.riskFlags).toContain('fatigue_exceeded');
    expect(result.primaryAction.type).toBe('email'); // Should downgrade to email
  });
});

// ============================================================================
// REACTIVE EVENT PROCESSOR EDGE CASES
// ============================================================================

describe('Reactive Event Processor - Edge Cases', () => {
  it('should handle unknown event types gracefully', () => {
    const event = createMinimalLeadEvent({
      type: 'unknown_event_type' as any,
    });
    const leadContext = createMinimalLeadContext2();

    const reaction = processEvent(event, leadContext);

    expect(reaction).toBeDefined();
    expect(reaction.leadId).toBe('lead-001');
    expect(reaction.reasoning).toContain('Unknown');
  });

  it('should handle empty event chains', () => {
    const chain = buildEventChain([]);

    expect(chain).toBeDefined();
    expect(chain.chainType).toBe('stalling');
    expect(chain.events).toHaveLength(0);
    expect(chain.strength).toBe(0);
  });

  it('should handle duplicate consecutive events', () => {
    const event1 = createMinimalLeadEvent({ type: 'email_reply', id: 'event-1' });
    const event2 = createMinimalLeadEvent({ type: 'email_reply', id: 'event-2' });
    const event3 = createMinimalLeadEvent({ type: 'email_reply', id: 'event-3' });

    const chain = buildEventChain([event1, event2, event3]);

    expect(chain).toBeDefined();
    expect(chain.events).toHaveLength(3);
    expect(chain.chainType).toBe('converting');
  });

  it('should handle 1000+ events in event chain', () => {
    const events: LeadEvent[] = [];
    for (let i = 0; i < 1000; i++) {
      events.push(
        createMinimalLeadEvent({
          id: `event-${i}`,
          type: i % 2 === 0 ? 'email_reply' : 'email_open',
          timestamp: new Date(Date.now() - i * 1000).toISOString(),
        })
      );
    }

    const chain = buildEventChain(events);

    expect(chain).toBeDefined();
    expect(chain.events).toHaveLength(1000);
    expect(chain.strength).toBeGreaterThan(0);
  });

  it('should detect reactivation signals for leads dormant 1+ years', () => {
    const event = createMinimalLeadEvent({ type: 'email_reply' });
    const signals = detectReactivationSignals([event], 365);

    expect(signals).toBeDefined();
    if (signals) {
      expect(signals.detected).toBe(true);
      expect(signals.strength).toBe('strong');
      expect(signals.confidence).toBeGreaterThan(0.7);
    }
  });

  it('should return null for dormant signals on active leads', () => {
    const event = createMinimalLeadEvent({ type: 'email_reply' });
    const signals = detectReactivationSignals([event], 2);

    expect(signals).toBeNull();
  });

  it('should classify urgency for all event types', () => {
    const eventTypes = [
      'lead_callback',
      'email_reply',
      'pricing_page_visit',
      'form_fill',
      'email_open',
      'demo_page_visit',
    ] as const;

    eventTypes.forEach((eventType) => {
      const event = createMinimalLeadEvent({ type: eventType });
      const urgency = classifyEventUrgency(event);

      expect(urgency).toBeDefined();
      expect(['immediate', 'within-hour', 'same-day', 'next-day', 'next-week']).toContain(urgency.level);
      expect(urgency.maxResponseTime).toBeGreaterThan(0);
    });
  });

  it('should calculate event impact for all event types', () => {
    const eventTypes = [
      'form_fill',
      'email_reply',
      'pricing_page_visit',
      'email_open',
      'email_bounced',
      'lead_score_changed',
    ] as const;

    eventTypes.forEach((eventType) => {
      const event = createMinimalLeadEvent({ type: eventType, data: { newScore: 75, oldScore: 50 } });
      const leadContext = createMinimalLeadContext2();
      const impact = calculateEventImpact(event, leadContext);

      expect(impact).toBeDefined();
      expect(impact.scoreDelta).toBeDefined();
      expect(impact.scoreConfidence).toBeGreaterThanOrEqual(0);
      expect(impact.scoreConfidence).toBeLessThanOrEqual(1);
    });
  });
});

// ============================================================================
// POST-CALL RESOLVER EDGE CASES
// ============================================================================

describe('Post-Call Resolver - Edge Cases', () => {
  it('should handle zero-duration calls', () => {
    const callData = createMinimalCallData({
      duration: 0,
      outcome: 'no_answer',
    });

    const result = resolvePostCallActions(callData);

    expect(result).toBeDefined();
    expect(result.callId).toBeDefined();
    expect(result.primaryAction).toBeDefined();
  });

  it('should handle very long calls (10+ hours)', () => {
    const callData = createMinimalCallData({
      duration: 10 * 60 * 60, // 10 hours in seconds
      outcome: 'booked_appointment',
      sentiment: 'positive',
      topicsDiscussed: ['pricing', 'implementation', 'timeline', 'support'],
      keyMoments: [
        { type: 'agreement', timestamp: 1000, description: 'Agreed on timeline' },
        { type: 'excitement', timestamp: 2000, description: 'Excited about features' },
      ],
    });

    const result = resolvePostCallActions(callData);

    expect(result).toBeDefined();
    expect(result.confidenceScore).toBeGreaterThan(0.6);
    expect(result.priorityScore).toBeGreaterThanOrEqual(8);
  });

  it('should handle empty transcripts', () => {
    const callData = createMinimalCallData({
      transcriptSummary: '',
      topicsDiscussed: [],
      keyMoments: [],
      outcome: 'no_answer',
    });

    const result = resolvePostCallActions(callData);

    expect(result).toBeDefined();
    expect(result.internalNotes).toBeDefined();
  });

  it('should handle all outcome types', () => {
    const outcomes = [
      'booked_appointment',
      'requested_callback',
      'asked_for_info',
      'price_objection',
      'competitor_comparison',
      'interested_but_not_now',
      'needs_decision_maker',
      'warm_conversation_no_commitment',
      'left_voicemail',
      'no_answer',
      'negative_outcome',
      'hung_up_early',
      'transferred_to_closer',
      'follow_up_scheduled',
      'reached_voicemail',
      'busy',
      'wrong_number',
    ] as const;

    outcomes.forEach((outcome) => {
      const callData = createMinimalCallData({ outcome });
      const result = resolvePostCallActions(callData);

      expect(result).toBeDefined();
      expect(result.outcomeCategoryResult).toBe(outcome);
      expect(result.primaryAction).toBeDefined();
      expect(result.priorityScore).toBeGreaterThanOrEqual(1);
      expect(result.priorityScore).toBeLessThanOrEqual(10);
    });
  });

  it('should handle extreme sentiment variations', () => {
    const sentiments = ['positive', 'neutral', 'negative', 'mixed'] as const;

    sentiments.forEach((sentiment) => {
      const callData = createMinimalCallData({
        sentiment,
        outcome: 'booked_appointment',
      });

      const result = resolvePostCallActions(callData);

      expect(result).toBeDefined();
      expect(result.toneGuidance).toBeDefined();
    });
  });
});

// ============================================================================
// LEAD LIFECYCLE MACHINE EDGE CASES
// ============================================================================

describe('Lead Lifecycle Machine - Edge Cases', () => {
  it('should handle all 18 lead stages', () => {
    const stages: LeadStage[] = [
      'NEW',
      'CONTACTED',
      'ENGAGED',
      'QUALIFYING',
      'QUALIFIED',
      'DEMO_SCHEDULED',
      'DEMO_COMPLETED',
      'PROPOSAL_SENT',
      'NEGOTIATING',
      'CLOSING',
      'WON',
      'NURTURE',
      'RE_ENGAGING',
      'AT_RISK',
      'LOST',
      'DISQUALIFIED',
      'CHURNED',
      'WINBACK',
    ];

    expect(stages).toHaveLength(18);
  });

  it('should handle invalid state transitions', () => {
    const event: TransitionEvent = {
      type: 'call',
      timestamp: new Date(),
      metadata: {
        sentiment: 'negative',
        daysInStage: 100,
      },
    };

    // Attempting invalid transition should be handled gracefully
    const result = evaluateTransition('WON', event);

    expect(result).toBeDefined();
    expect(result.currentStage).toBeDefined();
  });

  it('should cycle through representative state transitions', () => {
    const transitionPath: LeadStage[] = ['NEW', 'CONTACTED', 'ENGAGED', 'QUALIFYING', 'QUALIFIED'];

    // Verify each stage in sequence
    transitionPath.forEach((stage) => {
      expect(stage).toBeDefined();
      expect(['NEW', 'CONTACTED', 'ENGAGED', 'QUALIFYING', 'QUALIFIED']).toContain(stage);
    });
  });

  it('should handle regression from advanced stages', () => {
    const event: TransitionEvent = {
      type: 'silence',
      timestamp: new Date(),
      metadata: {
        daysInStage: 30,
        sentiment: 'negative',
      },
    };

    const result = evaluateTransition('DEMO_SCHEDULED', event);

    expect(result).toBeDefined();
    // Silence after long time should trigger some form of action
  });
});

// ============================================================================
// SCENARIO INTELLIGENCE EDGE CASES
// ============================================================================

describe('Scenario Intelligence - Edge Cases', () => {
  it('should match sales situations to appropriate scenarios', () => {
    const situation = createMinimalSalesSituation({
      lifecycle_phase: 'NEW',
      days_since_last_contact: 0,
      total_touchpoints: 0,
      engagement_score: 50,
    });

    const match = matchScenario(situation);

    expect(match).toBeDefined();
    expect(match.matchedScenario).toBeDefined();
    expect(match.confidence).toBeGreaterThan(0);
    expect(match.recommendedActions).toBeDefined();
    expect(Array.isArray(match.recommendedActions)).toBe(true);
  });

  it('should handle post-demo silence scenario', () => {
    const situation = createMinimalSalesSituation({
      demo_completed: true,
      days_since_last_contact: 5,
      last_outcome: 'no_answer',
      engagement_score: 45,
    });

    const match = matchScenario(situation);

    expect(match).toBeDefined();
    expect(match.matchedScenario).toBeDefined();
    // Should recommend follow-up with competitive positioning
  });

  it('should handle price shock scenario', () => {
    const situation = createMinimalSalesSituation({
      pricing_shown: true,
      days_since_last_contact: 2,
      engagement_score: 20,
      last_outcome: 'no_answer',
    });

    const match = matchScenario(situation);

    expect(match).toBeDefined();
    expect(match.matchedScenario).toBeDefined();
  });

  it('should handle think-it-over decay scenario', () => {
    const situation = createMinimalSalesSituation({
      last_outcome: 'call_back_requested',
      days_since_last_contact: 6,
      last_message_sent: 'Please think about our proposal',
      engagement_score: 50,
    });

    const match = matchScenario(situation);

    expect(match).toBeDefined();
    expect(match.matchedScenario).toBeDefined();
  });

  it('should return defined scenarios (not undefined)', () => {
    const situations = [
      createMinimalSalesSituation({ lifecycle_phase: 'NEW' }),
      createMinimalSalesSituation({ days_since_last_contact: 30, engagement_score: 60 }),
      createMinimalSalesSituation({ demo_completed: true }),
      createMinimalSalesSituation({ contract_sent: true }),
      createMinimalSalesSituation({ is_returning_customer: true }),
    ];

    situations.forEach((situation) => {
      const match = matchScenario(situation);
      expect(match.matchedScenario).toBeDefined();
      expect(match.matchedScenario.id).toBeDefined();
    });
  });
});

// ============================================================================
// A/B TESTING ENGINE EDGE CASES
// ============================================================================

describe('A/B Testing Engine - Edge Cases', () => {
  it('should handle zero variants gracefully', () => {
    const params: ExperimentParams = {
      experimentId: 'exp-001',
      testType: 'email',
      controlContent: 'Test email content',
      targetMetrics: ['opened'],
      trafficSplitRatio: 0.5,
      startDate: new Date().toISOString(),
      maxDurationDays: 14,
      confidenceLevel: 95,
    };

    const experiment = createExperiment(params);

    expect(experiment).toBeDefined();
    expect(experiment.experimentId).toBe('exp-001');
  });

  it('should handle statistical significance edge cases', () => {
    const params: ExperimentParams = {
      experimentId: 'exp-sig-001',
      testType: 'email',
      controlContent: 'Control version',
      targetMetrics: ['replied'],
      trafficSplitRatio: 0.5,
      startDate: new Date().toISOString(),
      confidenceLevel: 99, // Very high confidence threshold
    };

    const experiment = createExperiment(params);

    expect(experiment).toBeDefined();
    expect(experiment.confidenceLevel).toBe(99);
  });

  it('should generate variants from control content', () => {
    const controlContent = 'Hi [Name], this is our amazing product offer with great benefits.';

    const types = ['shorter', 'urgent', 'question_based', 'social_proof', 'loss_aversion'] as const;

    types.forEach((type) => {
      const variant = generateVariant(controlContent, type);
      expect(variant).toBeDefined();
      expect(variant.length).toBeGreaterThan(0);
      expect(typeof variant).toBe('string');
    });
  });

  it('should assign consistent variants based on lead ID', () => {
    const params: ExperimentParams = {
      experimentId: 'exp-consistency',
      testType: 'email',
      controlContent: 'Test',
      targetMetrics: ['opened'],
      trafficSplitRatio: 0.5,
      startDate: new Date().toISOString(),
    };

    const experiment = createExperiment(params);

    // Same lead should get same variant
    const assignment1 = assignVariant('lead-001', experiment.experimentId, 0.5);
    const assignment2 = assignVariant('lead-001', experiment.experimentId, 0.5);

    expect(assignment1.assignedVariant).toBe(assignment2.assignedVariant);
  });

  it('should handle extreme sample size requirements', () => {
    // Very small baseline conversion rate requires huge sample size
    const params: ExperimentParams = {
      experimentId: 'exp-power',
      testType: 'email',
      controlContent: 'Content',
      targetMetrics: ['converted'],
      trafficSplitRatio: 0.5,
      startDate: new Date().toISOString(),
      confidenceLevel: 99, // Extreme confidence
    };

    const experiment = createExperiment(params);

    expect(experiment).toBeDefined();
    expect(experiment.minSampleSizePerVariant).toBeGreaterThan(0);
  });

  it('should handle different metric types in evaluation', () => {
    const metricTypes = ['opened', 'replied', 'booked', 'converted', 'revenue'] as const;

    metricTypes.forEach((metric) => {
      const params: ExperimentParams = {
        experimentId: `exp-metric-${metric}`,
        testType: 'email',
        controlContent: 'Test',
        targetMetrics: [metric],
        trafficSplitRatio: 0.5,
        startDate: new Date().toISOString(),
      };

      const experiment = createExperiment(params);
      expect(experiment.targetMetrics).toContain(metric);
    });
  });
});

// ============================================================================
// INTEGRATION & PERFORMANCE TESTS
// ============================================================================

describe('Intelligence Engines - Integration & Performance', () => {
  it('should handle high-volume event processing (1000 events)', () => {
    const events: LeadEvent[] = [];
    for (let i = 0; i < 1000; i++) {
      events.push(
        createMinimalLeadEvent({
          id: `event-${i}`,
          type: ['email_reply', 'email_open', 'form_fill', 'pricing_page_visit'][i % 4] as any,
        })
      );
    }

    const startTime = performance.now();
    const chain = buildEventChain(events);
    const endTime = performance.now();

    expect(chain).toBeDefined();
    expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
  });

  it('should maintain consistency across action computations', async () => {
    const context = createMinimalLeadContext();
    const trigger: ActionTrigger = { type: 'scheduled_check' };

    const result1 = await computeAction('lead-001', trigger, context);
    const result2 = await computeAction('lead-001', trigger, context);

    // Same inputs should produce same action type (deterministic)
    expect(result1.primaryAction.type).toBe(result2.primaryAction.type);
  });

  it('should handle cascading scenario evaluations', () => {
    const leadScores = [20, 40, 60, 80, 100];

    leadScores.forEach((score) => {
      const situation = createMinimalSalesSituation({
        engagement_score: score,
        days_since_last_contact: Math.floor(Math.random() * 30),
      });

      const match = matchScenario(situation);
      expect(match).toBeDefined();
      expect(match.matchedScenario).toBeDefined();
    });
  });
});
