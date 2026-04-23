/**
 * Phase 21 — Rep scorecards.
 */

import { describe, it, expect } from "vitest";
import {
  buildRepScorecard,
  computeTeamBaseline,
  type RepActivityRollup,
  type TeamBaseline,
} from "../src/lib/sales/rep-scorecard";

function rollupOf(overrides: Partial<RepActivityRollup> = {}): RepActivityRollup {
  return {
    repId: "rep-1",
    repName: "Alice",
    windowStart: "2026-04-01T00:00:00.000Z",
    windowEnd: "2026-04-22T00:00:00.000Z",
    callsPlaced: 100,
    callsConnected: 30,
    emailsSent: 500,
    emailsDelivered: 490,
    emailsOpened: 150,
    emailsReplied: 40,
    emailsBounced: 10,
    smsSent: 200,
    smsDelivered: 195,
    smsReplied: 40,
    meetingsBooked: 20,
    meetingsHeld: 17,
    opportunitiesCreated: 8,
    opportunitiesWon: 2,
    revenueClosed: 40000,
    optOutsReceived: 3,
    complianceViolations: 0,
    quotaTarget: 50000,
    ...overrides,
  };
}

const baseline: TeamBaseline = {
  medianDailyActivity: 30,
  medianMeetingsBooked: 10,
  medianRevenueClosed: 30000,
};

describe("buildRepScorecard — happy path", () => {
  it("returns a composite score 0-100", () => {
    const s = buildRepScorecard(rollupOf(), baseline);
    expect(s.compositeScore).toBeGreaterThanOrEqual(0);
    expect(s.compositeScore).toBeLessThanOrEqual(100);
  });

  it("assigns a letter grade", () => {
    const s = buildRepScorecard(rollupOf(), baseline);
    expect(["A", "B", "C", "D", "F"]).toContain(s.grade);
  });

  it("returns per-dimension scores", () => {
    const s = buildRepScorecard(rollupOf(), baseline);
    expect(s.dimensions.activity).toBeGreaterThanOrEqual(0);
    expect(s.dimensions.activity).toBeLessThanOrEqual(100);
    expect(s.dimensions.quality).toBeGreaterThanOrEqual(0);
    expect(s.dimensions.outcomes).toBeGreaterThanOrEqual(0);
    expect(s.dimensions.compliance).toBeGreaterThanOrEqual(0);
  });

  it("populates derived metrics", () => {
    const s = buildRepScorecard(rollupOf(), baseline);
    expect(s.metrics.connectRate).toBeCloseTo(0.3, 6);
    expect(s.metrics.emailReplyRate).toBeCloseTo(40 / 490, 6);
    expect(s.metrics.quotaAttainment).toBeCloseTo(40000 / 50000, 6);
  });
});

describe("buildRepScorecard — grade thresholds", () => {
  it("gives F when activity and outcomes are minimal", () => {
    const s = buildRepScorecard(
      rollupOf({
        callsPlaced: 1,
        callsConnected: 0,
        emailsSent: 5,
        emailsDelivered: 5,
        emailsReplied: 0,
        emailsOpened: 0,
        smsSent: 0,
        smsDelivered: 0,
        smsReplied: 0,
        meetingsBooked: 0,
        meetingsHeld: 0,
        opportunitiesCreated: 0,
        opportunitiesWon: 0,
        revenueClosed: 0,
      }),
      baseline,
    );
    expect(s.grade).toBe("F");
  });

  it("gives A to a top performer", () => {
    const s = buildRepScorecard(
      rollupOf({
        callsPlaced: 400,
        callsConnected: 150,
        emailsSent: 2000,
        emailsDelivered: 1980,
        emailsOpened: 900,
        emailsReplied: 300,
        emailsBounced: 20,
        smsSent: 600,
        smsDelivered: 595,
        smsReplied: 200,
        meetingsBooked: 40,
        meetingsHeld: 36,
        opportunitiesCreated: 20,
        opportunitiesWon: 8,
        revenueClosed: 150000,
        optOutsReceived: 5,
        complianceViolations: 0,
      }),
      baseline,
    );
    expect(s.grade).toBe("A");
  });
});

