/**
 * Contract: reciprocal events layer. Thread = shared_transaction lifecycle.
 * Continuation lines: factual only, ≤90 chars, no internal ids. Deterministic.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const LIB = path.join(ROOT, "src", "lib", "reciprocal-events", "index.ts");

describe("Reciprocal events contract", () => {
  it("defines thread as shared_transaction and records actor_role, operational_action", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toContain("thread_id");
    expect(content).toContain("actor_role");
    expect(content).toContain("operational_action");
    expect(content).toContain("originator");
    expect(content).toContain("counterparty");
  });

  it("continuation lines are capped and factual", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toContain("MAX_LINE = 90");
    expect(content).toContain("eventToLine");
    expect(content).not.toMatch(/dashboard|KPI|ROI|optimize|urgent/i);
  });

  it("no internal ids in public-facing continuation output", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toContain("getContinuationLinesForThread");
    expect(content).not.toMatch(/thread_id.*json|\.id.*line|uuid.*line/);
  });
});
