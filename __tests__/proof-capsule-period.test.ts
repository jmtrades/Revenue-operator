/**
 * Proof Capsule Period: structural tests for the period-based proof capsule builder.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC = readFileSync(resolve(__dirname, "../src/lib/proof-capsule-period/index.ts"), "utf-8");

/* -------------------------------------------------------------------------- */
/*  Module exports                                                            */
/* -------------------------------------------------------------------------- */

describe("proof-capsule-period - module exports", () => {
  it("exports buildProofCapsuleForPeriod", () => {
    expect(SRC).toContain("export async function buildProofCapsuleForPeriod");
  });

  it("exports saveProofCapsule", () => {
    expect(SRC).toContain("export async function saveProofCapsule");
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: line limits                                                   */
/* -------------------------------------------------------------------------- */

describe("proof-capsule-period - line limits", () => {
  it("defines MAX_LINE_LEN of 90", () => {
    expect(SRC).toContain("MAX_LINE_LEN = 90");
  });

  it("defines MAX_LINES of 8", () => {
    expect(SRC).toContain("MAX_LINES = 8");
  });

  it("slices output to MAX_LINES at the end", () => {
    expect(SRC).toContain("lines.slice(0, MAX_LINES)");
  });

  it("uses a trim function that enforces MAX_LINE_LEN", () => {
    expect(SRC).toContain("function trim");
    expect(SRC).toContain("MAX_LINE_LEN");
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: ladder order (causality, continuation, displacement)          */
/* -------------------------------------------------------------------------- */

describe("proof-capsule-period - ladder order", () => {
  it("defines CAUSALITY_LINE entries", () => {
    expect(SRC).toContain("CAUSALITY_LINE");
    expect(SRC).toContain("commitment_recovery");
    expect(SRC).toContain("opportunity_revival");
    expect(SRC).toContain("payment_recovery");
    expect(SRC).toContain("shared_transaction_ack");
  });

  it("defines CONTINUATION_LINE entries", () => {
    expect(SRC).toContain("CONTINUATION_LINE");
    expect(SRC).toContain('"waiting"');
    expect(SRC).toContain('"uncertain_attendance"');
    expect(SRC).toContain('"unpaid"');
    expect(SRC).toContain('"unaligned"');
  });

  it("defines DISPLACEMENT_LINE_AFTER entries", () => {
    expect(SRC).toContain("DISPLACEMENT_LINE_AFTER");
    expect(SRC).toContain("attendance");
    expect(SRC).toContain("payment");
    expect(SRC).toContain("responsibility");
    expect(SRC).toContain("confirmation");
  });

  it("defines DISPLACEMENT_LINE_WITHOUT entries", () => {
    expect(SRC).toContain("DISPLACEMENT_LINE_WITHOUT");
  });

  it("defines RESPONSIBILITY_LINE entries", () => {
    expect(SRC).toContain("RESPONSIBILITY_LINE");
    expect(SRC).toContain('"environment"');
    expect(SRC).toContain('"shared"');
  });

  it("defines RESPONSIBILITY_NO_BUSINESS line", () => {
    expect(SRC).toContain("RESPONSIBILITY_NO_BUSINESS");
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: line content is doctrine-compliant                            */
/* -------------------------------------------------------------------------- */

describe("proof-capsule-period - doctrine compliance", () => {
  it("all static lines are <= 90 chars", () => {
    // Extract all string literals assigned to line-record constants
    const lineMatches = SRC.match(/:\s*"([^"]+)"/g) ?? [];
    for (const match of lineMatches) {
      const value = match.replace(/^:\s*"/, "").replace(/"$/, "");
      // Only check lines that look like doctrine statements (contain spaces, not keys)
      if (value.includes(" ") && value.length > 5) {
        expect(value.length).toBeLessThanOrEqual(90);
      }
    }
  });

  it("no line contains forbidden words like 'you', 'your', 'we'", () => {
    const forbidden = ["\\byou\\b", "\\byour\\b", "\\bwe\\b", "\\bus\\b", "\\bclick\\b", "\\bROI\\b", "\\bKPI\\b"];
    const lineMatches = SRC.match(/:\s*"([^"]+)"/g) ?? [];
    for (const match of lineMatches) {
      const value = match.replace(/^:\s*"/, "").replace(/"$/, "");
      if (value.includes(" ") && value.length > 5) {
        for (const pattern of forbidden) {
          expect(value).not.toMatch(new RegExp(pattern, "i"));
        }
      }
    }
  });

  it("no line contains numbers or percentages", () => {
    const lineMatches = SRC.match(/:\s*"([^"]+)"/g) ?? [];
    for (const match of lineMatches) {
      const value = match.replace(/^:\s*"/, "").replace(/"$/, "");
      if (value.includes(" ") && value.length > 5) {
        expect(value).not.toMatch(/\d/);
        expect(value).not.toMatch(/%/);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: data sources queried                                          */
/* -------------------------------------------------------------------------- */

describe("proof-capsule-period - data sources", () => {
  it("queries causal_chains table", () => {
    expect(SRC).toContain('"causal_chains"');
  });

  it("queries continuation_exposures table", () => {
    expect(SRC).toContain('"continuation_exposures"');
  });

  it("queries coordination_displacement_events table", () => {
    expect(SRC).toContain('"coordination_displacement_events"');
  });

  it("queries responsibility_moments table", () => {
    expect(SRC).toContain('"responsibility_moments"');
  });

  it("queries operational_exposures for protection lines", () => {
    expect(SRC).toContain('"operational_exposures"');
  });

  it("imports from exposure-engine for protection line", () => {
    expect(SRC).toContain("PROOF_CAPSULE_PROTECTION_LINE");
  });

  it("imports from assumption-engine for assumption line", () => {
    expect(SRC).toContain("PROOF_CAPSULE_ASSUMPTION_LINE");
  });

  it("imports from normalization-engine for normalization line", () => {
    expect(SRC).toContain("PROOF_CAPSULE_NORMALIZATION_LINE");
  });

  it("imports from temporal-stability for stability line", () => {
    expect(SRC).toContain("STATEMENT_PROOF_STABILITY");
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: saveProofCapsule                                              */
/* -------------------------------------------------------------------------- */

describe("proof-capsule-period - saveProofCapsule", () => {
  it("upserts to proof_capsules table", () => {
    expect(SRC).toContain('"proof_capsules"');
    expect(SRC).toContain(".upsert(");
  });

  it("uses workspace_id,period_end as conflict key", () => {
    expect(SRC).toContain("workspace_id,period_end");
  });

  it("calls checkAndConfirmInstallation after save", () => {
    expect(SRC).toContain("checkAndConfirmInstallation");
  });

  it("does not delete capsules", () => {
    expect(SRC).not.toContain(".delete(");
  });
});

/* -------------------------------------------------------------------------- */
/*  Determinism                                                               */
/* -------------------------------------------------------------------------- */

describe("proof-capsule-period - determinism", () => {
  it("does not use Math.random()", () => {
    expect(SRC).not.toContain("Math.random");
  });

  it("uses Promise.all for parallel queries (deterministic aggregation)", () => {
    expect(SRC).toContain("Promise.all");
  });

  it("deduplicates lines with includes check", () => {
    expect(SRC).toContain("lines.includes(");
  });

  it("builds lines from period-bounded queries (startIso, endIso)", () => {
    expect(SRC).toContain("startIso");
    expect(SRC).toContain("endIso");
  });
});
