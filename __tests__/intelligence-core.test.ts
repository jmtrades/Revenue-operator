/**
 * Comprehensive tests for core intelligence modules
 * Tests lead-brain, contextual-action-engine, and lead-lifecycle-machine
 */

import { describe, it, expect, beforeEach } from "vitest";

// Lead Brain imports
import {
  buildLeadBrain,
  computeNextAction,
  updateBrain,
  assessLeadHealth,
  LeadInteraction,
  LeadEvent,
  LeadBrain,
  Sentiment,
} from "@/lib/intelligence/lead-brain";

// Contextual Action Engine imports
import {
  computeAction,
  batchComputeActions,
  evaluateActionOutcome,
  explainDecision,
  FullLeadContext,
  ActionTrigger,
  ComputedActionPlan,
  ExecutedAction,
  ActionOutcome,
} from "@/lib/intelligence/contextual-action-engine";

// Lead Lifecycle Machine imports
import {
  evaluateTransition,
  getStageRequirements,
  calculateStageHealth,
  generateTransitionMap,
  defineStagePlaybook,
  TransitionEvent,
  LeadStage,
} from "@/lib/intelligence/lead-lifecycle-machine";

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

const createMockInteraction = (overrides?: Partial<LeadInteraction>): LeadInteraction => ({
  id: "int-1",
  timestamp: new Date().toISOString(),
  channel: "call",
  outcome: "completed",
  duration: 300,
  sentiment: "positive",
  summary: "Initial discovery call",
  keyMoments: ["Discussed pain points", "Expressed interest"],
  questionsAsked: ["What's your timeline?", "Who else is involved?"],
  rapportBuilt: true,
  responsiveness: "immediate",
  engagementDepth: 8,
  ...overrides,
});

const createMockFullContext = (overrides?: Partial<FullLeadContext>): FullLeadContext => ({
  leadProfile: {
    leadId: "lead-123",
    name: "John Smith",
    company: "Acme Corp",
    industry: "Technology",
    timezone: "America/New_York",
    leadScore: 75,
    engagementScore: 80,
    conversionProbability: 0.65,
  },
  interactionHistory: {
    lastContactAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    lastOutcome: "connected",
    totalTouches: 5,
    touchesThisWeek: 2,
    hoursSinceLastContact: 2,
    recentlyResponded: true,
  },
  dealInfo: {
    stageName: "QUALIFYING",
    value: 50000,
    closeProbability: 0.6,
    daysInStage: 3,
  },
  workspaceSettings: {
    workspaceId: "ws-123",
    autonomyLevel: "assisted",
    maxTouchesPerWeek: 5,
    maxTouchesPerDay: 2,
    preferredChannels: ["call", "email"],
    timezone: "America/New_York",
  },
  ...overrides,
});

// ============================================================================
// LEAD BRAIN TESTS
// ============================================================================

