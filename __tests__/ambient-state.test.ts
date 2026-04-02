/**
 * Structural tests for ambient state / environmental presence modules.
 * Verifies the operational-perception and environmental-presence modules exist and follow patterns.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("ambient state — environmental presence module", () => {
  const presencePath = path.join(ROOT, "src/lib/environmental-presence");
  const presenceExists = existsSync(presencePath);

  it("environmental-presence directory exists", () => {
    expect(presenceExists).toBe(true);
  });

  if (presenceExists) {
    const proofRefPath = path.join(presencePath, "proof-reference.ts");
    const hasProofRef = existsSync(proofRefPath);

    it("has a proof-reference.ts module", () => {
      expect(hasProofRef).toBe(true);
    });

    if (hasProofRef) {
      const src = readFileSync(proofRefPath, "utf-8");

      it("does not use .delete()", () => {
        expect(src).not.toMatch(/\.delete\s*\(/);
      });

      it("does not contain raw LLM calls", () => {
        expect(src).not.toContain("openai");
        expect(src).not.toMatch(/ChatCompletion/i);
      });
    }
  }
});

describe("ambient state — operational perception module", () => {
  const disableImpactPath = path.join(ROOT, "src/lib/operational-perception/disable-impact.ts");

  it("disable-impact module exists", () => {
    expect(existsSync(disableImpactPath)).toBe(true);
  });

  const src = readFileSync(disableImpactPath, "utf-8");

  it("exports getDisableImpactStatements", () => {
    expect(src).toContain("export async function getDisableImpactStatements");
  });

  it("enforces MAX_LINES limit", () => {
    expect(src).toContain("MAX_LINES");
    expect(src).toMatch(/MAX_LINES\s*=\s*\d+/);
  });

  it("enforces MAX_CHARS per line", () => {
    expect(src).toContain("MAX_CHARS");
    expect(src).toMatch(/MAX_CHARS\s*=\s*\d+/);
  });

  it("sanitizes forbidden marketing terms", () => {
    expect(src).toContain("FORBIDDEN");
    expect(src).toMatch(/optimize|ROI|KPI|dashboard/);
  });

  it("uses only 7-day window for evidence", () => {
    expect(src).toContain("setDate");
    expect(src).toContain("- 7");
  });
});
