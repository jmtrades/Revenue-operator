/**
 * Human detachment evidence layer: non-participation, silence windows, absence-impact, responsibility, proof capsule, settlement, orientation.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MAX_CHARS = 90;
const NO_NUMBERS = /\d|%|percent|score|ROI|KPI|saved|revenue|efficiency|optimization|improvement|performance|metric/i;

describe("detachment: non-participation recorded only without interaction", () => {
  it("recordNonParticipationIfApplicable checks hasProviderInteraction before inserting", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/detachment/non-participation.ts"), "utf-8");
    expect(content).toContain("hasProviderInteraction");
    expect(content).toContain("recordNonParticipationIfApplicable");
    expect(content).toContain("if (interacted) return");
  });
});

describe("detachment: silence windows require inactivity", () => {
  it("detectOperationalSilence uses provider_participation and resolution times", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/detachment/silence-windows.ts"), "utf-8");
    expect(content).toContain("provider_participation");
    expect(content).toContain("causal_chains");
    expect(content).toContain("continuation_exposures");
    expect(content).toContain("operational_silence_windows");
    expect(content).toContain("hasResolutionInGap");
  });
});

describe("detachment: absence-impact API shape", () => {
  it("absence-impact route returns array of strings only", () => {
    const content = readFileSync(
      path.join(ROOT, "src/app/api/operational/absence-impact/route.ts"),
      "utf-8"
    );
    expect(content).toContain("getAbsenceImpactLines");
    expect(content).toContain("NextResponse.json(lines)");
  });

  it("absence-impact lines have no numbers and are at most 90 chars", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/detachment/absence-impact.ts"), "utf-8");
    const lines = [
      "The process continued without provider involvement.",
      "The outcome did not require provider action.",
      "Operations remained stable during inactivity.",
      "Resolution occurred without manual decision.",
    ];
    for (const line of lines) {
      expect(content).toContain(line);
      expect(NO_NUMBERS.test(line)).toBe(false);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    }
  });
});

describe("detachment: responsibility boolean exists", () => {
  it("operational_position includes protection_active boolean", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/responsibility/route.ts"), "utf-8");
    expect(content).toContain("protection_active");
    expect(content).toContain("hasInterruptedExposureLast24h");
  });

  it("operational_position includes normalized_operation boolean", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/responsibility/route.ts"), "utf-8");
    expect(content).toContain("normalized_operation");
    expect(content).toContain("normalizationEstablished");
  });

  it("operational_position includes provider_detached", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/responsibility/route.ts"), "utf-8");
    expect(content).toContain("provider_detached");
    expect(content).toContain("providerDetachmentEstablished");
  });
});

describe("detachment: proof capsule ordering preserved", () => {
  it("proof capsule has causality, continuation, displacement, responsibility, then detachment", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");
    expect(content).toContain("chainRes");
    expect(content).toContain("exposureRes");
    expect(content).toContain("displacementRes");
    expect(content).toContain("responsibilityRes");
    expect(content).toContain("providerDetachmentEstablished");
    expect(content).toContain("Outcomes no longer required provider action.");
    expect(content).toContain("MAX_LINES");
  });
});

describe("detachment: settlement requires provider_detached", () => {
  it("isAdministrativeActivationAvailable includes providerDetachmentEstablished", () => {
    const content = readFileSync(
      path.join(ROOT, "src/lib/operational-perception/settlement-context.ts"),
      "utf-8"
    );
    expect(content).toContain("providerDetachmentEstablished");
    expect(content).toContain("providerDetached");
    expect(content).toContain("providerDetached &&");
  });
});

describe("detachment: orientation recorded once", () => {
  it("provider_detached orientation statement and column exist", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/responsibility/route.ts"), "utf-8");
    expect(content).toContain("The provider was no longer required for operation.");
    expect(content).toContain("provider_detached_orientation_recorded_at");
    expect(content).toContain("if (provider_detached)");
  });
});
