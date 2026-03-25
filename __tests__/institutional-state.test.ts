/**
 * Institutional state: assumed requires counterparty confirmation + record refs; orientation once; responsibility field.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const NO_NUMBERS = /\d|%|percent|score|ROI|KPI|saved|revenue|efficiency|optimization|improvement|performance|metric/i;
const FORBIDDEN_WORDING = /\b(dashboard|analytics|ROI|score|metric|count|total)\b/i;

describe("institutional state: assumed criteria", () => {
  it("assumed cannot be reached without counterparty confirmation displacement and record references across days", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/institutional-state/recompute.ts"), "utf-8");
    expect(content).toContain("hasCounterpartyConfirmationDisplacementInLastDays");
    expect(content).toContain("hasReferenceAcrossDays");
    expect(content).toMatch(/next\s*=\s*["']assumed["']/);
    expect(content).toContain("structurally_dependent");
    expect(content).toContain("coordinationExt");
  });

  it("when assumed becomes true, orientation statement is recorded once", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/institutional-state/recompute.ts"), "utf-8");
    expect(content).toContain("The operating standard became assumed.");
    expect(content).toContain("assumed_orientation_recorded_at");
    expect(content).toContain("recordOrientationStatement");
    expect(content).toContain("prevState !== \"assumed\"");
  });

  it("recompute is deterministic and idempotent", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/institutional-state/recompute.ts"), "utf-8");
    expect(content).toContain("recomputeInstitutionalState");
    expect(content).toContain("operationally_embedded");
    expect(content).toContain("structurally_dependent");
    expect(content).not.toMatch(/Math\.random|Date\.now\(\)/);
  });

  it("when institutional becomes true, orientation statement is recorded once", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/institutional-state/recompute.ts"), "utf-8");
    expect(content).toContain("The operating responsibility transferred to the process.");
    expect(content).toContain("institutional_orientation_recorded_at");
    expect(content).toContain('next === "institutional"');
  });
});

describe("responsibility: operational_position includes institutional_state", () => {
  it("responsibility route exposes institutional_state and no forbidden wording", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/responsibility/route.ts"), "utf-8");
    expect(content).toContain("institutional_state");
    expect(content).toContain("operational_position");
    const operationalPositionBlock = content.includes("institutional_state: institutional_state ?? \"none\"");
    expect(operationalPositionBlock).toBe(true);
  });

  it("institutional_state allowed values are none, embedded, reliant, assumed, institutional", () => {
    const allowed = ["none", "embedded", "reliant", "assumed", "institutional"];
    const content = readFileSync(path.join(ROOT, "src/lib/institutional-state/recompute.ts"), "utf-8");
    expect(content).toContain("InstitutionalState");
    for (const v of allowed) {
      expect(content).toContain(`"${v}"`);
    }
  });

  it("operational_position response shape has no marketing or numeric wording in doctrine strings", () => {
    const orientationLine = "The operating standard became assumed.";
    expect(NO_NUMBERS.test(orientationLine)).toBe(false);
    expect(FORBIDDEN_WORDING.test(orientationLine)).toBe(false);
  });

  it("operational_position includes authority_externalized", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/responsibility/route.ts"), "utf-8");
    expect(content).toContain("authority_externalized");
  });
});

describe("settlement: administrative activation requires institutional_state", () => {
  it("settlement-context gates administrative_activation_available on institutional_state institutional only", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/operational-perception/settlement-context.ts"), "utf-8");
    expect(content).toContain("getInstitutionalState");
    expect(content).toContain("institutional");
    expect(content).toContain("institutionalReady");
  });
});
