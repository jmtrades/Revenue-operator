/**
 * Exposure Engine: pure functions, doctrine constants, structural guarantees.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  EXPOSURE_LINES,
  FIRST_INTERRUPTION_ORIENTATION,
  PROOF_CAPSULE_PROTECTION_LINE,
  hasForbiddenWords,
  hasNumbers,
  sanitizeLine,
  MAX_LINE_LEN,
} from "@/lib/exposure-engine";

const SRC_INDEX = readFileSync(resolve(__dirname, "../src/lib/exposure-engine/index.ts"), "utf-8");
const SRC_DOCTRINE = readFileSync(resolve(__dirname, "../src/lib/exposure-engine/doctrine.ts"), "utf-8");
const SRC_DETECT = readFileSync(resolve(__dirname, "../src/lib/exposure-engine/detect.ts"), "utf-8");

/* -------------------------------------------------------------------------- */
/*  MAX_LINE_LEN                                                              */
/* -------------------------------------------------------------------------- */

describe("MAX_LINE_LEN", () => {
  it("is a number", () => {
    expect(typeof MAX_LINE_LEN).toBe("number");
  });

  it("is 90", () => {
    expect(MAX_LINE_LEN).toBe(90);
  });

  it("is reasonable (between 50 and 200)", () => {
    expect(MAX_LINE_LEN).toBeGreaterThanOrEqual(50);
    expect(MAX_LINE_LEN).toBeLessThanOrEqual(200);
  });
});

/* -------------------------------------------------------------------------- */
/*  EXPOSURE_LINES: definition categories                                     */
/* -------------------------------------------------------------------------- */

