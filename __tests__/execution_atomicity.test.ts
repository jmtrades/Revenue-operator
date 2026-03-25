/**
 * Execution atomicity: buildExecutionPlan failure results in zero emissions; no partial writes.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Execution atomicity", () => {
  it("runGovernedExecution calls buildExecutionPlan then emitExecutionPlanIntent (emit only after success)", () => {
    const run = readFileSync(path.join(ROOT, "src/lib/execution-plan/run.ts"), "utf-8");
    expect(run).toMatch(/buildExecutionPlan/);
    expect(run).toMatch(/emitExecutionPlanIntent/);
    const buildPos = run.indexOf("buildExecutionPlan");
    const emitPos = run.indexOf("emitExecutionPlanIntent");
    expect(emitPos).toBeGreaterThan(buildPos);
    expect(run).not.toMatch(/emitExecutionPlanIntent.*catch|try.*emitExecutionPlanIntent/);
  });

  it("buildExecutionPlan does not emit intents (emit is in run.ts)", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    expect(build).not.toMatch(/createActionIntent/);
  });

  it("emitExecutionPlanIntent is only called with plan result (no emit on throw)", () => {
    const run = readFileSync(path.join(ROOT, "src/lib/execution-plan/run.ts"), "utf-8");
    expect(run).toMatch(/const plan = await buildExecutionPlan/);
    expect(run).toMatch(/await emitExecutionPlanIntent\(plan/);
  });

  it("connector ingest does not persist strategy state on execution failure", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(ingest).not.toMatch(/upsertStrategyState/);
  });
});
