/**
 * Outcome closure: opt-out forces pause, legal_risk forces escalate, payment_made forbids followups.
 */

import { describe, it, expect } from "vitest";
import { enforceOutcomeClosure } from "../src/lib/intelligence/outcome-closure";

describe("Outcome closure enforcement", () => {
  it("opted_out => allowed only for pause_execution, forcedNextAction pause_execution", () => {
    const r = enforceOutcomeClosure("opted_out", "schedule_followup");
    expect(r.allowed).toBe(false);
    expect(r.forcedNextAction).toBe("pause_execution");
    expect(enforceOutcomeClosure("opted_out", "pause_execution").allowed).toBe(true);
  });

  it("legal_risk => allowed only for escalate_to_human", () => {
    const r = enforceOutcomeClosure("legal_risk", "schedule_followup");
    expect(r.allowed).toBe(false);
    expect(r.forcedNextAction).toBe("escalate_to_human");
    expect(enforceOutcomeClosure("legal_risk", "escalate_to_human").allowed).toBe(true);
  });

  it("payment_made => allowed only for none", () => {
    const r = enforceOutcomeClosure("payment_made", "schedule_followup");
    expect(r.allowed).toBe(false);
    expect(r.forcedNextAction).toBe("none");
    expect(enforceOutcomeClosure("payment_made", "none").allowed).toBe(true);
  });

  it("terminated => forcedNextAction none", () => {
    expect(enforceOutcomeClosure("terminated", "schedule_followup").allowed).toBe(false);
    expect(enforceOutcomeClosure("terminated", "schedule_followup").forcedNextAction).toBe("none");
  });

  it("unknown outcome => allowed true, forcedNextAction null", () => {
    const r = enforceOutcomeClosure("unknown", "schedule_followup");
    expect(r.allowed).toBe(true);
    expect(r.forcedNextAction).toBeNull();
  });

  it("null lastOutcomeType => allowed", () => {
    expect(enforceOutcomeClosure(null, "schedule_followup").allowed).toBe(true);
  });
});
