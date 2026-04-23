/**
 * Phase 26 — Win/loss reason extractor.
 */

import { describe, it, expect } from "vitest";
import {
  extractWinLoss,
  rollupWinLossReasons,
  type WinLossSignals,
} from "../src/lib/sales/win-loss-extractor";

function signals(overrides: Partial<WinLossSignals> = {}): WinLossSignals {
  return {
    outcome: "lost",
    conversationText: "",
    ...overrides,
  };
}

describe("extractWinLoss — lost detection", () => {
  it("detects price_too_high", () => {
    const r = extractWinLoss(
      signals({ statedReason: "It was too expensive for us this quarter." }),
    );
    expect(r.primaryReason).toBe("price_too_high");
    expect(r.confidence).toBeGreaterThan(0.4);
  });

  it("detects no_budget", () => {
    const r = extractWinLoss(
      signals({ conversationText: "Their team said the budget is frozen for Q4." }),
    );
    expect(r.primaryReason).toBe("no_budget");
  });

  it("detects competitor_won via knownCompetitors", () => {
    const r = extractWinLoss(
      signals({
        conversationText: "They chose salesforce because of existing infrastructure.",
        knownCompetitors: ["Salesforce", "HubSpot"],
        hadCompetitor: true,
      }),
    );
    expect(["competitor_won"]).toContain(r.primaryReason);
    expect(r.winningCompetitor).toBe("Salesforce");
  });

  it("detects missing_feature", () => {
    const r = extractWinLoss(
      signals({ statedReason: "The product is missing feature X that we absolutely need." }),
    );
    expect(r.primaryReason).toBe("missing_feature");
  });

  it("detects internal_build", () => {
    const r = extractWinLoss(
      signals({ conversationText: "Leadership decided to build it in-house instead." }),
    );
    expect(r.primaryReason).toBe("internal_build");
  });

  it("detects compliance_blocker", () => {
    const r = extractWinLoss(
      signals({ conversationText: "Their infosec team flagged a SOC 2 compliance issue." }),
    );
    expect(r.primaryReason).toBe("compliance_blocker");
  });

  it("detects lost_champion via signal flag", () => {
    const r = extractWinLoss(
      signals({ championDeparted: true, conversationText: "" }),
    );
    expect(r.primaryReason).toBe("lost_champion");
  });

  it("detects ghosted when no touches in 30+ days and no other signal", () => {
    const r = extractWinLoss(
      signals({ daysSinceLastTouch: 45, conversationText: "" }),
    );
    expect(r.primaryReason).toBe("ghosted");
  });

  it("does not default to ghosted when there's an explicit keyword", () => {
    const r = extractWinLoss(
      signals({
        daysSinceLastTouch: 45,
        conversationText: "Their budget is frozen this year.",
      }),
    );
    expect(r.primaryReason).toBe("no_budget");
  });

  it("falls back to no_decision_made when nothing matches", () => {
    const r = extractWinLoss(
      signals({ conversationText: "Random irrelevant text here." }),
    );
    expect(r.primaryReason).toBe("no_decision_made");
    expect(r.confidence).toBeLessThan(0.3);
  });

  it("collects multiple reasons as secondary", () => {
    const r = extractWinLoss(
      signals({
        conversationText:
          "Too expensive overall. Also missing feature X we need. Infosec had a SOC 2 compliance issue too.",
      }),
    );
    expect(r.secondaryReasons.length).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(0.5);
  });
});

describe("extractWinLoss — win detection", () => {
  it("detects feature_fit by default when nothing else matches", () => {
    const r = extractWinLoss(
      signals({ outcome: "won", conversationText: "Just signed the contract." }),
    );
    expect(r.primaryReason).toBe("feature_fit");
  });

  it("detects price_competitive", () => {
    const r = extractWinLoss(
      signals({ outcome: "won", conversationText: "We offered a better price point than everyone else." }),
    );
    expect(r.primaryReason).toBe("price_competitive");
  });

  it("detects incumbent_replacement", () => {
    const r = extractWinLoss(
      signals({ outcome: "won", conversationText: "They are ripping out legacy system and migrating to us." }),
    );
    expect(r.primaryReason).toBe("incumbent_replacement");
  });

  it("detects timing_urgent", () => {
    const r = extractWinLoss(
      signals({ outcome: "won", conversationText: "They needed it by end of quarter ASAP." }),
    );
    expect(r.primaryReason).toBe("timing_urgent");
  });
});

describe("extractWinLoss — competitor detection", () => {
  it("returns null competitor when none mentioned", () => {
    const r = extractWinLoss(
      signals({
        conversationText: "Too expensive.",
        knownCompetitors: ["Salesforce", "HubSpot"],
      }),
    );
    expect(r.winningCompetitor).toBeNull();
  });

  it("detects competitor via any of the phrasing patterns", () => {
    for (const phrase of [
      "they went with hubspot",
      "they chose hubspot",
      "they selected hubspot",
      "they signed with hubspot",
    ]) {
      const r = extractWinLoss(
        signals({
          conversationText: phrase,
          knownCompetitors: ["HubSpot"],
          hadCompetitor: true,
        }),
      );
      expect(r.winningCompetitor).toBe("HubSpot");
    }
  });
});

describe("rollupWinLossReasons", () => {
  it("summarizes an array of results", () => {
    const rollup = rollupWinLossReasons([
      extractWinLoss(signals({ conversationText: "too expensive" })),
      extractWinLoss(signals({ conversationText: "too expensive" })),
      extractWinLoss(
        signals({ conversationText: "chose salesforce", knownCompetitors: ["Salesforce"] }),
      ),
      extractWinLoss(
        signals({ outcome: "won", conversationText: "better price point" }),
      ),
    ]);
    expect(rollup.totalCount).toBe(4);
    expect(rollup.lost.price_too_high).toBe(2);
    expect(rollup.lost.competitor_won).toBe(1);
    expect(rollup.won.price_competitive).toBe(1);
    expect(rollup.competitors.Salesforce).toBe(1);
  });

  it("handles empty input", () => {
    const rollup = rollupWinLossReasons([]);
    expect(rollup.totalCount).toBe(0);
    expect(Object.keys(rollup.won)).toHaveLength(0);
    expect(Object.keys(rollup.lost)).toHaveLength(0);
  });
});
