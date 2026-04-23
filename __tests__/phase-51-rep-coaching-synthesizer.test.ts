/**
 * Phase 51 — Rep coaching synthesizer.
 */
import { describe, it, expect } from "vitest";
import {
  synthesizeCoachingPlan,
  aggregateTeamCoaching,
  type CoachingInput,
  type TalkRatioAggregate,
  type PlaybookAggregate,
  type DealSignalSummary,
} from "../src/lib/sales/rep-coaching-synthesizer";
import type { RepScorecard } from "../src/lib/sales/rep-scorecard";

const WINDOW_START = "2026-04-01T00:00:00.000Z";
const WINDOW_END = "2026-04-22T00:00:00.000Z";

function scorecard(over: Partial<RepScorecard> = {}): RepScorecard {
  return {
    repId: "r1",
    repName: "Jamie Rep",
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
    compositeScore: 72,
    grade: "C",
    dimensions: { activity: 70, quality: 70, outcomes: 70, compliance: 80 },
    coachingFlags: [],
    metrics: {
      connectRate: 0.25,
      emailReplyRate: 0.1,
      smsReplyRate: 0.08,
      emailBounceRate: 0.02,
      meetingShowRate: 0.8,
      opportunityWinRate: 0.25,
      optOutRate: 0.01,
      activityPerDay: 40,
      quotaAttainment: 0.7,
    },
    ...over,
  };
}

function talk(over: Partial<TalkRatioAggregate> = {}): TalkRatioAggregate {
  return {
    callsSampled: 12,
    avgRepTalkShare: 0.5,
    avgProspectTalkShare: 0.5,
    avgLongestMonologueSeconds: 30,
    avgQuestionsPerCall: 10,
    avgInterruptions: 1,
    avgFillerDensity: 0.02,
    balancedCallsPct: 0.7,
    ...over,
  };
}

function playbook(over: Partial<PlaybookAggregate> = {}): PlaybookAggregate {
  return {
    callsSampled: 12,
    avgScore: 80,
    sectionCoverage: [],
    commonMisses: [],
    ...over,
  };
}

function deals(over: Partial<DealSignalSummary> = {}): DealSignalSummary {
  return {
    dealsInCycle: 10,
    dealsClosedWon: 3,
    dealsClosedLost: 2,
    dealsStalled: 1,
    avgStagePushCount: 0.3,
    topLossReasons: [],
    topWinReasons: ["strong champion"],
    ...over,
  };
}

function baseInput(over: Partial<CoachingInput> = {}): CoachingInput {
  return {
    rep: { id: "r1", name: "Jamie Rep", tenureMonths: 12 },
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
    scorecard: scorecard(),
    talkRatio: talk(),
    playbook: playbook(),
    dealSignals: deals(),
    ...over,
  };
}

describe("synthesizeCoachingPlan — focus detection", () => {
  it("detects talk_balance when rep dominates talk share", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({ talkRatio: talk({ avgRepTalkShare: 0.8 }) }),
    );
    expect(plan.focusAreas.some((f) => f.category === "talk_balance")).toBe(true);
  });

  it("detects discovery_quality when questions are low", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({ talkRatio: talk({ avgQuestionsPerCall: 3 }) }),
    );
    expect(plan.focusAreas.some((f) => f.category === "discovery_quality")).toBe(true);
  });

  it("detects qualification_rigor when playbook score is low", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({ playbook: playbook({ avgScore: 40, commonMisses: ["budget", "timeline"] }) }),
    );
    expect(plan.focusAreas.some((f) => f.category === "qualification_rigor")).toBe(true);
  });

  it("detects activity_volume when scorecard activity dimension is weak", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({ scorecard: scorecard({ dimensions: { activity: 25, quality: 70, outcomes: 70, compliance: 80 } }) }),
    );
    expect(plan.focusAreas.some((f) => f.category === "activity_volume")).toBe(true);
  });

  it("detects compliance when scorecard compliance dimension is weak", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({ scorecard: scorecard({ dimensions: { activity: 70, quality: 70, outcomes: 70, compliance: 40 } }) }),
    );
    expect(plan.focusAreas.some((f) => f.category === "compliance")).toBe(true);
  });

  it("detects multi_threading when loss reasons mention stakeholders", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({
        dealSignals: deals({ topLossReasons: ["single-threaded champion left"] }),
      }),
    );
    expect(plan.focusAreas.some((f) => f.category === "multi_threading")).toBe(true);
  });

  it("detects pricing_discipline when loss reasons mention price", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({
        dealSignals: deals({ topLossReasons: ["too expensive", "bigger discount from competitor"] }),
      }),
    );
    expect(plan.focusAreas.some((f) => f.category === "pricing_discipline")).toBe(true);
  });

  it("detects close_discipline on repeated stage pushes", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({ dealSignals: deals({ avgStagePushCount: 1.8 }) }),
    );
    expect(plan.focusAreas.some((f) => f.category === "close_discipline")).toBe(true);
  });

  it("detects followup_consistency on high stall ratio", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({ dealSignals: deals({ dealsInCycle: 10, dealsStalled: 4 }) }),
    );
    expect(plan.focusAreas.some((f) => f.category === "followup_consistency")).toBe(true);
  });
});