describe("EXPOSURE_LINES", () => {
  it("is an object with at least 4 entries", () => {
    expect(typeof EXPOSURE_LINES).toBe("object");
    expect(Object.keys(EXPOSURE_LINES).length).toBeGreaterThanOrEqual(4);
  });

  it("contains all expected risk categories", () => {
    const expected = [
      "reply_delay_risk",
      "attendance_uncertainty_risk",
      "payment_stall_risk",
      "counterparty_unconfirmed_risk",
      "commitment_outcome_uncertain",
    ];
    for (const key of expected) {
      expect(EXPOSURE_LINES).toHaveProperty(key);
    }
  });

  it("all values are non-empty strings", () => {
    for (const [key, value] of Object.entries(EXPOSURE_LINES)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("all values are <= MAX_LINE_LEN chars", () => {
    for (const [key, value] of Object.entries(EXPOSURE_LINES)) {
      expect(value.length).toBeLessThanOrEqual(MAX_LINE_LEN);
    }
  });

  it("values contain no forbidden words", () => {
    for (const value of Object.values(EXPOSURE_LINES)) {
      expect(hasForbiddenWords(value)).toBe(false);
    }
  });

  it("values contain no numbers", () => {
    for (const value of Object.values(EXPOSURE_LINES)) {
      expect(hasNumbers(value)).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  Doctrine constants                                                        */
/* -------------------------------------------------------------------------- */

describe("exposure doctrine constants", () => {
  it("FIRST_INTERRUPTION_ORIENTATION is a non-empty string <= 90 chars", () => {
    expect(typeof FIRST_INTERRUPTION_ORIENTATION).toBe("string");
    expect(FIRST_INTERRUPTION_ORIENTATION.length).toBeGreaterThan(0);
    expect(FIRST_INTERRUPTION_ORIENTATION.length).toBeLessThanOrEqual(90);
  });

  it("PROOF_CAPSULE_PROTECTION_LINE is a non-empty string <= 90 chars", () => {
    expect(typeof PROOF_CAPSULE_PROTECTION_LINE).toBe("string");
    expect(PROOF_CAPSULE_PROTECTION_LINE.length).toBeGreaterThan(0);
    expect(PROOF_CAPSULE_PROTECTION_LINE.length).toBeLessThanOrEqual(90);
  });

  it("doctrine constants contain no forbidden words", () => {
    expect(hasForbiddenWords(FIRST_INTERRUPTION_ORIENTATION)).toBe(false);
    expect(hasForbiddenWords(PROOF_CAPSULE_PROTECTION_LINE)).toBe(false);
  });

  it("doctrine constants contain no numbers", () => {
    expect(hasNumbers(FIRST_INTERRUPTION_ORIENTATION)).toBe(false);
    expect(hasNumbers(PROOF_CAPSULE_PROTECTION_LINE)).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*  hasForbiddenWords: pure function                                          */
/* -------------------------------------------------------------------------- */

describe("hasForbiddenWords", () => {
  it("returns true for text containing 'you'", () => {
    expect(hasForbiddenWords("Thank you for waiting.")).toBe(true);
  });

  it("returns true for text containing 'your'", () => {
    expect(hasForbiddenWords("Check your dashboard.")).toBe(true);
  });

  it("returns true for text containing 'we'", () => {
    expect(hasForbiddenWords("We noticed a delay.")).toBe(true);
  });

  it("returns true for text containing 'us'", () => {
    expect(hasForbiddenWords("Contact us today.")).toBe(true);
  });

  it("returns true for text containing 'click'", () => {
    expect(hasForbiddenWords("Click the link.")).toBe(true);
  });

  it("returns true for text containing 'dashboard'", () => {
    expect(hasForbiddenWords("Open the dashboard.")).toBe(true);
  });

  it("returns true for text containing 'ROI'", () => {
    expect(hasForbiddenWords("Great ROI expected.")).toBe(true);
  });

  it("returns true for text containing 'optimize'", () => {
    expect(hasForbiddenWords("Optimize the process.")).toBe(true);
  });

  it("returns true for forbidden phrases like 'don't forget'", () => {
    expect(hasForbiddenWords("Don't forget to confirm.")).toBe(true);
  });

  it("returns true for 'right away'", () => {
    expect(hasForbiddenWords("Act right away.")).toBe(true);
  });

  it("returns true for 'system will'", () => {
    expect(hasForbiddenWords("The system will notify.")).toBe(true);
  });

  it("returns false for clean factual text", () => {
    expect(hasForbiddenWords("A conversation remained without response.")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasForbiddenWords("")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(hasForbiddenWords("YOUR dashboard")).toBe(true);
    expect(hasForbiddenWords("CLICK HERE")).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/*  hasNumbers: pure function                                                 */
/* -------------------------------------------------------------------------- */

describe("hasNumbers", () => {
  it("returns true for text containing digits", () => {
    expect(hasNumbers("Saved 10 hours.")).toBe(true);
  });

  it("returns true for text containing '%'", () => {
    expect(hasNumbers("50% improvement")).toBe(true);
  });

  it("returns true for text containing 'percent'", () => {
    expect(hasNumbers("A percent increase.")).toBe(true);
  });

  it("returns true for text containing 'score'", () => {
    expect(hasNumbers("High score observed.")).toBe(true);
  });

  it("returns true for text containing 'ROI'", () => {
    expect(hasNumbers("ROI calculated.")).toBe(true);
  });

  it("returns true for text containing 'revenue'", () => {
    expect(hasNumbers("Revenue increased.")).toBe(true);
  });

  it("returns true for text containing 'metric'", () => {
    expect(hasNumbers("A metric changed.")).toBe(true);
  });

  it("returns false for clean factual text without numbers", () => {
    expect(hasNumbers("A conversation remained without response.")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasNumbers("")).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*  sanitizeLine: pure function                                               */
/* -------------------------------------------------------------------------- */

describe("sanitizeLine", () => {
  it("returns first sentence from multi-sentence text", () => {
    const result = sanitizeLine("First sentence. Second sentence.");
    expect(result).toBe("First sentence.");
  });

  it("truncates to MAX_LINE_LEN chars", () => {
    const input = "A".repeat(100);
    const result = sanitizeLine(input);
    expect(result.length).toBeLessThanOrEqual(MAX_LINE_LEN);
  });

  it("trims whitespace", () => {
    const result = sanitizeLine("  Leading and trailing  ");
    expect(result).not.toMatch(/^\s/);
    expect(result).not.toMatch(/\s$/);
  });

  it("handles empty input", () => {
    expect(sanitizeLine("")).toBe("");
  });

  it("handles null/undefined via fallback", () => {
    // sanitizeLine uses (text ?? "").trim()
    expect(sanitizeLine(null as unknown as string)).toBe("");
    expect(sanitizeLine(undefined as unknown as string)).toBe("");
  });

  it("preserves single sentence with period", () => {
    expect(sanitizeLine("A delay did not continue.")).toBe("A delay did not continue.");
  });

  it("handles sentence ending with exclamation mark", () => {
    const result = sanitizeLine("Action required! Check status.");
    expect(result).toBe("Action required!");
  });

  it("handles sentence ending with question mark", () => {
    const result = sanitizeLine("Is this confirmed? Follow up needed.");
    expect(result).toBe("Is this confirmed?");
  });

  it("is deterministic", () => {
    const input = "Some operational statement.";
    expect(sanitizeLine(input)).toBe(sanitizeLine(input));
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: detection functions                                           */
/* -------------------------------------------------------------------------- */

describe("exposure-engine structural - detection", () => {
  it("exports all five detection functions", () => {
    expect(SRC_INDEX).toContain("detectReplyDelayRisk");
    expect(SRC_INDEX).toContain("detectAttendanceUncertaintyRisk");
    expect(SRC_INDEX).toContain("detectPaymentStallRisk");
    expect(SRC_INDEX).toContain("detectCounterpartyUnconfirmedRisk");
    expect(SRC_INDEX).toContain("detectCommitmentOutcomeUncertain");
  });

  it("exports all three resolution functions", () => {
    expect(SRC_INDEX).toContain("resolveExposureFromCausalChain");
    expect(SRC_INDEX).toContain("resolveExposureFromContinuation");
    expect(SRC_INDEX).toContain("resolveExposureFromDisplacement");
  });

  it("exports upsert and mark functions", () => {
    expect(SRC_INDEX).toContain("upsertExposure");
    expect(SRC_INDEX).toContain("markExposureResolved");
  });

  it("exports orientation function", () => {
    expect(SRC_INDEX).toContain("recordFirstInterruptionOrientationOnce");
  });

  it("detect module has bounded DETECT_LIMIT", () => {
    expect(SRC_DETECT).toContain("DETECT_LIMIT");
  });

  it("detect module does not use Math.random()", () => {
    expect(SRC_DETECT).not.toContain("Math.random");
  });

  it("detect module uses upsertExposure (not insert directly)", () => {
    expect(SRC_DETECT).toContain("upsertExposure");
  });

  it("doctrine defines FORBIDDEN words list", () => {
    expect(SRC_DOCTRINE).toContain("FORBIDDEN");
  });

  it("doctrine defines FORBIDDEN_PHRASES list", () => {
    expect(SRC_DOCTRINE).toContain("FORBIDDEN_PHRASES");
  });
});
