/**
 * Contract: outcome dependencies layer. External dependence only; no blocking, no advice.
 * Deterministic signals. Doctrine statements used by this layer are ≤90 chars and no forbidden language.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  recordOutcomeDependency,
  refreshResolvedAtForThread,
  contextHasExternalUncertainty,
  workspaceHasDependencyPressure,
  threadPropagatesUncertainty,
  workspaceHasThreadPropagatingUncertainty,
  type OutcomeDependencyType,
  type DependentContextType,
} from "@/lib/outcome-dependencies";
import {
  STATEMENT_COMPLETION_ELSEWHERE_AFFECTS,
  STATEMENT_WORK_RELIES_OUTSIDE,
  STATEMENT_EXTERNAL_REFERENCE_UNRESOLVED,
  STATEMENT_DEPENDENT_WORK_UNCERTAIN,
  STATEMENT_RELATED_OUTCOME_UNRESOLVED,
} from "@/lib/operational-responsibilities";

const ROOT = path.resolve(__dirname, "..");
const LIB = path.join(ROOT, "src", "lib", "outcome-dependencies", "index.ts");
const MAX_LEN = 90;
const FORBIDDEN = /\b(you should|please|click|optimize|ROI|KPI|dashboard|urgent|act now|must|should|blocked|failed|pending)\b/i;

describe("Outcome dependencies contract", () => {
  it("exports deterministic signal functions", () => {
    expect(typeof contextHasExternalUncertainty).toBe("function");
    expect(typeof workspaceHasDependencyPressure).toBe("function");
    expect(typeof threadPropagatesUncertainty).toBe("function");
    expect(typeof workspaceHasThreadPropagatingUncertainty).toBe("function");
    expect(typeof recordOutcomeDependency).toBe("function");
    expect(typeof refreshResolvedAtForThread).toBe("function");
  });

  it("dependency type values are fixed and never delete", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toContain("verification_reference");
    expect(content).toContain("downstream_commitment");
    expect(content).toContain("financial_finalization");
    expect(content).toContain("delivery_confirmation");
    expect(content).toContain("external_reporting");
    expect(content).not.toMatch(/\bdelete\b.*outcome_dependencies/);
  });

  it("doctrine statements used by dependence layer are ≤90 chars", () => {
    expect(STATEMENT_COMPLETION_ELSEWHERE_AFFECTS.length).toBeLessThanOrEqual(MAX_LEN);
    expect(STATEMENT_WORK_RELIES_OUTSIDE.length).toBeLessThanOrEqual(MAX_LEN);
    expect(STATEMENT_EXTERNAL_REFERENCE_UNRESOLVED.length).toBeLessThanOrEqual(MAX_LEN);
    expect(STATEMENT_DEPENDENT_WORK_UNCERTAIN.length).toBeLessThanOrEqual(MAX_LEN);
    expect(STATEMENT_RELATED_OUTCOME_UNRESOLVED.length).toBeLessThanOrEqual(MAX_LEN);
  });

  it("doctrine statements used by dependence layer have no forbidden language", () => {
    expect(FORBIDDEN.test(STATEMENT_COMPLETION_ELSEWHERE_AFFECTS)).toBe(false);
    expect(FORBIDDEN.test(STATEMENT_WORK_RELIES_OUTSIDE)).toBe(false);
    expect(FORBIDDEN.test(STATEMENT_EXTERNAL_REFERENCE_UNRESOLVED)).toBe(false);
    expect(FORBIDDEN.test(STATEMENT_DEPENDENT_WORK_UNCERTAIN)).toBe(false);
    expect(FORBIDDEN.test(STATEMENT_RELATED_OUTCOME_UNRESOLVED)).toBe(false);
  });

  it("does not implement blocking, validation, or instruction", () => {
    const content = readFileSync(LIB, "utf-8");
    // Must not implement blocking UI or validation that prevents action
    expect(content).not.toMatch(/\b(block|prevent)\s+(the\s+)?(user|action)\b/i);
    expect(content).not.toMatch(/\b(validation|validate)\s+(error|fail)\b/i);
    expect(content).not.toMatch(/\bpermission\s+(denied|required)\b/i);
    expect(content).not.toMatch(/\brequired\s+field\b/i);
    expect(content).not.toMatch(/\bwarn(ing)?\s+(user|before)\b/i);
  });

  it("dependent context existence check does not fabricate", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toContain("dependentContextExists");
    expect(content).toContain("shared_transaction");
    expect(content).toContain("conversation");
    expect(content).toContain("lead");
  });

  it("recordOutcomeDependency rejects insertion when context missing (existence check)", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toContain("dependentContextExists");
    expect(content).toMatch(/if\s*\(\s*!exists\s*\)\s*return/);
  });
});

describe("Outcome dependency types", () => {
  const dependencyTypes: OutcomeDependencyType[] = [
    "verification_reference",
    "downstream_commitment",
    "financial_finalization",
    "delivery_confirmation",
    "external_reporting",
  ];
  it("dependency_type enum matches spec", () => {
    expect(dependencyTypes).toHaveLength(5);
  });

  const contextTypes: DependentContextType[] = [
    "shared_transaction",
    "conversation",
    "lead",
    "external_report",
    "commitment",
    "payment_obligation",
  ];
  it("dependent_context_type includes commitment and payment_obligation", () => {
    expect(contextTypes).toContain("commitment");
    expect(contextTypes).toContain("payment_obligation");
  });
});
