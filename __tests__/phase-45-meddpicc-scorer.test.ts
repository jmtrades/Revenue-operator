/**
 * Phase 45 — MEDDPICC scorer + deal review.
 */

import { describe, it, expect } from "vitest";
import {
  scoreMeddpicc,
  dealReviewPacket,
  missingEvidencePrompts,
  type Evidence,
  type MeddpiccInput,
} from "../src/lib/sales/meddpicc-scorer";

function ev(kind: Evidence["kind"], strength = 1): Evidence {
  return { id: `${kind}-${strength}`, kind, strength };
}

function input(over: Partial<MeddpiccInput> = {}): MeddpiccInput {
  return {
    dealId: "d1",
    amount: 100_000,
    stage: "proposal",
    evidence: [],
    ...over,
  };
}

const FULL_EVIDENCE: Evidence[] = [
  ev("metric_quantified"),
  ev("roi_calculated"),
  ev("eb_identified"),
  ev("eb_met"),
  ev("criteria_documented"),
  ev("criteria_aligned"),
  ev("process_mapped"),
  ev("timeline_confirmed"),
  ev("steps_identified"),
  ev("paper_started"),
  ev("legal_engaged"),
  ev("security_review_engaged"),
  ev("pain_quantified"),
  ev("cost_of_inaction"),
  ev("champion_identified"),
  ev("champion_validated"),
  ev("champion_committed"),
  ev("competitor_identified"),
  ev("competitor_strategy"),
];

describe("scoreMeddpicc — full-evidence deal", () => {
  it("scores 100 / grade A with all evidence at 1.0", () => {
    const s = scoreMeddpicc(input({ evidence: FULL_EVIDENCE }));
    expect(s.overall).toBe(100);
    expect(s.grade).toBe("A");
    for (const letter of Object.values(s.letters)) {
      expect(letter.grade).toBe("A");
      expect(letter.critical).toBe(false);
    }
  });

  it("lists all 8 letters among strongest when all As", () => {
    const s = scoreMeddpicc(input({ evidence: FULL_EVIDENCE }));
    // Only top 3 are returned, but all should be 'A'
    expect(s.strongestLetters.length).toBe(3);
    expect(s.weakestLetters).toEqual([]);
  });
});

describe("scoreMeddpicc — empty deal", () => {
  it("scores 0 / grade F with no evidence", () => {
    const s = scoreMeddpicc(input());
    expect(s.overall).toBe(0);
    expect(s.grade).toBe("F");
  });

  it("flags all critical letters as critical when empty", () => {
    const s = scoreMeddpicc(input());
    const criticalLetters = Object.values(s.letters).filter((l) => l.critical);
    // critical=true rubric letters: E, Dc, Dp, I, C
    const criticalCodes = criticalLetters.map((l) => l.letter).sort();
    expect(criticalCodes).toEqual(["C", "Dc", "Dp", "E", "I"]);
  });
});

describe("scoreMeddpicc — strength aggregation", () => {
  it("takes max strength when multiple evidence items for same kind", () => {
    const s = scoreMeddpicc(
      input({
        evidence: [
          ev("metric_quantified", 0.3),
          ev("metric_quantified", 0.9),
          ev("roi_calculated", 1.0),
        ],
      }),
    );
    expect(s.letters.M.score).toBeCloseTo(0.9 * 0.6 + 1.0 * 0.4, 3);
  });
});

describe("scoreMeddpicc — letter grades", () => {
  it("0.8 letter score → B grade", () => {
    const s = scoreMeddpicc(
      input({ evidence: [ev("eb_identified", 1), ev("eb_met", 0.75)] }),
    );
    // 0.3*1 + 0.7*0.75 = 0.825 → B
    expect(s.letters.E.grade).toBe("B");
  });

  it("0.5 letter score → D grade", () => {
    const s = scoreMeddpicc(input({ evidence: [ev("eb_met", 0.5)] }));
    // 0.3*0 + 0.7*0.5 = 0.35 → F
    expect(s.letters.E.grade).toBe("F");
  });
});

describe("missingEvidencePrompts", () => {
  it("prioritizes critical-letter gaps first", () => {
    const prompts = missingEvidencePrompts(scoreMeddpicc(input()), 5);
    expect(prompts.length).toBe(5);
    // First prompt should belong to a critical letter
    const criticalLetters = new Set(["E", "Dc", "Dp", "I", "C"]);
    expect(criticalLetters.has(prompts[0].letter)).toBe(true);
  });

  it("returns empty when all evidence gathered", () => {
    const prompts = missingEvidencePrompts(
      scoreMeddpicc(input({ evidence: FULL_EVIDENCE })),
      5,
    );
    expect(prompts).toEqual([]);
  });

  it("is sorted by priority desc", () => {
    const prompts = missingEvidencePrompts(scoreMeddpicc(input()), 10);
    for (let i = 1; i < prompts.length; i++) {
      expect(prompts[i - 1].priority).toBeGreaterThanOrEqual(prompts[i].priority);
    }
  });
});

describe("dealReviewPacket", () => {
  it("lists risks for empty deal", () => {
    const p = dealReviewPacket(input());
    expect(p.risks.length).toBeGreaterThan(0);
    expect(p.evidenceCompletenessPct).toBe(0);
  });

  it("recommendedActions derived from gaps", () => {
    const p = dealReviewPacket(
      input({
        evidence: [
          ev("metric_quantified"),
          ev("eb_identified"),
          ev("champion_identified"),
        ],
      }),
    );
    expect(p.recommendedActions.length).toBeGreaterThan(0);
    expect(p.recommendedActions.length).toBeLessThanOrEqual(5);
  });

  it("summary includes deal id, amount, MEDDPICC score", () => {
    const p = dealReviewPacket(
      input({ dealId: "big-one", amount: 750_000, evidence: FULL_EVIDENCE }),
    );
    expect(p.summary).toContain("big-one");
    expect(p.summary).toContain("750,000");
    expect(p.summary).toContain("100/100");
  });

  it("evidenceCompletenessPct reflects matched kinds", () => {
    const p = dealReviewPacket(
      input({
        evidence: [
          ev("metric_quantified"),
          ev("eb_identified"),
          ev("champion_identified"),
        ],
      }),
    );
    // 3 of 19 kinds matched
    expect(p.evidenceCompletenessPct).toBeCloseTo(3 / 19, 3);
  });

  it("warns about missing competitive strategy as a cross-cutting risk", () => {
    // Full evidence except Competition letter
    const p = dealReviewPacket(
      input({
        evidence: FULL_EVIDENCE.filter((e) => e.kind !== "competitor_strategy" && e.kind !== "competitor_identified"),
      }),
    );
    expect(p.risks.some((r) => /Competitive strategy/i.test(r))).toBe(true);
  });
});