describe("synthesizeCoachingPlan — ordering & capping", () => {
  it("focusAreas ordered by weight desc", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({
        talkRatio: talk({ avgRepTalkShare: 0.9, avgQuestionsPerCall: 2, avgFillerDensity: 0.1 }),
        dealSignals: deals({ dealsStalled: 6, avgStagePushCount: 2 }),
      }),
    );
    for (let i = 1; i < plan.focusAreas.length; i++) {
      expect(plan.focusAreas[i].weight).toBeLessThanOrEqual(plan.focusAreas[i - 1].weight);
    }
  });

  it("caps focusAreas to at most 4", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({
        talkRatio: talk({ avgRepTalkShare: 0.9, avgQuestionsPerCall: 2, avgFillerDensity: 0.12 }),
        playbook: playbook({ avgScore: 30 }),
        scorecard: scorecard({
          dimensions: { activity: 20, quality: 20, outcomes: 20, compliance: 30 },
          metrics: {
            connectRate: 0.1,
            emailReplyRate: 0.02,
            smsReplyRate: 0.01,
            emailBounceRate: 0.1,
            meetingShowRate: 0.3,
            opportunityWinRate: 0.05,
            optOutRate: 0.05,
            activityPerDay: 10,
            quotaAttainment: 0.1,
          },
        }),
        dealSignals: deals({ dealsStalled: 8, avgStagePushCount: 3, topLossReasons: ["price", "stakeholder"] }),
      }),
    );
    expect(plan.focusAreas.length).toBeLessThanOrEqual(4);
  });
});

describe("synthesizeCoachingPlan — drills & goals", () => {
  it("each focus area produces one drill", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({ talkRatio: talk({ avgRepTalkShare: 0.9 }) }),
    );
    expect(plan.drills.length).toBe(plan.focusAreas.length);
  });

  it("each goal has a future due date", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({ talkRatio: talk({ avgRepTalkShare: 0.9 }) }),
    );
    for (const g of plan.goals) {
      expect(Date.parse(g.targetDueIso)).toBeGreaterThan(Date.parse(WINDOW_END));
    }
  });

  it("nextCheckinIso is 14 days after windowEnd", () => {
    const plan = synthesizeCoachingPlan(baseInput());
    const diff = Date.parse(plan.nextCheckinIso) - Date.parse(WINDOW_END);
    expect(diff / 86_400_000).toBeCloseTo(14, 1);
  });
});

describe("synthesizeCoachingPlan — strengths", () => {
  it("celebrates strong outcomes dimension", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({
        scorecard: scorecard({ dimensions: { activity: 85, quality: 80, outcomes: 85, compliance: 90 } }),
      }),
    );
    expect(plan.strengths.some((s) => /Outcomes/.test(s))).toBe(true);
  });

  it("no false strengths for weak reps", () => {
    const plan = synthesizeCoachingPlan(
      baseInput({
        scorecard: scorecard({
          dimensions: { activity: 30, quality: 30, outcomes: 30, compliance: 30 },
          metrics: {
            connectRate: 0.1,
            emailReplyRate: 0.02,
            smsReplyRate: 0.01,
            emailBounceRate: 0.05,
            meetingShowRate: 0.3,
            opportunityWinRate: 0.05,
            optOutRate: 0.05,
            activityPerDay: 10,
            quotaAttainment: 0.3,
          },
        }),
        talkRatio: talk({ balancedCallsPct: 0.3, avgRepTalkShare: 0.8 }),
        playbook: playbook({ avgScore: 40 }),
        dealSignals: deals({
          dealsClosedWon: 1,
          dealsInCycle: 10,
          topLossReasons: [],
        }),
      }),
    );
    expect(plan.strengths.length).toBe(0);
  });
});

describe("synthesizeCoachingPlan — minimal input", () => {
  it("works with just rep identity", () => {
    const plan = synthesizeCoachingPlan({
      rep: { id: "r1", name: "X", tenureMonths: 3 },
      windowStart: WINDOW_START,
      windowEnd: WINDOW_END,
    });
    expect(plan.repId).toBe("r1");
    expect(plan.focusAreas).toEqual([]);
    expect(plan.drills).toEqual([]);
    expect(plan.managerBrief.length).toBeGreaterThan(0);
  });
});

describe("aggregateTeamCoaching", () => {
  it("counts focus category distribution across reps", () => {
    const p1 = synthesizeCoachingPlan(baseInput({ talkRatio: talk({ avgRepTalkShare: 0.8 }) }));
    const p2 = synthesizeCoachingPlan(
      baseInput({
        rep: { id: "r2", name: "Kim Rep", tenureMonths: 6 },
        talkRatio: talk({ avgRepTalkShare: 0.85 }),
      }),
    );
    const agg = aggregateTeamCoaching([p1, p2]);
    expect(agg.reps).toBe(2);
    expect(agg.focusDistribution.talk_balance).toBe(2);
  });

  it("surfaces reps with high-severity issues", () => {
    const risky = synthesizeCoachingPlan(
      baseInput({ dealSignals: deals({ dealsStalled: 8, dealsInCycle: 10 }) }),
    );
    const healthy = synthesizeCoachingPlan(
      baseInput({
        rep: { id: "r3", name: "Alex Rep", tenureMonths: 24 },
      }),
    );
    const agg = aggregateTeamCoaching([risky, healthy]);
    expect(agg.repsNeedingAttention.some((p) => p.repId === risky.repId)).toBe(true);
  });
});