describe("lead-brain.ts", () => {
  describe("buildLeadBrain", () => {
    it("should build a lead brain with empty interactions", () => {
      const brain = buildLeadBrain([]);

      expect(brain).toBeDefined();
      expect(brain.interactions).toHaveLength(0);
      expect(brain.interactionCount).toBe(0);
      expect(brain.trustScore).toBe(0);
      expect(brain.engagementScore).toBe(0);
      expect(brain.conversionProbability).toBe(0);
    });

    it("should build a lead brain with a single call interaction", () => {
      const interaction = createMockInteraction({
        channel: "call",
        outcome: "completed",
        engagementDepth: 8,
      });

      const brain = buildLeadBrain([interaction]);

      expect(brain.interactions).toHaveLength(1);
      expect(brain.interactionCount).toBe(1);
      expect(brain.behavioral.preferredChannel).toBe("call");
      expect(brain.trustScore).toBeGreaterThan(0);
      expect(brain.engagementScore).toBeGreaterThan(0);
    });

    it("should build a lead brain with mixed interactions (call, email, sms)", () => {
      const interactions: LeadInteraction[] = [
        createMockInteraction({
          id: "int-1",
          channel: "call",
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          engagementDepth: 8,
        }),
        createMockInteraction({
          id: "int-2",
          channel: "email",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          outcome: "email_opened",
          engagementDepth: 5,
        }),
        createMockInteraction({
          id: "int-3",
          channel: "sms",
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          outcome: "completed",
          engagementDepth: 6,
        }),
      ];

      const brain = buildLeadBrain(interactions);

      expect(brain.interactions).toHaveLength(3);
      expect(brain.interactionCount).toBe(3);
      expect(brain.behavioral.preferredChannel).toBe("call"); // Most frequent
      expect(brain.lastInteractionAt).toBe(interactions[2].timestamp);
    });

    it("should correctly identify behavioral patterns from interactions", () => {
      const now = Date.now();
      const interactions: LeadInteraction[] = [
        createMockInteraction({
          id: "int-1",
          timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
          engagementDepth: 5,
          responsiveness: "delayed",
        }),
        createMockInteraction({
          id: "int-2",
          timestamp: new Date(now - 20 * 60 * 60 * 1000).toISOString(),
          engagementDepth: 7,
          responsiveness: "immediate",
        }),
        createMockInteraction({
          id: "int-3",
          timestamp: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
          engagementDepth: 8,
          responsiveness: "immediate",
        }),
      ];

      const brain = buildLeadBrain(interactions);

      expect(brain.behavioral.engagementTrajectory).toBeDefined();
      expect(brain.behavioral.responsePatterns.typical).toBeDefined();
      expect(brain.behavioral.responsePatterns.responseRate).toBeGreaterThan(0);
    });
  });

  describe("computeNextAction", () => {
    it("should return wait action for brain with no interactions", () => {
      const brain = buildLeadBrain([]);
      const action = computeNextAction(brain);

      expect(action.action).toBe("wait");
      expect(action.channel).toBe("none");
      expect(action.timing.delayMinutes).toBe(1440); // 24 hours
    });

    it("should return valid action for hot lead (high score, recent contact)", () => {
      const interaction = createMockInteraction({
        outcome: "completed",
        sentiment: "positive",
        engagementDepth: 9,
      });

      const brain = buildLeadBrain([interaction]);
      brain.engagementScore = 85;
      brain.trustScore = 75;

      const action = computeNextAction(brain);

      expect(action).toBeDefined();
      expect(action.action).toBeDefined();
      expect(action.channel).toBeDefined();
      expect(action.timing).toBeDefined();
      expect(action.confidence).toBeGreaterThan(0);
      expect(action.confidence).toBeLessThanOrEqual(1);
    });

    it("should return valid action for cold lead (low engagement)", () => {
      const interaction = createMockInteraction({
        outcome: "no_answer",
        sentiment: "neutral",
        engagementDepth: 2,
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const brain = buildLeadBrain([interaction]);
      brain.engagementScore = 15;
      brain.trustScore = 30;

      const action = computeNextAction(brain);

      expect(action).toBeDefined();
      expect(action.action).toBe("light_value_add");
      expect(action.timing.delayMinutes).toBe(2880); // 48 hours
    });

    it("should de-escalate for frustrated lead", () => {
      const interaction = createMockInteraction({
        sentiment: "frustrated",
        outcome: "objection_raised",
        engagementDepth: 4,
      });

      const brain = buildLeadBrain([interaction]);
      brain.emotional.frustrationLevel = 8;
      brain.emotional.sentiment = "frustrated";

      const action = computeNextAction(brain);

      expect(action.action).toBe("send_value_content");
      expect(action.messageContext.tone).toContain("empathetic");
    });

    it("should handle appointment booked outcome", () => {
      const interaction = createMockInteraction({
        outcome: "appointment_booked",
        engagementDepth: 9,
      });

      const brain = buildLeadBrain([interaction]);

      const action = computeNextAction(brain);

      expect(action.action).toBe("send_confirmation");
      expect(action.channel).toBeDefined();
    });

    it("should handle promise made by us", () => {
      const interaction = createMockInteraction({
        outcome: "promise_made",
        promiseFrom: "us",
        promiseMade: "Send pricing information",
        engagementDepth: 7,
      });

      const brain = buildLeadBrain([interaction]);

      const action = computeNextAction(brain);

      expect(action.action).toBe("fulfill_promise");
      expect(action.timing.immediate).toBe(true);
    });

    it("should handle opt-out request by returning appropriate action", () => {
      const interaction = createMockInteraction({
        outcome: "no_answer",
        sentiment: "negative",
      });

      const brain = buildLeadBrain([interaction]);
      brain.emotional.sentiment = "negative";
      brain.emotional.frustrationLevel = 9;

      const action = computeNextAction(brain);

      expect(action).toBeDefined();
      expect(action.confidence).toBeGreaterThan(0);
    });
  });

  describe("updateBrain", () => {
    it("should process new event correctly", () => {
      const interaction = createMockInteraction();
      const brain = buildLeadBrain([interaction]);

      const newInteraction = createMockInteraction({
        id: "int-2",
        timestamp: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        outcome: "promise_made",
      });

      const newEvent: LeadEvent = {
        id: "evt-1",
        timestamp: newInteraction.timestamp,
        type: "interaction",
        interaction: newInteraction,
      };

      const updatedBrain = updateBrain(brain, newEvent);

      expect(updatedBrain.interactions).toHaveLength(2);
      expect(updatedBrain.events).toHaveLength(1);
      expect(updatedBrain.interactionCount).toBe(2);
      expect(updatedBrain.lastInteractionAt).toBe(newInteraction.timestamp);
    });

    it("should recalculate scores after new event", () => {
      const interaction = createMockInteraction();
      const brain = buildLeadBrain([interaction]);
      const originalScore = brain.engagementScore;

      const newInteraction = createMockInteraction({
        id: "int-2",
        timestamp: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        engagementDepth: 9,
        sentiment: "enthusiastic",
      });

      const newEvent: LeadEvent = {
        id: "evt-1",
        timestamp: newInteraction.timestamp,
        type: "interaction",
        interaction: newInteraction,
      };

      const updatedBrain = updateBrain(brain, newEvent);

      expect(updatedBrain.engagementScore).toBeGreaterThanOrEqual(originalScore);
    });
  });

  describe("assessLeadHealth", () => {
    it("should return 'thriving' for highly engaged lead in decision stage", () => {
      const interaction = createMockInteraction({
        sentiment: "positive",
        engagementDepth: 9,
      });

      const brain = buildLeadBrain([interaction]);
      brain.relationship.buyingStage = "decision";
      brain.conversionProbability = 0.85;
      brain.trustScore = 85;

      const assessment = assessLeadHealth(brain);

      expect(assessment.overallHealth).toBe("thriving");
      expect(assessment.opportunitySignals).toContain("in_active_buying_stage");
    });

    it("should return 'cold' for lead with no recent activity", () => {
      const interaction = createMockInteraction({
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        sentiment: "neutral",
        engagementDepth: 3,
      });

      const brain = buildLeadBrain([interaction]);
      brain.emotional.sentiment = "neutral";
      brain.behavioral.engagementTrajectory = "stable"; // Not declining, just silent

      const assessment = assessLeadHealth(brain);

      expect(assessment.overallHealth).toBe("cold");
      expect(assessment.riskFactors).toContain("cold_no_contact_7days");
    });

    it("should return 'dead' for cold lead with very low conversion probability", () => {
      const interaction = createMockInteraction({
        timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        sentiment: "negative",
        engagementDepth: 1,
      });

      const brain = buildLeadBrain([interaction]);
      brain.conversionProbability = 0.1;
      brain.trustScore = 15;

      const assessment = assessLeadHealth(brain);

      expect(assessment.overallHealth).toBe("dead");
      expect(assessment.riskFactors).toContain("stale_no_contact_30days");
    });

    it("should detect competitor mentions as risk", () => {
      const interaction = createMockInteraction();
      const brain = buildLeadBrain([interaction]);
      brain.business.competitorMentions = [
        {
          competitor: "Competitor X",
          context: "They mentioned evaluating Competitor X",
          mentionedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const assessment = assessLeadHealth(brain);

      expect(assessment.riskFactors).toContain("competitor_actively_mentioned");
    });

    it("should recommend immediate action for lead in decision stage", () => {
      const interaction = createMockInteraction({
        sentiment: "positive",
        engagementDepth: 9,
      });

      const brain = buildLeadBrain([interaction]);
      brain.relationship.buyingStage = "decision";

      const assessment = assessLeadHealth(brain);

      expect(assessment.recommendedUrgency).toBe("immediate");
      expect(assessment.daysToNextAction).toBe(0);
    });

    it("should include trust-building recommendation for low trust score", () => {
      const interaction = createMockInteraction();
      const brain = buildLeadBrain([interaction]);
      brain.trustScore = 25;

      const assessment = assessLeadHealth(brain);

      expect(assessment.keyRecommendations.some((r) => r.includes("trust"))).toBe(true);
    });
  });
});

// ============================================================================
// CONTEXTUAL ACTION ENGINE TESTS
// ============================================================================

describe("contextual-action-engine.ts", () => {
  describe("computeAction", () => {
    it("should compute action with call_completed trigger", async () => {
      const context = createMockFullContext();
      const trigger = {
        type: "call_completed" as const,
        callId: "call-123",
        duration: 600,
        outcome: "connected",
        sentiment: "positive",
      };

      const plan = await computeAction("lead-123", trigger, context);

      expect(plan).toBeDefined();
      expect(plan.leadId).toBe("lead-123");
      expect(plan.trigger).toEqual(trigger);
      expect(plan.computedAt).toBeDefined();
      expect(plan.primaryAction).toBeDefined();
      expect(plan.confidence).toBeGreaterThan(0);
    });

    it("should compute action with event_received trigger", async () => {
      const context = createMockFullContext();
      const trigger = {
        type: "event_received" as const,
        eventType: "form" as const,
        eventData: { form_type: "pricing_request" },
        receivedAt: new Date().toISOString(),
      };

      const plan = await computeAction("lead-123", trigger, context);

      expect(plan).toBeDefined();
      expect(plan.trigger.type).toBe("event_received");
    });

    it("should compute action with manual_request trigger", async () => {
      const context = createMockFullContext();
      const trigger = {
        type: "manual_request" as const,
        repId: "rep-456",
        reason: "Need follow-up before meeting",
      };

      const plan = await computeAction("lead-123", trigger, context);

      expect(plan).toBeDefined();
      expect(plan.trigger.type).toBe("manual_request");
    });

    it("should include secondary actions and alternatives", async () => {
      const context = createMockFullContext();
      const trigger = { type: "scheduled_check" as const };

      const plan = await computeAction("lead-123", trigger, context);

      expect(plan.secondaryActions).toBeDefined();
      expect(Array.isArray(plan.secondaryActions)).toBe(true);
      expect(plan.alternatives).toBeDefined();
      expect(plan.alternatives.plan_b).toBeDefined();
      expect(plan.alternatives.plan_c).toBeDefined();
    });

    it("should respect fatigue constraints", async () => {
      const context = createMockFullContext({
        interactionHistory: {
          ...createMockFullContext().interactionHistory,
          touchesThisWeek: 5, // At max
        },
      });
      const trigger = { type: "scheduled_check" as const };

      const plan = await computeAction("lead-123", trigger, context);

      expect(plan.riskFlags).toContain("fatigue_exceeded");
      expect(plan.primaryAction.type).toBe("email"); // Should use lighter channel
    });
  });

  describe("batchComputeActions", () => {
    it("should compute actions for multiple leads", async () => {
      const leads = [
        {
          leadId: "lead-1",
          context: createMockFullContext({
            leadProfile: {
              ...createMockFullContext().leadProfile,
              leadId: "lead-1",
              company: "Acme Corp"
            }
          }),
          trigger: { type: "scheduled_check" as const },
          priority: "high" as const,
        },
        {
          leadId: "lead-2",
          context: createMockFullContext({
            leadProfile: {
              ...createMockFullContext().leadProfile,
              leadId: "lead-2",
              company: "Zenith Inc"
            }
          }),
          trigger: { type: "scheduled_check" as const },
          priority: "medium" as const,
        },
      ];

      const plans = await batchComputeActions(leads);

      expect(plans).toHaveLength(2);
      expect(plans[0].leadId).toBe("lead-1");
      expect(plans[1].leadId).toBe("lead-2");
    });

    it("should prioritize by explicit priority", async () => {
      const leads = [
        {
          leadId: "low-priority",
          context: createMockFullContext({
            leadProfile: {
              ...createMockFullContext().leadProfile,
              company: "Company A"
            }
          }),
          trigger: { type: "scheduled_check" as const },
          priority: "low" as const,
        },
        {
          leadId: "critical-priority",
          context: createMockFullContext({
            leadProfile: {
              ...createMockFullContext().leadProfile,
              company: "Company B"
            }
          }),
          trigger: { type: "scheduled_check" as const },
          priority: "critical" as const,
        },
      ];

      const plans = await batchComputeActions(leads);

      expect(plans).toHaveLength(2);
      expect(plans[0].leadId).toBe("critical-priority");
      expect(plans[1].leadId).toBe("low-priority");
    });
  });

  describe("evaluateActionOutcome", () => {
    it("should evaluate effective action", () => {
      const action: ExecutedAction = {
        actionId: "act-1",
        leadId: "lead-1",
        plan: {
          leadId: "lead-1",
          trigger: { type: "scheduled_check" as const },
          computedAt: new Date().toISOString(),
          primaryAction: { type: "call", channel: "voice", timing: "immediate" },
          secondaryActions: [],
          contextForAction: {
            referenceBehaviors: [],
            avoidTopics: [],
            tone: "consultative",
            personalizationHints: {},
          },
          reasoning: "Test",
          confidence: 0.8,
          riskFlags: [],
          alternatives: { plan_b: null, plan_c: null },
          metrics: {
            expectedOutcomeTypes: ["connected", "no_answer"],
            expectedValue: 50000,
            successProbability: 0.7,
          },
        },
        actionTaken: { type: "call", channel: "voice", timing: "immediate" },
        executedAt: new Date().toISOString(),
        outcome: "connected",
        notes: "Lead answered and engaged",
      };

      const feedback = evaluateActionOutcome("lead-1", action, { outcome: "connected" });

      expect(feedback.effective).toBe(true);
      expect(feedback.confidence).toBeGreaterThan(0.5);
      expect(feedback.learnings).toBeDefined();
    });

    it("should evaluate ineffective action", () => {
      const action: ExecutedAction = {
        actionId: "act-1",
        leadId: "lead-1",
        plan: {
          leadId: "lead-1",
          trigger: { type: "scheduled_check" as const },
          computedAt: new Date().toISOString(),
          primaryAction: { type: "call", channel: "voice", timing: "immediate" },
          secondaryActions: [],
          contextForAction: {
            referenceBehaviors: [],
            avoidTopics: [],
            tone: "consultative",
            personalizationHints: {},
          },
          reasoning: "Test",
          confidence: 0.8,
          riskFlags: [],
          alternatives: { plan_b: null, plan_c: null },
          metrics: {
            expectedOutcomeTypes: ["connected"],
            expectedValue: 50000,
            successProbability: 0.7,
          },
        },
        actionTaken: { type: "call", channel: "voice", timing: "immediate" },
        executedAt: new Date().toISOString(),
        outcome: "no_answer",
        notes: "No answer",
      };

      const feedback = evaluateActionOutcome("lead-1", action, { outcome: "no_answer" });

      expect(feedback.effective).toBe(false);
      expect(feedback.confidence).toBeLessThan(0.5);
      expect(feedback.adjustments.suggestedChannelChange).toBe("sms");
    });
  });

  describe("explainDecision", () => {
    it("should return human-readable explanation", async () => {
      const context = createMockFullContext();
      const trigger = { type: "scheduled_check" as const };
      const plan = await computeAction("lead-123", trigger, context);

      const explanation = explainDecision(plan);

      expect(explanation).toBeDefined();
      expect(explanation.summary).toBeDefined();
      expect(explanation.factors).toBeDefined();
      expect(Array.isArray(explanation.factors)).toBe(true);
      expect(explanation.factors.length).toBeGreaterThan(0);
      expect(explanation.precedents).toBeDefined();
    });
  });
});

// ============================================================================
// LEAD LIFECYCLE MACHINE TESTS
// ============================================================================

describe("lead-lifecycle-machine.ts", () => {
  describe("evaluateTransition", () => {
    it("should transition from NEW to CONTACTED on initial call", () => {
      const event: TransitionEvent = {
        type: "call",
        timestamp: new Date(),
        metadata: {
          daysInStage: 0,
          engagementScore: 50,
        },
      };

      const result = evaluateTransition("NEW", event);

      expect(result.newStage).toBe("CONTACTED");
      expect(result.transitioned).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should transition from QUALIFIED to AT_RISK when silent for 7+ days", () => {
      const event: TransitionEvent = {
        type: "silence",
        timestamp: new Date(),
        metadata: {
          daysInStage: 7,
          engagementScore: 40,
        },
      };

      const result = evaluateTransition("QUALIFIED", event);

      expect(result.newStage).toBe("AT_RISK");
      expect(result.transitioned).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should transition from LOST to WINBACK on positive signal", () => {
      const event: TransitionEvent = {
        type: "signal",
        timestamp: new Date(),
        metadata: {
          reason: "competitor_failure",
          daysInStage: 30,
          engagementScore: 30,
        },
      };

      const result = evaluateTransition("LOST", event);

      expect(result.newStage).toBe("WINBACK");
      expect(result.transitioned).toBe(true);
    });

    it("should transition from NURTURE to RE_ENGAGING on positive response", () => {
      const event: TransitionEvent = {
        type: "response",
        timestamp: new Date(),
        metadata: {
          sentiment: "positive",
          daysInStage: 30,
          engagementScore: 60,
        },
      };

      const result = evaluateTransition("NURTURE", event);

      expect(result.newStage).toBe("RE_ENGAGING");
      expect(result.transitioned).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should NOT transition when criteria not met", () => {
      const event: TransitionEvent = {
        type: "call",
        timestamp: new Date(),
        metadata: {
          daysInStage: 2,
          engagementScore: 30,
        },
      };

      const result = evaluateTransition("NURTURE", event);

      expect(result.transitioned).toBe(false);
      expect(result.newStage).toBe("NURTURE");
    });
  });

  describe("getStageRequirements", () => {
    it("should return valid requirements for NEW stage", () => {
      const reqs = getStageRequirements("NEW");

      expect(reqs).toBeDefined();
      expect(reqs.stage).toBe("NEW");
      expect(reqs.mustHaveTrue).toBeDefined();
      expect(Array.isArray(reqs.mustHaveTrue)).toBe(true);
      expect(reqs.toProgressTo).toBeDefined();
      expect(reqs.benchmarkDaysInStage).toBeGreaterThanOrEqual(0);
    });

    it("should return valid requirements for each stage", () => {
      const stages: LeadStage[] = [
        "NEW",
        "CONTACTED",
        "ENGAGED",
        "QUALIFYING",
        "QUALIFIED",
        "DEMO_SCHEDULED",
        "DEMO_COMPLETED",
        "PROPOSAL_SENT",
        "NEGOTIATING",
        "CLOSING",
        "WON",
        "NURTURE",
        "RE_ENGAGING",
        "AT_RISK",
        "LOST",
        "DISQUALIFIED",
        "CHURNED",
        "WINBACK",
      ];

      stages.forEach((stage) => {
        const reqs = getStageRequirements(stage);
        expect(reqs).toBeDefined();
        expect(reqs.stage).toBe(stage);
        expect(reqs.mustHaveTrue).toBeDefined();
        expect(reqs.mustBeFalse).toBeDefined();
      });
    });
  });

  describe("calculateStageHealth", () => {
    it("should return warning for stale leads (no activity)", () => {
      const lastActivity = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const health = calculateStageHealth("QUALIFIED", 7, lastActivity, 45);

      expect(health).toBeDefined();
      expect(health.stage).toBe("QUALIFIED");
      expect(health.healthStatus).toBe("warning");
      expect(health.activityRecency).toBeGreaterThan(7);
    });

    it("should return healthy status for recently active lead", () => {
      const lastActivity = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      const health = calculateStageHealth("QUALIFIED", 2, lastActivity, 75);

      expect(health.healthStatus).toBe("healthy");
      expect(health.score).toBeGreaterThan(60);
    });

    it("should return critical status for overdue leads", () => {
      const lastActivity = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const health = calculateStageHealth("DEMO_SCHEDULED", 20, lastActivity, 20);

      expect(health.healthStatus).toBe("critical");
      expect(health.recommendation).toContain("action");
    });
  });

  describe("generateTransitionMap", () => {
    it("should return valid options for NEW stage", () => {
      const options = generateTransitionMap("NEW");

      expect(options).toBeDefined();
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
      options.forEach((opt) => {
        expect(opt.nextStage).toBeDefined();
        expect(opt.probability).toBeGreaterThan(0);
        expect(opt.probability).toBeLessThanOrEqual(1);
        expect(opt.triggeringEvent).toBeDefined();
        expect(opt.recommendedAction).toBeDefined();
      });
    });

    it("should return valid options for each stage", () => {
      const stages: LeadStage[] = [
        "CONTACTED",
        "ENGAGED",
        "QUALIFYING",
        "QUALIFIED",
        "AT_RISK",
        "LOST",
      ];

      stages.forEach((stage) => {
        const options = generateTransitionMap(stage);
        expect(Array.isArray(options)).toBe(true);
        options.forEach((opt) => {
          expect(opt.probability).toBeGreaterThanOrEqual(0);
          expect(opt.probability).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe("defineStagePlaybook", () => {
    it("should return valid playbook for NEW stage", () => {
      const playbook = defineStagePlaybook("NEW");

      expect(playbook).toBeDefined();
      expect(playbook.stage).toBe("NEW");
      expect(playbook.communicationFrequency).toBeDefined();
      expect(playbook.preferredChannels).toBeDefined();
      expect(Array.isArray(playbook.preferredChannels)).toBe(true);
      expect(playbook.contentStrategy).toBeDefined();
      expect(playbook.keyQuestions).toBeDefined();
      expect(playbook.exitCriteria).toBeDefined();
    });

    it("should return valid playbook for DEMO_SCHEDULED stage", () => {
      const playbook = defineStagePlaybook("DEMO_SCHEDULED");

      expect(playbook.stage).toBe("DEMO_SCHEDULED");
      expect(playbook.contentStrategy).toBe("validation");
      expect(playbook.communicationFrequency).toBeDefined();
    });

    it("should return valid playbook for WON stage", () => {
      const playbook = defineStagePlaybook("WON");

      expect(playbook.stage).toBe("WON");
      expect(playbook.expectedOutcome).toBeDefined();
    });
  });
});
