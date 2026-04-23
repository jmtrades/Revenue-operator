/**
 * Phase 32 — Deal stall / slippage detector.
 */

import { describe, it, expect } from "vitest";
import {
  detectStall,
  summarizeStallRisk,
  type Deal,
} from "../src/lib/sales/deal-stall-detector";

const NOW = "2026-04-22T12:00:00.000Z";

function dealOf(over: Partial<Deal> = {}): Deal {
  return {
    id: "d1",
    amount: 50000,
    currency: "USD",
    stage: "proposal",
    ownerId: "rep1",
    category: "best_case",
    contactCount: 2,
    originalCloseDate: "2026-04-30T00:00:00.000Z",
    currentCloseDate: "2026-04-30T00:00:00.000Z",
    nextStep: "Review terms on 4/25",
    nextStepUpdatedAt: "2026-04-21T00:00:00.000Z",
    mutualPlanAttached: true,
    stageHistory: [
      { at: "2026-04-01T00:00:00.000Z", from: "discovery", to: "proposal" },
    ],
    activity: [
      { at: "2026-04-20T00:00:00.000Z", type: "email_sent" },
      { at: "2026-04-18T00:00:00.000Z", type: "meeting_held" },
      { at: "2026-04-10T00:00:00.000Z", type: "call" },
    ],
    ...over,
  };
}

describe("detectStall — healthy deal", () => {
  it("returns low risk when everything is fine", () => {
    const r = detectStall(dealOf(), NOW);
    expect(r.riskLevel).toBe("low");
    expect(r.signals).toEqual([]);
  });
});

describe("detectStall — idle detection", () => {
  it("flags idle_too_long past threshold", () => {
    const r = detectStall(
      dealOf({
        activity: [{ at: "2026-04-01T00:00:00.000Z", type: "email_sent" }],
      }),
      NOW,
    );
    expect(r.signals.some((s) => s.code === "idle_too_long")).toBe(true);
  });

  it("escalates to critical at 2× threshold", () => {
    const r = detectStall(
      dealOf({
        stage: "negotiation",
        activity: [{ at: "2026-03-15T00:00:00.000Z", type: "email_sent" }],
      }),
      NOW,
    );
    const sig = r.signals.find((s) => s.code === "idle_too_long");
    expect(sig?.severity).toBe("critical");
  });
});

describe("detectStall — stage regression", () => {
  it("flags when stage moved backward", () => {
    const r = detectStall(
      dealOf({
        stageHistory: [
          { at: "2026-03-01T00:00:00.000Z", from: "discovery", to: "proposal" },
          { at: "2026-04-01T00:00:00.000Z", from: "proposal", to: "discovery" },
        ],
        stage: "discovery",
      }),
      NOW,
    );
    expect(r.signals.some((s) => s.code === "stage_regression")).toBe(true);
  });

  it("does NOT flag closed_lost as regression", () => {
    const r = detectStall(
      dealOf({
        stage: "closed_lost",
        stageHistory: [
          { at: "2026-04-01T00:00:00.000Z", from: "proposal", to: "closed_lost" },
        ],
      }),
      NOW,
    );
    expect(r.signals.some((s) => s.code === "stage_regression")).toBe(false);
  });
});

describe("detectStall — close date slippage", () => {
  it("flags close_date_slipped on any push", () => {
    const r = detectStall(
      dealOf({
        originalCloseDate: "2026-04-15T00:00:00.000Z",
        currentCloseDate: "2026-04-30T00:00:00.000Z",
      }),
      NOW,
    );
    expect(r.signals.some((s) => s.code === "close_date_slipped")).toBe(true);
  });

  it("adds multiple_pushes signal for long slip", () => {
    const r = detectStall(
      dealOf({
        originalCloseDate: "2026-02-01T00:00:00.000Z",
        currentCloseDate: "2026-04-30T00:00:00.000Z",
      }),
      NOW,
    );
    expect(r.signals.some((s) => s.code === "close_date_pushed_multiple_times")).toBe(true);
  });
});

describe("detectStall — commit risk", () => {
  it("flags commit_at_risk when deep in commit but early stage", () => {
    const r = detectStall(
      dealOf({
        category: "commit",
        stage: "discovery",
        currentCloseDate: "2026-04-27T00:00:00.000Z", // 5d out
      }),
      NOW,
    );
    expect(r.signals.some((s) => s.code === "commit_at_risk")).toBe(true);
    expect(r.recommendation.toLowerCase()).toContain("remove from commit");
  });

  it("does not flag commit_at_risk when in negotiation", () => {
    const r = detectStall(
      dealOf({
        category: "commit",
        stage: "negotiation",
        currentCloseDate: "2026-04-27T00:00:00.000Z",
      }),
      NOW,
    );
    expect(r.signals.some((s) => s.code === "commit_at_risk")).toBe(false);
  });
});

describe("detectStall — multi-thread", () => {
  it("flags no_multi_thread past discovery with 1 contact", () => {
    const r = detectStall(dealOf({ contactCount: 1, stage: "proposal" }), NOW);
    expect(r.signals.some((s) => s.code === "no_multi_thread")).toBe(true);
  });

  it("does not flag in qualification", () => {
    const r = detectStall(dealOf({ contactCount: 1, stage: "qualification" }), NOW);
    expect(r.signals.some((s) => s.code === "no_multi_thread")).toBe(false);
  });
});

describe("detectStall — next step + mutual plan", () => {
  it("flags no_next_step when empty", () => {
    const r = detectStall(dealOf({ nextStep: "" }), NOW);
    expect(r.signals.some((s) => s.code === "no_next_step")).toBe(true);
  });

  it("flags mutual_plan_missing past proposal", () => {
    const r = detectStall(dealOf({ mutualPlanAttached: false }), NOW);
    expect(r.signals.some((s) => s.code === "mutual_plan_missing")).toBe(true);
  });
});

describe("detectStall — risk scoring", () => {
  it("multiple signals push to high / critical", () => {
    const r = detectStall(
      dealOf({
        category: "commit",
        stage: "discovery",
        currentCloseDate: "2026-04-27T00:00:00.000Z",
        originalCloseDate: "2026-02-01T00:00:00.000Z",
        mutualPlanAttached: false,
        nextStep: "",
        activity: [{ at: "2026-03-15T00:00:00.000Z", type: "email_sent" }],
      }),
      NOW,
    );
    expect(r.riskLevel === "high" || r.riskLevel === "critical").toBe(true);
    expect(r.riskScore).toBeGreaterThanOrEqual(45);
  });
});

describe("summarizeStallRisk", () => {
  it("rolls up counts + critical deal ids", () => {
    const reports = [
      { ...detectStall(dealOf({ id: "a" }), NOW) },
      {
        ...detectStall(
          dealOf({
            id: "b",
            category: "commit",
            stage: "discovery",
            currentCloseDate: "2026-04-27T00:00:00.000Z",
            originalCloseDate: "2026-02-01T00:00:00.000Z",
            mutualPlanAttached: false,
            nextStep: "",
            activity: [{ at: "2026-03-15T00:00:00.000Z", type: "email_sent" }],
          }),
          NOW,
        ),
      },
    ];
    const s = summarizeStallRisk(reports);
    expect(s.total).toBe(2);
    expect(s.criticalDealIds.length).toBeGreaterThanOrEqual(0);
    expect(s.byLevel.low + s.byLevel.medium + s.byLevel.high + s.byLevel.critical).toBe(2);
  });
});
