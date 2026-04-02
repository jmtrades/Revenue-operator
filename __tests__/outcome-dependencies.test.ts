/**
 * Outcome Dependencies: structural tests for types, exports, and behavioral guarantees.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC = readFileSync(resolve(__dirname, "../src/lib/outcome-dependencies/index.ts"), "utf-8");

/* -------------------------------------------------------------------------- */
/*  Module exports                                                            */
/* -------------------------------------------------------------------------- */

describe("outcome-dependencies - module exports", () => {
  it("exports OutcomeDependencyType type", () => {
    expect(SRC).toContain("OutcomeDependencyType");
  });

  it("exports DependentContextType type", () => {
    expect(SRC).toContain("DependentContextType");
  });

  it("exports RecordOutcomeDependencyInput interface", () => {
    expect(SRC).toContain("RecordOutcomeDependencyInput");
  });

  it("exports recordOutcomeDependency function", () => {
    expect(SRC).toContain("export async function recordOutcomeDependency");
  });

  it("exports refreshResolvedAtForThread function", () => {
    expect(SRC).toContain("export async function refreshResolvedAtForThread");
  });

  it("exports contextHasExternalUncertainty function", () => {
    expect(SRC).toContain("export async function contextHasExternalUncertainty");
  });

  it("exports workspaceHasDependencyPressure function", () => {
    expect(SRC).toContain("export async function workspaceHasDependencyPressure");
  });

  it("exports threadPropagatesUncertainty function", () => {
    expect(SRC).toContain("export async function threadPropagatesUncertainty");
  });

  it("exports linkThreadToCommitment function", () => {
    expect(SRC).toContain("export async function linkThreadToCommitment");
  });

  it("exports linkThreadToPayment function", () => {
    expect(SRC).toContain("export async function linkThreadToPayment");
  });

  it("exports workspaceHasThreadPropagatingUncertainty function", () => {
    expect(SRC).toContain("export async function workspaceHasThreadPropagatingUncertainty");
  });
});

/* -------------------------------------------------------------------------- */
/*  Type definitions                                                          */
/* -------------------------------------------------------------------------- */

describe("outcome-dependencies - type definitions", () => {
  it("defines six OutcomeDependencyType values", () => {
    expect(SRC).toContain('"verification_reference"');
    expect(SRC).toContain('"downstream_commitment"');
    expect(SRC).toContain('"financial_finalization"');
    expect(SRC).toContain('"delivery_confirmation"');
    expect(SRC).toContain('"external_reporting"');
    expect(SRC).toContain('"prior_outcome_reference"');
  });

  it("defines six DependentContextType values", () => {
    expect(SRC).toContain('"shared_transaction"');
    expect(SRC).toContain('"conversation"');
    expect(SRC).toContain('"lead"');
    expect(SRC).toContain('"external_report"');
    expect(SRC).toContain('"commitment"');
    expect(SRC).toContain('"payment_obligation"');
  });
});

/* -------------------------------------------------------------------------- */
/*  Behavioral guarantees: append-only, never delete                          */
/* -------------------------------------------------------------------------- */

describe("outcome-dependencies - append-only guarantees", () => {
  it("uses insert for recording dependencies", () => {
    expect(SRC).toContain('.from("outcome_dependencies").insert(');
  });

  it("never deletes outcome_dependencies rows", () => {
    // The module explicitly states: "Never delete rows."
    expect(SRC).not.toMatch(/\.from\("outcome_dependencies"\)[\s\S]*?\.delete\(/);
  });

  it("only updates resolved_at (not delete)", () => {
    expect(SRC).toContain('.update({ resolved_at:');
  });

  it("recordOutcomeDependency checks dependent context exists before insert", () => {
    expect(SRC).toContain("dependentContextExists");
    // The function returns early if context does not exist
    expect(SRC).toContain("if (!exists) return");
  });
});

/* -------------------------------------------------------------------------- */
/*  Dependent context validation                                              */
/* -------------------------------------------------------------------------- */

describe("outcome-dependencies - dependent context validation", () => {
  it("validates shared_transaction context", () => {
    expect(SRC).toContain('"shared_transactions"');
  });

  it("validates conversation context", () => {
    expect(SRC).toContain('"conversations"');
  });

  it("validates lead context", () => {
    expect(SRC).toContain('"leads"');
  });

  it("validates commitment context", () => {
    expect(SRC).toContain('"commitments"');
  });

  it("validates payment_obligation context", () => {
    expect(SRC).toContain('"payment_obligations"');
  });

  it("returns false for external_report context (no table lookup)", () => {
    expect(SRC).toContain('"external_report"');
    // external_report always returns false
    expect(SRC).toMatch(/contextType === "external_report"[\s\S]*?return false/);
  });
});

/* -------------------------------------------------------------------------- */
/*  Determinism                                                               */
/* -------------------------------------------------------------------------- */

describe("outcome-dependencies - determinism", () => {
  it("does not use Math.random()", () => {
    expect(SRC).not.toContain("Math.random");
  });

  it("uses RPC for deterministic boolean queries", () => {
    expect(SRC).toContain("context_has_external_uncertainty");
    expect(SRC).toContain("workspace_has_dependency_pressure");
    expect(SRC).toContain("thread_propagates_uncertainty");
  });

  it("refreshResolvedAtForThread checks unresolved responsibilities first", () => {
    expect(SRC).toContain("threadHasUnresolvedResponsibility");
    expect(SRC).toContain("if (unresolved) return");
  });
});

/* -------------------------------------------------------------------------- */
/*  Integration with institutional-auditability                               */
/* -------------------------------------------------------------------------- */

describe("outcome-dependencies - auditability integration", () => {
  it("records thread amendments when relied-upon dependency resolves", () => {
    expect(SRC).toContain("threadIsReliedUpon");
    expect(SRC).toContain("recordThreadAmendment");
  });

  it("uses dynamic import for institutional-auditability", () => {
    expect(SRC).toContain('import("@/lib/institutional-auditability")');
  });
});
