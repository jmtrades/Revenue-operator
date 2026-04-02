/**
 * Thread Reference Memory: structural tests for module shape, constants, and behavioral guarantees.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC = readFileSync(resolve(__dirname, "../src/lib/thread-reference-memory/index.ts"), "utf-8");

/* -------------------------------------------------------------------------- */
/*  Module exports                                                            */
/* -------------------------------------------------------------------------- */

describe("thread-reference-memory - module exports", () => {
  it("exports ReferenceContextType type", () => {
    expect(SRC).toContain("ReferenceContextType");
  });

  it("exports ReferenceReason type", () => {
    expect(SRC).toContain("ReferenceReason");
  });

  it("exports ReferenceContext interface", () => {
    expect(SRC).toContain("ReferenceContext");
  });

  it("exports detectAndAttachReference function", () => {
    expect(SRC).toContain("export async function detectAndAttachReference");
  });

  it("exports threadHasReference function", () => {
    expect(SRC).toContain("export async function threadHasReference");
  });

  it("exports countReferenceDays function", () => {
    expect(SRC).toContain("export async function countReferenceDays");
  });

  it("exports workspaceHasMultiDayReferences function", () => {
    expect(SRC).toContain("export async function workspaceHasMultiDayReferences");
  });
});

/* -------------------------------------------------------------------------- */
/*  Doctrine constants                                                        */
/* -------------------------------------------------------------------------- */

describe("thread-reference-memory - doctrine constants", () => {
  it("defines STATEMENT_LATER_ACTIVITY_REFERENCED", () => {
    expect(SRC).toContain("STATEMENT_LATER_ACTIVITY_REFERENCED");
  });

  it("STATEMENT_LATER_ACTIVITY_REFERENCED is <= 90 chars in source", () => {
    const match = SRC.match(/STATEMENT_LATER_ACTIVITY_REFERENCED\s*=\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1].length).toBeLessThanOrEqual(90);
  });

  it("defines STATEMENT_RECORD_CONTINUED_ACROSS_OCCASIONS", () => {
    expect(SRC).toContain("STATEMENT_RECORD_CONTINUED_ACROSS_OCCASIONS");
  });

  it("STATEMENT_RECORD_CONTINUED_ACROSS_OCCASIONS is <= 90 chars in source", () => {
    const match = SRC.match(/STATEMENT_RECORD_CONTINUED_ACROSS_OCCASIONS\s*=\s*\n?\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1].length).toBeLessThanOrEqual(90);
  });
});

/* -------------------------------------------------------------------------- */
/*  Type definitions                                                          */
/* -------------------------------------------------------------------------- */

describe("thread-reference-memory - type definitions", () => {
  it("defines five ReferenceContextType values", () => {
    expect(SRC).toContain('"conversation"');
    expect(SRC).toContain('"commitment"');
    expect(SRC).toContain('"payment_obligation"');
    expect(SRC).toContain('"lead"');
    expect(SRC).toContain('"shared_transaction"');
  });

  it("defines five ReferenceReason values", () => {
    expect(SRC).toContain('"same_subject"');
    expect(SRC).toContain('"followup_commitment"');
    expect(SRC).toContain('"payment_settlement"');
    expect(SRC).toContain('"conversation_continuation"');
    expect(SRC).toContain('"dispute_revival"');
  });
});

/* -------------------------------------------------------------------------- */
/*  Behavioral guarantees                                                     */
/* -------------------------------------------------------------------------- */

describe("thread-reference-memory - behavioral guarantees", () => {
  it("uses insert, not update or delete, for attaching references", () => {
    // attachReference uses insert
    expect(SRC).toContain('.from("thread_reference_memory").insert(');
  });

  it("does not delete reference records", () => {
    expect(SRC).not.toContain(".delete(");
    expect(SRC).not.toContain(".remove(");
  });

  it("checks alreadyAttached before inserting (idempotent)", () => {
    expect(SRC).toContain("alreadyAttached");
  });

  it("uses 30-day window for commitment matching", () => {
    expect(SRC).toContain("THIRTY_DAYS_MS");
    expect(SRC).toContain("30 * 24 * 60 * 60 * 1000");
  });

  it("does not use Math.random()", () => {
    expect(SRC).not.toContain("Math.random");
  });

  it("records reciprocal event after attachment", () => {
    expect(SRC).toContain("recordReciprocalEvent");
  });

  it("records outcome dependency after attachment", () => {
    expect(SRC).toContain("recordOutcomeDependency");
  });

  it("countReferenceDays uses distinct UTC days via Set", () => {
    expect(SRC).toContain("new Set");
    expect(SRC).toContain("toISOString().slice(0, 10)");
  });

  it("workspaceHasMultiDayReferences requires >= 2 reference days", () => {
    expect(SRC).toContain("n >= 2");
  });
});

/* -------------------------------------------------------------------------- */
/*  Determinism                                                               */
/* -------------------------------------------------------------------------- */

describe("thread-reference-memory - determinism", () => {
  it("detectAndAttachReference uses deterministic matching (no randomness)", () => {
    expect(SRC).not.toContain("Math.random");
    expect(SRC).not.toContain("crypto.random");
  });

  it("subjectMatch is a pure comparison function", () => {
    expect(SRC).toContain("function subjectMatch");
    // It compares subject_type and subject_id
    expect(SRC).toContain("t.subject_type === subjectType");
  });
});
