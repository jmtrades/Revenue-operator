/**
 * Strategic horizon: deterministic. Same input → same output. Max 3 steps.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { buildStrategicHorizon } from "../src/lib/intelligence/strategic-horizon";

const ROOT = path.resolve(__dirname, "..");

describe("Strategic horizon determinism", () => {
  it("same input yields same output", () => {
    const input = {
      stage: "information_exchange",
      primaryObjective: "qualify",
      openQuestionsCount: 1,
      brokenCommitmentsCount: 0,
      goodwillScore: 50,
      riskScore: 30,
      driftScore: 0,
    };
    const a = buildStrategicHorizon(input);
    const b = buildStrategicHorizon(input);
    expect(a).toEqual(b);
  });

  it("returns max length 3", () => {
    const r = buildStrategicHorizon({
      stage: "commitment_negotiation",
      openQuestionsCount: 0,
      brokenCommitmentsCount: 0,
      goodwillScore: 50,
      riskScore: 0,
      driftScore: 0,
    });
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it("information_exchange stage includes clarify or reinforce", () => {
    const r = buildStrategicHorizon({
      stage: "information_exchange",
      openQuestionsCount: 0,
      brokenCommitmentsCount: 0,
      goodwillScore: 50,
      riskScore: 0,
      driftScore: 0,
    });
    expect(r.some((s) => s === "clarify" || s === "reinforce" || s === "commit")).toBe(true);
  });

  it("risk high → first step compliance_confirm", () => {
    const r = buildStrategicHorizon({
      stage: "information_exchange",
      openQuestionsCount: 0,
      brokenCommitmentsCount: 0,
      goodwillScore: 50,
      riskScore: 80,
      driftScore: 0,
    });
    expect(r[0]).toBe("compliance_confirm");
  });

  it("no Math.random or randomUUID in strategic-horizon", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/strategic-horizon.ts"), "utf-8");
    expect(content).not.toMatch(/Math\.random\s*\(/);
    expect(content).not.toMatch(/randomUUID\s*\(/);
  });
});
