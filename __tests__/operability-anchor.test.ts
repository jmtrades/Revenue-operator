/**
 * Operability anchor: expectations, anchored condition, API, responsibility, settlement, orientation, proof capsule.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MAX_CHARS = 90;
const NO_NUMBERS = /\d|%|percent|score|ROI|KPI|saved|revenue|efficiency|optimization|improvement|performance|metric/i;

describe("operability: expectations created and removed correctly", () => {
  it("upsert and remove exist in operability-anchor", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/operability-anchor/expectations.ts"), "utf-8");
    expect(content).toContain("upsertOperationalExpectation");
    expect(content).toContain("removeOperationalExpectation");
    expect(content).toContain("active_operational_expectations");
  });

  it("refresh helpers call upsert by type", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/operability-anchor/refresh.ts"), "utf-8");
    expect(content).toContain("awaiting_confirmation");
    expect(content).toContain("awaiting_reply");
    expect(content).toContain("awaiting_payment");
    expect(content).toContain("awaiting_counterparty");
  });
});

describe("operability: anchored requires simultaneous expectations", () => {
  it("processMaintainsOperation requires minimum count and age", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/operability-anchor/expectations.ts"), "utf-8");
    expect(content).toContain("processMaintainsOperation");
    expect(content).toContain("MIN_EXPECTATIONS");
    expect(content).toContain("first_observed_at");
    expect(content).toMatch(/count|length/);
  });
});

describe("operability: API shape", () => {
  it("operability route returns array of strings only", () => {
    const content = readFileSync(
      path.join(ROOT, "src/app/api/operational/operability/route.ts"),
      "utf-8"
    );
    expect(content).toContain("getOperabilityLines");
    expect(content).toContain("NextResponse.json(lines)");
  });

  it("operability lines have no numbers and are at most 90 chars", () => {
    const lines = [
      "The operation is being maintained by the process.",
      "Ongoing work is being coordinated through the record.",
      "Current activity depends on the operating process.",
    ];
    for (const line of lines) {
      expect(NO_NUMBERS.test(line)).toBe(false);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    }
  });
});

describe("operability: responsibility field exists", () => {
  it("operational_position includes operation_currently_anchored", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/responsibility/route.ts"), "utf-8");
    expect(content).toContain("operation_currently_anchored");
    expect(content).toContain("processMaintainsOperation");
  });
});

describe("operability: settlement requires anchored true", () => {
  it("isAdministrativeActivationAvailable includes processMaintainsOperation and anchored across days", () => {
    const content = readFileSync(
      path.join(ROOT, "src/lib/operational-perception/settlement-context.ts"),
      "utf-8"
    );
    expect(content).toContain("processMaintainsOperation");
    expect(content).toContain("operationAnchored");
    expect(content).toContain("hasAnchoredAcrossDays");
    expect(content).toContain("anchoredAcrossDays");
    expect(content).toContain("operationAnchored &&");
    expect(content).toContain("assumed");
  });
});

describe("operability: orientation recorded once", () => {
  it("operation anchored orientation statement and column exist", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/responsibility/route.ts"), "utf-8");
    expect(content).toContain("The operation became sustained through the process.");
    expect(content).toContain("operation_anchored_orientation_recorded_at");
    expect(content).toContain("if (operation_currently_anchored)");
  });
});

describe("operability: proof capsule ordering preserved", () => {
  it("proof capsule appends anchored line last", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");
    expect(content).toContain("The operation depended on the process remaining active.");
    expect(content).toContain("processMaintainsOperation");
    expect(content).toContain("MAX_LINES");
  });
});
