/**
 * Objection lifecycle: deterministic. No random.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  resolveObjectionLifecycle,
  OBJECTION_LIFECYCLE_STAGES,
} from "../src/lib/intelligence/objection-lifecycle";

const ROOT = path.resolve(__dirname, "..");

describe("Objection lifecycle determinism", () => {
  it("same input yields same stage", () => {
    const input = { prevStage: "raised" as const, outcomeType: "information_provided", lastOutcomeType: null, driftScore: 0, contradictionScore: 0 };
    expect(resolveObjectionLifecycle(input)).toBe(resolveObjectionLifecycle(input));
  });

  it("returned stage is from OBJECTION_LIFECYCLE_STAGES", () => {
    const stages = ["raised", "addressed", "verified", "resolved", "reopened"];
    for (const prev of stages) {
      const r = resolveObjectionLifecycle({ prevStage: prev, outcomeType: "complaint", lastOutcomeType: null, driftScore: 0, contradictionScore: 0 });
      expect(OBJECTION_LIFECYCLE_STAGES).toContain(r);
    }
  });

  it("complaint outcome => raised or reopened", () => {
    expect(resolveObjectionLifecycle({ prevStage: null, outcomeType: "complaint", lastOutcomeType: null, driftScore: 0, contradictionScore: 0 })).toBe("raised");
    expect(resolveObjectionLifecycle({ prevStage: "resolved", outcomeType: "complaint", lastOutcomeType: null, driftScore: 0, contradictionScore: 0 })).toBe("reopened");
  });

  it("information_provided after raised => addressed", () => {
    expect(resolveObjectionLifecycle({ prevStage: "raised", outcomeType: "information_provided", lastOutcomeType: null, driftScore: 0, contradictionScore: 0 })).toBe("addressed");
  });

  it("no Math.random or crypto.randomUUID in objection-lifecycle", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/objection-lifecycle.ts"), "utf-8");
    expect(content).not.toContain("Math.random");
    expect(content).not.toContain("crypto.randomUUID");
  });
});
