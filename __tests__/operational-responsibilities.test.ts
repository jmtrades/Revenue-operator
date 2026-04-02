/**
 * Structural tests for src/lib/operational-responsibilities/index.ts
 * Verifies: exports, responsibility lifecycle, append-only, event mapping.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const src = readFileSync(path.join(ROOT, "src/lib/operational-responsibilities/index.ts"), "utf-8");

describe("operational-responsibilities module shape", () => {
  it("exports AssignedRole type", () => {
    expect(src).toContain("export type AssignedRole");
  });

  it("exports RequiredAction type", () => {
    expect(src).toContain("export type RequiredAction");
  });

  it("exports createResponsibilityForEvent", () => {
    expect(src).toContain("export async function createResponsibilityForEvent");
  });

  it("exports resolveResponsibilityByEvent", () => {
    expect(src).toContain("export async function resolveResponsibilityByEvent");
  });

  it("exports onReciprocalEvent", () => {
    expect(src).toContain("export async function onReciprocalEvent");
  });

  it("exports threadUnresolved", () => {
    expect(src).toContain("export async function threadUnresolved");
  });

  it("exports crossPartyRelianceEstablished", () => {
    expect(src).toContain("export async function crossPartyRelianceEstablished");
  });

  it("exports workspaceHasUnresolvedResponsibility", () => {
    expect(src).toContain("export async function workspaceHasUnresolvedResponsibility");
  });
});

describe("operational-responsibilities statement constants", () => {
  const expectedStatements = [
    "STATEMENT_REQUIRED_ACTION_INCOMPLETE",
    "STATEMENT_COORDINATION_DEPENDS",
    "STATEMENT_PENDING_RESPONSIBILITY",
    "STATEMENT_COMPLETION_ELSEWHERE_AFFECTS",
    "STATEMENT_WORK_RELIES_OUTSIDE",
    "STATEMENT_EXTERNAL_REFERENCE_UNRESOLVED",
    "STATEMENT_DEPENDENT_WORK_UNCERTAIN",
    "STATEMENT_RELATED_OUTCOME_UNRESOLVED",
    "STATEMENT_RESPONSIBILITY_ASSIGNED",
    "STATEMENT_RESPONSIBILITY_TRANSFERRED",
    "STATEMENT_ASSIGNED_OBLIGATION_UNRESOLVED",
    "STATEMENT_COORDINATION_OCCURRED",
  ];

  for (const name of expectedStatements) {
    it(`exports ${name}`, () => {
      expect(src).toContain(`export const ${name}`);
    });
  }

  it("all statement constants are <=90 chars", () => {
    const matches = src.matchAll(/export const STATEMENT_\w+\s*=\s*"([^"]+)"/g);
    for (const match of matches) {
      expect(match[1].length).toBeLessThanOrEqual(90);
    }
  });
});

describe("operational-responsibilities helper functions", () => {
  it("exports getSituationStatement", () => {
    expect(src).toContain("export function getSituationStatement");
  });

  it("exports getPresenceStatement", () => {
    expect(src).toContain("export function getPresenceStatement");
  });

  it("exports getPublicWorkStatement", () => {
    expect(src).toContain("export function getPublicWorkStatement");
  });
});

describe("operational-responsibilities architectural invariants", () => {
  it("never uses .delete() — append-only", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });

  it("AssignedRole includes originator, counterparty, downstream, observer", () => {
    expect(src).toContain('"originator"');
    expect(src).toContain('"counterparty"');
    expect(src).toContain('"downstream"');
    expect(src).toContain('"observer"');
  });

  it("RequiredAction includes core action types", () => {
    const expectedActions = [
      "originator_respond",
      "both_attend",
      "downstream_act",
      "assigned_complete",
      "originator_verify",
      "coordination_required",
      "confirmation_required",
    ];
    for (const action of expectedActions) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("has EVENT_TO_RESPONSIBILITY mapping", () => {
    expect(src).toContain("EVENT_TO_RESPONSIBILITY");
  });

  it("has SATISFIES mapping for resolution", () => {
    expect(src).toContain("SATISFIES");
  });

  it("writes to operational_responsibilities table", () => {
    expect(src).toContain("operational_responsibilities");
  });

  it("caps statement lines to MAX_STATEMENT_LEN", () => {
    expect(src).toContain("MAX_STATEMENT_LEN");
    expect(src).toMatch(/MAX_STATEMENT_LEN\s*=\s*90/);
  });
});
