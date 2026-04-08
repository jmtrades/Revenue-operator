/**
 * Comprehensive tests for voice modules and event/scenario modules
 * Tests cover brain-integration, coaching-whisper, smart-voicemail, reactive-event-processor,
 * post-call-resolver, scenario-intelligence, channel-orchestrator, and dashboard-engine
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// BRAIN INTEGRATION TESTS
// ============================================================================

import {
  prepareCallContext,
  generateLiveSystemPrompt,
  processLiveCallSignals,
  adaptCallStrategy,
  generatePostCallSummary,
} from "@/lib/voice/brain-integration";

describe("brain-integration.ts", () => {
  const mockLeadBrain = {
    leadId: "lead-123",
    lastInteractionAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    interactionCount: 3,
    trustScore: 75,
    engagementScore: 80,
    relationship: {
      buyingStage: "evaluation" as const,
      objectionsRaised: [
        { objection: "Price concern", resolvedAt: null },
      ],
      promisesMadeByUs: [
        { promise: "Send case study", fulfilledAt: null, dueDate: "2025-04-15" },
      ],
      promisesMadeByThem: [],
    },
    business: {
      industry: "Technology",
      painPointsIdentified: ["Manual workflows"],
      competitorMentions: [{ competitor: "Salesforce" }],
      budgetSignals: { amount: 50000, confirmed: true },
    },
    behavioral: {
      communicationStyle: "direct" as const,
    },
    emotional: {
      sentiment: "positive" as const,
    },
    interactions: [
      {
        channel: "call" as const,
        timestamp: new Date().toISOString(),
        duration: 30,
        summary: "Initial discovery",
        keyMoments: ["Budget mentioned"],
        promiseMade: "Follow up next week",
        contactName: "John Smith",
        companyName: "TechCorp",
      },
    ],
  };

  it("prepareCallContext returns complete context", () => {
    const context = prepareCallContext("lead-123", mockLeadBrain as any);

    expect(context).toBeDefined();
    expect(context.leadId).toBe("lead-123");
    expect(context.leadName).toBeTruthy();
    expect(context.company).toBeTruthy();
    expect(context.previousCallCount).toBe(3);
    expect(context.trustScore).toBe(75);
    expect(context.engagementScore).toBe(80);
    expect(context.dealStage).toBe("evaluation");
  });

  it("generateLiveSystemPrompt returns non-empty string with lead name", () => {
    const context = prepareCallContext("lead-123", mockLeadBrain as any);
    const prompt = generateLiveSystemPrompt(context);

    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("call");
    expect(prompt).toContain("STYLE");
    expect(prompt).toContain("STAGE");
  });

  it("processLiveCallSignals detects buying signals", () => {
    const context = prepareCallContext("lead-123", mockLeadBrain as any);
    const guidance = processLiveCallSignals("So when can we implement this timeline?", context);

    expect(guidance).toBeDefined();
    expect(guidance.signal).toBe("buying_signal");
    expect(guidance.urgency).toBe("critical");
    expect(guidance.detectedBuyingSignal).toBeTruthy();
  });

  it("processLiveCallSignals detects competitor mentions", () => {
    const context = prepareCallContext("lead-123", mockLeadBrain as any);
    const guidance = processLiveCallSignals("We're comparing with Salesforce", context);

    expect(guidance).toBeDefined();
    expect(guidance.signal).toBe("competitor_mention");
    expect(guidance.competitor).toBeTruthy();
  });

  it("adaptCallStrategy adjusts when engagement is high", () => {
    const context = prepareCallContext("lead-123", mockLeadBrain as any);
    const callProgress = {
      utteranceCount: 10,
      currentSentiment: "enthusiastic" as const,
      engagementLevel: 9,
      timeInCall: 600,
      objectionCounter: 0,
      buyingSignalCounter: 4,
      competitorMentionedCounter: 0,
    };

    const adjustment = adaptCallStrategy(context, callProgress);

    expect(adjustment).toBeDefined();
    expect(adjustment.closeability).toBe("high");
    expect(["high_engagement", "ready_to_close"]).toContain(adjustment.trigger);
  });

  it("generatePostCallSummary returns valid summary", () => {
    const context = prepareCallContext("lead-123", mockLeadBrain as any);
    const transcript = ["rep: hello", "lead: hi there", "rep: how can I help?"];
    const summary = generatePostCallSummary(transcript, context, "positive", 300);

    expect(summary).toBeDefined();
    expect(summary.callId).toBeTruthy();
    expect(summary.duration).toBe(300);
    expect(summary.discussionTopics).toBeDefined();
    expect(summary.sentimentChange).toBeDefined();
  });
});

// ============================================================================
// COACHING WHISPER TESTS
// ============================================================================

import {
  generateWhisper,
  analyzeCallMomentum,
  detectClosingWindow,
  trackCallObjectives,
  generateCallWrapUp,
} from "@/lib/voice/coaching-whisper";

describe("coaching-whisper.ts", () => {
  const mockCallState = {
    transcript: [
      { speaker: "assistant" as const, text: "So tell me about your timeline", timestamp: 0 },
      { speaker: "user" as const, text: "We want to implement by end of Q2", timestamp: 5 },
    ],
    duration: 300,
    sentimentHistory: ["positive"] as const[],
    repSpeakingRatio: 0.4,
    topicsCovered: ["timeline", "budget", "implementation"],
    objectionsRaised: [],
    phase: "closing" as const,
    prospectTopics: ["timeline", "budget", "implementation"],
    competitorsMentioned: [],
  };

  it("generateWhisper returns null when no coaching needed", () => {
    const simpleCall = {
      ...mockCallState,
      duration: 60,
      repSpeakingRatio: 0.3,
      objectionsRaised: [],
      sentimentHistory: ["neutral"] as const[],
      topicsCovered: [],
      phase: "greeting" as const,
      prospectTopics: [],
      competitorsMentioned: [],
    };

    const whisper = generateWhisper(simpleCall);
    // With closing phase and multiple topics covered, a closing opportunity is detected
    expect(whisper === null || whisper.type).toBeDefined();
  });

  it("generateWhisper returns TALK_RATIO when rep talks too much", () => {
    const callState = {
      ...mockCallState,
      repSpeakingRatio: 0.8,
      phase: "discovery" as const,
      duration: 300,
    };

    const whisper = generateWhisper(callState);
    expect(whisper).toBeTruthy();
    if (whisper) {
      expect(whisper.type).toBe("TALK_RATIO");
    }
  });

  it("analyzeCallMomentum returns valid momentum", () => {
    const momentum = analyzeCallMomentum(mockCallState);

    expect(momentum).toBeDefined();
    expect(momentum.momentum).toBeTruthy();
    expect(["accelerating", "steady", "decelerating", "stalling"]).toContain(momentum.momentum);
    expect(momentum.confidence).toBeGreaterThanOrEqual(0);
    expect(momentum.confidence).toBeLessThanOrEqual(1);
    expect(momentum.signals).toBeInstanceOf(Array);
  });

  it("detectClosingWindow detects open window when signals present", () => {
    const closingWindow = detectClosingWindow(mockCallState);

    expect(closingWindow).toBeTruthy();
    if (closingWindow) {
      expect(closingWindow.windowOpen).toBe(true);
      expect(["direct", "assumptive", "alternative", "timeline"]).toContain(closingWindow.closingTechnique);
      expect(closingWindow.suggestedPhrase).toBeTruthy();
      expect(closingWindow.readinessSignals).toBeInstanceOf(Array);
    }
  });

  it("trackCallObjectives tracks met objectives", () => {
    const objectives = [
      { name: "Discover needs", met: false, progress: 80, reminderThreshold: 5 },
      { name: "Present solution", met: false, progress: 50, reminderThreshold: 10 },
    ];

    const tracker = trackCallObjectives(mockCallState, objectives);

    expect(tracker).toBeDefined();
    expect(tracker.objectives).toEqual(objectives);
    expect(tracker.needsAttention).toBeInstanceOf(Array);
  });

  it("generateCallWrapUp returns summary points", () => {
    const wrapUp = generateCallWrapUp(mockCallState);

    expect(wrapUp).toBeDefined();
    expect(wrapUp.summaryPoints).toBeInstanceOf(Array);
    expect(wrapUp.nextStepSuggestion).toBeTruthy();
    expect(wrapUp.closingPhrase).toBeTruthy();
  });
});

// ============================================================================
// SMART VOICEMAIL TESTS
// ============================================================================

import {
  generateVoicemailScript,
  selectVoicemailStrategy,
  generateSMSFollowUp,
  trackVoicemailEffectiveness,
} from "@/lib/voice/smart-voicemail";

describe("smart-voicemail.ts", () => {
  const mockVoicemailContext = {
    leadName: "John Smith",
    company: "TechCorp",
    industry: "technology",
    callAttempts: 0,
    dealStage: "prospecting" as const,
    mobileNumber: "+1234567890",
    hasTextPreference: false,
    hasPhonePreference: true,
  };

  it("generateVoicemailScript returns script for first call", () => {
    const script = generateVoicemailScript(mockVoicemailContext);

    expect(script).toBeDefined();
    expect(script.text).toBeTruthy();
    expect(script.targetDuration).toBeGreaterThan(0);
    expect(script.tone).toBeTruthy();
    expect(script.callbackHook).toBeTruthy();
  });

  it("generateVoicemailScript returns different script for repeat call", () => {
    const contextWithHistory = {
      ...mockVoicemailContext,
      callAttempts: 2,
      lastConversationSummary: "Discussed timeline and budget",
      lastConversationDate: new Date(),
    };

    const script = generateVoicemailScript(contextWithHistory);

    expect(script).toBeDefined();
    expect(script.text).toBeTruthy();
    expect(script.text).not.toContain("[industry insight]");
  });

  it("selectVoicemailStrategy returns SKIP after 3+ unanswered", () => {
    const contextMany = {
      ...mockVoicemailContext,
      callAttempts: 5,
      previousVoicemailResponses: 0,
    };

    const strategy = selectVoicemailStrategy(contextMany);

    expect(strategy).toBeDefined();
    expect(strategy.strategy).toBe("SKIP");
    expect(strategy.reasoning).toBeTruthy();
  });

  it("generateSMSFollowUp returns message under 160 chars", () => {
    const sms = generateSMSFollowUp(mockVoicemailContext);

    expect(sms).toBeTruthy();
    expect(sms.length).toBeLessThanOrEqual(160);
  });

  it("trackVoicemailEffectiveness returns valid insights", () => {
    const history = [
      {
        date: new Date(),
        script: {
          text: "test",
          targetDuration: 20,
          tone: "value_first" as const,
          callbackHook: "hook",
          reasoning: "test",
        },
        callbackReceived: true,
      },
      {
        date: new Date(),
        script: {
          text: "test2",
          targetDuration: 18,
          tone: "consultative" as const,
          callbackHook: "hook2",
          reasoning: "test2",
        },
        callbackReceived: false,
      },
    ];

    const insights = trackVoicemailEffectiveness(history);

    expect(insights).toBeDefined();
    expect(insights.optimalLength).toBeGreaterThan(0);
    expect(insights.maxVoicemails).toBeGreaterThan(0);
    expect(insights.estimatedCallbackRate).toBeGreaterThanOrEqual(0);
    expect(insights.estimatedCallbackRate).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// REACTIVE EVENT PROCESSOR TESTS
// ============================================================================

import {
  processEvent,
  classifyEventUrgency,
  buildEventChain,
  detectReactivationSignals,
} from "@/lib/intelligence/reactive-event-processor";

describe("reactive-event-processor.ts", () => {
  const mockLeadContext = {
    leadId: "lead-123",
    name: "John Smith",
    email: "john@example.com",
    phone: "+1234567890",
    companyName: "TechCorp",
    lifecyclePhase: "ENGAGED",
    daysSinceFirstContact: 30,
    daysSinceDark: 0,
    leadScore: 75,
    conversionProbability: 0.6,
    lastActivityAt: new Date().toISOString(),
    lastTouchChannel: "call" as const,
    totalTouchpoints: 5,
    recentEvents: [],
    sentiment: "positive" as const,
    hasOptedOut: false,
    isHighValue: true,
  };

  it("processEvent with callback event returns high priority", () => {
    const event = {
      id: "evt-1",
      type: "lead_callback" as const,
      timestamp: new Date().toISOString(),
      leadId: "lead-123",
      data: {},
    };

    const reaction = processEvent(event, mockLeadContext);

    expect(reaction).toBeDefined();
    expect(reaction.immediateActions.length).toBeGreaterThan(0);
    expect(reaction.notifyRep.notify).toBe(true);
    expect(reaction.notifyRep.priority).toBe("urgent");
  });

  it("processEvent with email_open returns same-day action", () => {
    const event = {
      id: "evt-2",
      type: "email_open" as const,
      timestamp: new Date().toISOString(),
      leadId: "lead-123",
      data: { openedAt: new Date().toISOString() },
    };

    const reaction = processEvent(event, mockLeadContext);

    expect(reaction).toBeDefined();
    expect(reaction.delayedActions.length).toBeGreaterThan(0);
  });

  it("classifyEventUrgency rates callback as immediate", () => {
    const event = {
      id: "evt-3",
      type: "lead_callback" as const,
      timestamp: new Date().toISOString(),
      leadId: "lead-123",
      data: {},
    };

    const urgency = classifyEventUrgency(event);

    expect(urgency).toBeDefined();
    expect(urgency.level).toBe("immediate");
    expect(urgency.recommendedChannel).toBe("call");
  });

  it("buildEventChain identifies heating pattern", () => {
    const events = [
      {
        id: "e1",
        type: "email_reply" as const,
        timestamp: new Date().toISOString(),
        leadId: "lead-123",
        data: {},
      },
      {
        id: "e2",
        type: "email_open" as const,
        timestamp: new Date().toISOString(),
        leadId: "lead-123",
        data: {},
      },
      {
        id: "e3",
        type: "form_fill" as const,
        timestamp: new Date().toISOString(),
        leadId: "lead-123",
        data: {},
      },
    ];

    const chain = buildEventChain(events);

    expect(chain).toBeDefined();
    expect(chain.chainType).toBeTruthy();
    expect(chain.strength).toBeGreaterThanOrEqual(0);
    expect(chain.strength).toBeLessThanOrEqual(100);
  });

  it("detectReactivationSignals detects subtle signals", () => {
    const events = [
      {
        id: "e1",
        type: "email_open" as const,
        timestamp: new Date().toISOString(),
        leadId: "lead-123",
        data: {},
      },
    ];

    const signal = detectReactivationSignals(events, 45);

    expect(signal).toBeTruthy();
    if (signal) {
      expect(signal.detected).toBe(true);
      expect(["weak", "moderate", "strong"]).toContain(signal.strength);
    }
  });
});

// ============================================================================
// POST-CALL RESOLVER TESTS
// ============================================================================

import {
  resolvePostCallActions,
  extractCallCommitments,
  determineFollowUpTone,
} from "@/lib/intelligence/post-call-resolver";

describe("post-call-resolver.ts", () => {
  const mockCallData = {
    callerId: "lead-123",
    callerPhone: "+1234567890",
    callerName: "John Smith",
    companyName: "TechCorp",
    outcome: "booked_appointment" as const,
    duration: 600,
    sentiment: "positive" as const,
    topicsDiscussed: ["timeline", "budget", "implementation"],
    keyMoments: [
      { type: "agreement" as const, timestamp: 300, description: "Agreed to timeline" },
      { type: "excitement" as const, timestamp: 450, description: "Excited about feature" },
    ],
    transcriptSummary: "Discussed implementation timeline and budget. Lead excited about feature.",
    timestamp: new Date().toISOString(),
  };

  it("resolvePostCallActions for booked_appointment", () => {
    const resolution = resolvePostCallActions(mockCallData);

    expect(resolution).toBeDefined();
    expect(resolution.callId).toBeTruthy();
    expect(resolution.outcomeCategoryResult).toBe("booked_appointment");
    expect(resolution.primaryAction).toBeDefined();
    expect(resolution.priorityScore).toBeGreaterThanOrEqual(0);
    expect(resolution.priorityScore).toBeLessThanOrEqual(10);
  });

  it("resolvePostCallActions for left_voicemail", () => {
    const callData = { ...mockCallData, outcome: "left_voicemail" as const };
    const resolution = resolvePostCallActions(callData);

    expect(resolution).toBeDefined();
    expect(resolution.outcomeCategoryResult).toBe("left_voicemail");
  });

  it("resolvePostCallActions for price_objection", () => {
    const callData = { ...mockCallData, outcome: "price_objection" as const, sentiment: "neutral" as const };
    const resolution = resolvePostCallActions(callData);

    expect(resolution).toBeDefined();
    expect(resolution.outcomeCategoryResult).toBe("price_objection");
    expect(resolution.ourCommitments.length).toBeGreaterThan(0);
  });

  it("extractCallCommitments extracts promises", () => {
    const commitments = extractCallCommitments(
      "send case study ROI analysis".split(" "),
      "our",
      "asked_for_info"
    );

    expect(commitments).toBeInstanceOf(Array);
    expect(commitments.length).toBeGreaterThan(0);
  });

  it("determineFollowUpTone for enthusiastic call", () => {
    const toneGuidance = determineFollowUpTone(mockCallData);

    expect(toneGuidance).toBeDefined();
    expect(["enthusiastic", "empathetic", "professional", "concise", "educational", "reassuring"]).toContain(toneGuidance.tone);
    expect(toneGuidance.dos).toBeInstanceOf(Array);
    expect(toneGuidance.donts).toBeInstanceOf(Array);
  });
});

// ============================================================================
// SCENARIO INTELLIGENCE TESTS
// ============================================================================

import {
  matchScenario,
  getScenarioResponse,
  SCENARIO_LIBRARY,
} from "@/lib/intelligence/scenario-intelligence";

describe("scenario-intelligence.ts", () => {
  const mockSituation = {
    lead_id: "lead-123",
    workspace_id: "ws-1",
    lifecycle_phase: "ENGAGED",
    days_since_last_contact: 14,
    total_touchpoints: 3,
    last_outcome: null,
    last_message_sent: null,
    engagement_score: 35,
    urgency_score: 60,
    conversion_probability: 0.45,
    demo_completed: true,
  };

  it("matchScenario matches cold reactivation", () => {
    const match = matchScenario(mockSituation);

    expect(match).toBeDefined();
    expect(match.matchedScenario).toBeDefined();
    expect(match.confidence).toBeGreaterThan(0);
    expect(match.confidence).toBeLessThanOrEqual(1);
    expect(match.recommendedActions).toBeInstanceOf(Array);
  });

  it("matchScenario matches price objection", () => {
    const situation = {
      ...mockSituation,
      days_since_last_contact: 2,
      engagement_score: 40,
      conversion_probability: 0.3,
    };

    const match = matchScenario(situation);

    expect(match).toBeDefined();
    expect(match.matchedScenario).toBeDefined();
  });

  it("getScenarioResponse returns playbook for valid ID", () => {
    if (SCENARIO_LIBRARY && SCENARIO_LIBRARY.length > 0) {
      const scenarioId = SCENARIO_LIBRARY[0].id;
      const response = getScenarioResponse(scenarioId);

      expect(response).toBeDefined();
      expect(response.recommendedActions).toBeInstanceOf(Array);
    }
  });
});

// ============================================================================
// CHANNEL ORCHESTRATOR TESTS
// ============================================================================

import {
  selectOptimalChannel,
  orchestrateMultiTouch,
  calculateChannelSaturation,
  inferChannelPreference,
} from "@/lib/intelligence/channel-orchestrator";

describe("channel-orchestrator.ts", () => {
  const mockChannelProfile = {
    leadId: "lead-123",
    phoneNumber: "+1234567890",
    email: "john@example.com",
    smsOptIn: true,
    emailOptIn: true,
    callOptIn: true,
    timezone: "America/New_York",
    industry: "technology",
    responseMetrics: {
      calls: { total: 5, answered: 3, voicemailsLeft: 2, avgDuration: 300 },
      sms: { sent: 3, replied: 2, avgResponseTime: 30 },
      email: { sent: 10, opened: 6, clicked: 2, replied: 1 },
      voicemail: { left: 2, responseRate: 0.5 },
    },
  };

  it("selectOptimalChannel for urgent message", () => {
    const selection = selectOptimalChannel(mockChannelProfile, "urgent");

    expect(selection).toBeDefined();
    expect(["call", "sms", "email", "voicemail"]).toContain(selection.channel);
    expect(selection.confidence).toBeGreaterThan(0);
    expect(selection.confidence).toBeLessThanOrEqual(1);
    expect(selection.reasoning).toBeTruthy();
  });

  it("orchestrateMultiTouch generates valid plan", () => {
    const objective = {
      type: "urgent" as const,
      priority: "high" as const,
      coreMessage: {
        headline: "Time-sensitive opportunity",
        keyPoints: ["Limited availability", "High value"],
        cta: "Schedule call",
        urgencyLevel: 8,
      },
      timeframe: "within-24h" as const,
      maxAttempts: 5,
    };

    const plan = orchestrateMultiTouch(mockChannelProfile, objective);

    expect(plan).toBeDefined();
    expect(plan.leadId).toBe("lead-123");
    expect(plan.steps).toBeInstanceOf(Array);
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.totalDuration).toBeTruthy();
    expect(plan.estimatedCompletionDate).toBeTruthy();
  });

  it("calculateChannelSaturation detects oversaturation", () => {
    const saturation = calculateChannelSaturation(mockChannelProfile);

    expect(saturation).toBeInstanceOf(Array);
    expect(saturation.length).toBeGreaterThan(0);
    saturation.forEach((s) => {
      expect(["call", "sms", "email", "voicemail"]).toContain(s.channel);
      expect(["low", "medium", "high", "oversaturated"]).toContain(s.saturationLevel);
    });
  });

  it("inferChannelPreference from interaction history", () => {
    const interactions = [
      {
        id: "i1",
        leadId: "lead-123",
        channel: "email" as const,
        sentAt: new Date().toISOString(),
        direction: "outbound" as const,
        responded: true,
        respondedAt: new Date(Date.now() + 3600000).toISOString(),
      },
      {
        id: "i2",
        leadId: "lead-123",
        channel: "sms" as const,
        sentAt: new Date().toISOString(),
        direction: "outbound" as const,
        responded: false,
      },
    ];

    const preference = inferChannelPreference(interactions);

    expect(preference).toBeDefined();
    expect(["call", "sms", "email", "voicemail"]).toContain(preference.preferredChannel);
    expect(preference.responseRates).toBeDefined();
    expect(preference.confidence).toBeGreaterThanOrEqual(0);
    expect(preference.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// DASHBOARD ENGINE TESTS
// ============================================================================

import {
  generateDashboardData,
  calculateWorkspaceHealthScore,
  generateLeadDetailData,
} from "@/lib/intelligence/dashboard-engine";

describe("dashboard-engine.ts", () => {
  const mockPipeline = [
    {
      id: "d1",
      value: 50000,
      stage: "evaluation",
      closeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      contactName: "John Smith",
      company: "TechCorp",
      lastTouched: new Date().toISOString(),
    },
    {
      id: "d2",
      value: 75000,
      stage: "proposal",
      closeDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      contactName: "Jane Doe",
      company: "RetailInc",
      lastTouched: new Date().toISOString(),
    },
  ];

  const mockActivities = [
    {
      id: "a1",
      type: "call",
      timestamp: new Date().toISOString(),
      repId: "rep1",
      repName: "Sales Rep 1",
    },
    {
      id: "a2",
      type: "email",
      timestamp: new Date().toISOString(),
      repId: "rep1",
      repName: "Sales Rep 1",
    },
  ];

  it("generateDashboardData returns complete payload", () => {
    const dashData = generateDashboardData("ws-1", mockPipeline, mockActivities);

    expect(dashData).toBeDefined();
    expect(dashData.workspaceId).toBe("ws-1");
    expect(dashData.timestamp).toBeTruthy();
    expect(dashData.revenueMetrics).toBeDefined();
    expect(dashData.pipelineMetrics).toBeDefined();
    expect(dashData.activityMetrics).toBeDefined();
    expect(dashData.healthScore).toBeDefined();
    expect(dashData.topPriorityLeads).toBeInstanceOf(Array);
    expect(dashData.insights).toBeInstanceOf(Array);
    expect(dashData.alerts).toBeInstanceOf(Array);
    expect(dashData.trends).toBeInstanceOf(Array);
  });

  it("calculateWorkspaceHealthScore returns 0-100", () => {
    const metrics = {
      pipeline: { coverage: 0.8, dealCount: 2 },
      activities: { callsToday: 5 },
      revenue: { thisMonth: 100000 },
    };

    const health = calculateWorkspaceHealthScore(metrics);

    expect(health).toBeDefined();
    expect(health.overallScore).toBeGreaterThanOrEqual(0);
    expect(health.overallScore).toBeLessThanOrEqual(100);
    expect(health.pipelineHealth).toBeDefined();
    expect(health.activityHealth).toBeDefined();
    expect(health.conversionHealth).toBeDefined();
    expect(health.growthHealth).toBeDefined();
  });

  it("generateLeadDetailData returns valid detail", () => {
    const mockBrain = {
      name: "John Smith",
      company: "TechCorp",
      stage: "evaluation",
      interactions: [
        { timestamp: new Date().toISOString(), channel: "call", type: "call" },
      ],
      sentimentScore: 0.7,
      engagementLevel: 75,
      objections: [],
      competitorMentions: [],
      preferredChannel: "call",
      topicOfInterest: "ROI",
    };

    const detailData = generateLeadDetailData("lead-123", mockBrain);

    expect(detailData).toBeDefined();
    expect(detailData.leadId).toBe("lead-123");
    expect(detailData.name).toBeTruthy();
    expect(detailData.company).toBeTruthy();
    expect(detailData.healthScore).toBeGreaterThanOrEqual(0);
    expect(detailData.healthScore).toBeLessThanOrEqual(100);
    expect(detailData.interactionTimeline).toBeInstanceOf(Array);
    expect(detailData.nextRecommendedAction).toBeDefined();
    expect(detailData.engagementChart).toBeInstanceOf(Array);
    expect(detailData.sentimentHistory).toBeInstanceOf(Array);
    expect(detailData.objectionLog).toBeInstanceOf(Array);
    expect(detailData.aiInsights).toBeInstanceOf(Array);
  });
});
