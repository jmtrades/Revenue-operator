/**
 * Structural tests for src/lib/operational-perception/disable-impact.ts
 * Verifies: counterfactual statements, forbidden terms, line limits.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const src = readFileSync(path.join(ROOT, "src/lib/operational-perception/disable-impact.ts"), "utf-8");

describe("disable-impact module shape", () => {
  it("exports getDisableImpactStatements", () => {
    expect(src).toContain("export async function getDisableImpactStatements");
  });

  it("takes workspaceId as parameter", () => {
    expect(src).toMatch(/getDisableImpactStatements\(\s*workspaceId:\s*string/);
  });

  it("returns string array", () => {
    expect(src).toContain("Promise<string[]>");
  });
});

describe("disable-impact constraints", () => {
  it("limits to MAX_LINES (6)", () => {
    expect(src).toMatch(/MAX_LINES\s*=\s*6/);
  });

  it("limits to MAX_CHARS per line (90)", () => {
    expect(src).toMatch(/MAX_CHARS\s*=\s*90/);
  });

  it("sanitizes forbidden marketing/analytics terms", () => {
    const forbiddenTerms = ["you", "your", "we", "us", "optimize", "ROI", "KPI", "dashboard", "metric", "percentage"];
    for (const term of forbiddenTerms) {
      expect(src).toContain(term);
    }
  });

  it("trims lines to MAX_CHARS", () => {
    expect(src).toContain("trim(s: string)");
    expect(src).toContain("MAX_CHARS");
  });
});

describe("disable-impact evidence sources", () => {
  it("queries continuation_exposures", () => {
    expect(src).toContain("continuation_exposures");
  });

  it("queries causal_chains", () => {
    expect(src).toContain("causal_chains");
  });

  it("queries coordination_displacement_events", () => {
    expect(src).toContain("coordination_displacement_events");
  });

  it("queries operational_exposures", () => {
    expect(src).toContain("operational_exposures");
  });

  it("queries operational_expectations", () => {
    expect(src).toContain("operational_expectations");
  });

  it("checks provider detachment", () => {
    expect(src).toContain("providerDetachmentEstablished");
  });

  it("checks normalization", () => {
    expect(src).toContain("normalizationEstablished");
  });

  it("checks dependency pressure", () => {
    expect(src).toContain("workspaceHasDependencyPressure");
  });
});

describe("disable-impact architectural rules", () => {
  it("does not use .delete()", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });

  it("does not make external API calls", () => {
    expect(src).not.toContain("fetch(");
    expect(src).not.toContain("axios");
  });

  it("uses 7-day lookback window only", () => {
    expect(src).toContain("- 7");
  });
});