describe("buildRepScorecard — coaching flags", () => {
  it("flags high bounce rate", () => {
    const s = buildRepScorecard(
      rollupOf({ emailsSent: 100, emailsBounced: 15 }),
      baseline,
    );
    expect(s.coachingFlags.some((f) => f.includes("bounce"))).toBe(true);
  });

  it("flags high opt-out rate", () => {
    const s = buildRepScorecard(
      rollupOf({ emailsSent: 100, smsSent: 0, callsPlaced: 0, optOutsReceived: 5 }),
      baseline,
    );
    expect(s.coachingFlags.some((f) => f.includes("Opt-out rate"))).toBe(true);
  });

  it("flags low activity", () => {
    const s = buildRepScorecard(
      rollupOf({
        callsPlaced: 2,
        emailsSent: 5,
        smsSent: 1,
      }),
      baseline,
    );
    expect(s.coachingFlags.some((f) => f.includes("Activity"))).toBe(true);
  });

  it("flags compliance violations", () => {
    const s = buildRepScorecard(
      rollupOf({ complianceViolations: 2 }),
      baseline,
    );
    expect(s.coachingFlags.some((f) => f.includes("compliance"))).toBe(true);
  });

  it("flags low call connect rate when sample is meaningful", () => {
    const s = buildRepScorecard(
      rollupOf({ callsPlaced: 100, callsConnected: 5 }),
      baseline,
    );
    expect(s.coachingFlags.some((f) => f.includes("connect rate"))).toBe(true);
  });

  it("does not flag connect rate on tiny samples", () => {
    const s = buildRepScorecard(
      rollupOf({ callsPlaced: 5, callsConnected: 0 }),
      baseline,
    );
    expect(s.coachingFlags.some((f) => f.includes("connect rate"))).toBe(false);
  });
});

describe("buildRepScorecard — compliance penalty", () => {
  it("each violation removes points", () => {
    const clean = buildRepScorecard(rollupOf({ complianceViolations: 0 }), baseline);
    const one = buildRepScorecard(rollupOf({ complianceViolations: 1 }), baseline);
    const two = buildRepScorecard(rollupOf({ complianceViolations: 2 }), baseline);
    expect(one.dimensions.compliance).toBeLessThan(clean.dimensions.compliance);
    expect(two.dimensions.compliance).toBeLessThan(one.dimensions.compliance);
  });
});

describe("buildRepScorecard — quota attainment", () => {
  it("returns ratio when quota is set", () => {
    const s = buildRepScorecard(
      rollupOf({ quotaTarget: 100000, revenueClosed: 75000 }),
      baseline,
    );
    expect(s.metrics.quotaAttainment).toBeCloseTo(0.75, 6);
  });

  it("returns null when quota is absent", () => {
    const s = buildRepScorecard(
      rollupOf({ quotaTarget: undefined }),
      baseline,
    );
    expect(s.metrics.quotaAttainment).toBeNull();
  });
});

describe("computeTeamBaseline", () => {
  it("computes median daily activity", () => {
    const rollups: RepActivityRollup[] = [
      rollupOf({ repId: "a", callsPlaced: 21, emailsSent: 21, smsSent: 21 }), // 63/21 days = 3/day
      rollupOf({ repId: "b", callsPlaced: 42, emailsSent: 42, smsSent: 42 }), // 126/21 = 6/day
      rollupOf({ repId: "c", callsPlaced: 63, emailsSent: 63, smsSent: 63 }), // 189/21 = 9/day
    ];
    const tb = computeTeamBaseline(rollups);
    expect(tb.medianDailyActivity).toBeCloseTo(6, 1);
  });

  it("computes median meetings booked", () => {
    const rollups: RepActivityRollup[] = [
      rollupOf({ repId: "a", meetingsBooked: 5 }),
      rollupOf({ repId: "b", meetingsBooked: 10 }),
      rollupOf({ repId: "c", meetingsBooked: 20 }),
      rollupOf({ repId: "d", meetingsBooked: 100 }),
    ];
    const tb = computeTeamBaseline(rollups);
    expect(tb.medianMeetingsBooked).toBe(15); // (10 + 20) / 2
  });

  it("returns zeros for empty input", () => {
    const tb = computeTeamBaseline([]);
    expect(tb.medianDailyActivity).toBe(0);
    expect(tb.medianMeetingsBooked).toBe(0);
    expect(tb.medianRevenueClosed).toBe(0);
  });
});

describe("buildRepScorecard — dimension weighting", () => {
  it("outcomes has the highest weight (35%)", () => {
    // Rep with strong outcomes but weak activity.
    const strongOutcomes = buildRepScorecard(
      rollupOf({
        callsPlaced: 10,
        emailsSent: 10,
        smsSent: 10,
        callsConnected: 3,
        emailsDelivered: 10,
        emailsReplied: 3,
        meetingsBooked: 50,
        meetingsHeld: 45,
        opportunitiesCreated: 30,
        opportunitiesWon: 15,
        revenueClosed: 200000,
      }),
      baseline,
    );
    // Rep with high activity but weak outcomes.
    const strongActivity = buildRepScorecard(
      rollupOf({
        callsPlaced: 500,
        emailsSent: 2000,
        smsSent: 1000,
        callsConnected: 100,
        emailsDelivered: 1980,
        emailsReplied: 80,
        meetingsBooked: 0,
        meetingsHeld: 0,
        opportunitiesCreated: 0,
        opportunitiesWon: 0,
        revenueClosed: 0,
      }),
      baseline,
    );
    expect(strongOutcomes.compositeScore).toBeGreaterThan(strongActivity.compositeScore);
  });
});
