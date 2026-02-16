/**
 * Contract: operational responsibilities layer. Create at event time; resolve when matching event. No delete.
 * Doctrine statements ≤90 chars. Deterministic signals. Settlement gating extended.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  getSituationStatement,
  getPresenceStatement,
  getPublicWorkStatement,
  STATEMENT_REQUIRED_ACTION_INCOMPLETE,
  STATEMENT_COORDINATION_DEPENDS,
  STATEMENT_PENDING_RESPONSIBILITY,
  STATEMENT_COMPLETION_ELSEWHERE_AFFECTS,
  STATEMENT_WORK_RELIES_OUTSIDE,
  STATEMENT_EXTERNAL_REFERENCE_UNRESOLVED,
  STATEMENT_DEPENDENT_WORK_UNCERTAIN,
  STATEMENT_RELATED_OUTCOME_UNRESOLVED,
  STATEMENT_RESPONSIBILITY_ASSIGNED,
  STATEMENT_RESPONSIBILITY_TRANSFERRED,
  STATEMENT_ASSIGNED_OBLIGATION_UNRESOLVED,
  STATEMENT_COORDINATION_OCCURRED,
} from "@/lib/operational-responsibilities";

const ROOT = path.resolve(__dirname, "..");
const LIB = path.join(ROOT, "src", "lib", "operational-responsibilities", "index.ts");
const SETTLEMENT = path.join(ROOT, "src", "lib", "operational-perception", "settlement-context.ts");

describe("Operational responsibilities contract", () => {
  it("doctrine statements are ≤90 characters and factual", () => {
    expect(STATEMENT_REQUIRED_ACTION_INCOMPLETE.length).toBeLessThanOrEqual(90);
    expect(STATEMENT_COORDINATION_DEPENDS.length).toBeLessThanOrEqual(90);
    expect(STATEMENT_PENDING_RESPONSIBILITY.length).toBeLessThanOrEqual(90);
    expect(getSituationStatement()).toBe(STATEMENT_REQUIRED_ACTION_INCOMPLETE);
    expect(getPresenceStatement()).toBe(STATEMENT_COORDINATION_DEPENDS);
    expect(getPublicWorkStatement()).toBe(STATEMENT_PENDING_RESPONSIBILITY);
    expect(STATEMENT_COMPLETION_ELSEWHERE_AFFECTS.length).toBeLessThanOrEqual(90);
    expect(STATEMENT_WORK_RELIES_OUTSIDE.length).toBeLessThanOrEqual(90);
    expect(STATEMENT_EXTERNAL_REFERENCE_UNRESOLVED.length).toBeLessThanOrEqual(90);
    expect(STATEMENT_DEPENDENT_WORK_UNCERTAIN.length).toBeLessThanOrEqual(90);
    expect(STATEMENT_RELATED_OUTCOME_UNRESOLVED.length).toBeLessThanOrEqual(90);
    expect(STATEMENT_RESPONSIBILITY_ASSIGNED.length).toBeLessThanOrEqual(90);
    expect(STATEMENT_RESPONSIBILITY_TRANSFERRED.length).toBeLessThanOrEqual(90);
    expect(STATEMENT_ASSIGNED_OBLIGATION_UNRESOLVED.length).toBeLessThanOrEqual(90);
    expect(STATEMENT_COORDINATION_OCCURRED.length).toBeLessThanOrEqual(90);
  });

  it("no marketing or instruction language in statements", () => {
    const forbidden = /\b(you should|please|click|optimize|ROI|KPI|dashboard|urgent|act now)\b/i;
    expect(forbidden.test(STATEMENT_REQUIRED_ACTION_INCOMPLETE)).toBe(false);
    expect(forbidden.test(STATEMENT_COORDINATION_DEPENDS)).toBe(false);
    expect(forbidden.test(STATEMENT_PENDING_RESPONSIBILITY)).toBe(false);
    expect(forbidden.test(STATEMENT_COMPLETION_ELSEWHERE_AFFECTS)).toBe(false);
    expect(forbidden.test(STATEMENT_WORK_RELIES_OUTSIDE)).toBe(false);
    expect(forbidden.test(STATEMENT_EXTERNAL_REFERENCE_UNRESOLVED)).toBe(false);
    expect(forbidden.test(STATEMENT_DEPENDENT_WORK_UNCERTAIN)).toBe(false);
    expect(forbidden.test(STATEMENT_RELATED_OUTCOME_UNRESOLVED)).toBe(false);
    expect(forbidden.test(STATEMENT_RESPONSIBILITY_ASSIGNED)).toBe(false);
    expect(forbidden.test(STATEMENT_RESPONSIBILITY_TRANSFERRED)).toBe(false);
    expect(forbidden.test(STATEMENT_ASSIGNED_OBLIGATION_UNRESOLVED)).toBe(false);
    expect(forbidden.test(STATEMENT_COORDINATION_OCCURRED)).toBe(false);
  });

  it("responsibility layer defines create and resolve", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toContain("createResponsibilityForEvent");
    expect(content).toContain("resolveResponsibilityByEvent");
    expect(content).toContain("onReciprocalEvent");
    expect(content).toContain("threadUnresolved");
    expect(content).toContain("crossPartyRelianceEstablished");
  });

  it("settlement gating includes cross_party_reliance_established", () => {
    const content = readFileSync(SETTLEMENT, "utf-8");
    expect(content).toContain("crossPartyRelianceEstablished");
    expect(content).toContain("crossPartyReliance");
  });

  it("settlement gating includes workspace_has_dependency_pressure", () => {
    const content = readFileSync(SETTLEMENT, "utf-8");
    expect(content).toContain("workspaceHasDependencyPressure");
    expect(content).toContain("dependencyPressure");
  });
});
