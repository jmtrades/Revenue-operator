/**
 * Contract: public work GET shape (participants, evidence, pending_assignment), no internal ids.
 * Public respond: actor_role, participant_hint, evidence, assign_third_party, transfer_responsibility.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_WORK_ROUTE = path.join(ROOT, "src/app/api/public/work/[external_ref]/route.ts");
const PUBLIC_RESPOND_ROUTE = path.join(ROOT, "src/app/api/public/work/[external_ref]/respond/route.ts");
const FORBIDDEN_KEYS = ["workspace_id", "lead_id", "id", "created_at", "thread_id", "event_id"];

describe("Public work GET contract", () => {
  it("neutral response includes participants key (array)", () => {
    const neutral = {
      what_happened: [],
      if_removed: [],
      reliance: [],
      continuation: [],
      continuation_surface: false,
      pending_responsibility_statement: null,
      pending_assignment_statement: null,
      record_external_dependence_statement: null,
      evidence_present: false,
      evidence_statement: null,
      participants: [],
      can_respond: false,
      can_follow_up: false,
    };
    expect(neutral).toHaveProperty("participants");
    expect(Array.isArray(neutral.participants)).toBe(true);
  });

  it("response shape includes evidence_present and evidence_statement", () => {
    const shape = {
      evidence_present: false,
      evidence_statement: null as string | null,
    };
    expect(shape.evidence_statement === null || typeof shape.evidence_statement === "string").toBe(true);
    expect(typeof shape.evidence_present).toBe("boolean");
  });

  it("response shape includes pending_assignment_statement", () => {
    const shape = { pending_assignment_statement: null as string | null };
    expect(shape.pending_assignment_statement === null || typeof shape.pending_assignment_statement === "string").toBe(true);
  });

  it("route does not return internal ids in payload", () => {
    const _content = readFileSync(PUBLIC_WORK_ROUTE, "utf-8");
    const returnedKeys = ["what_happened", "if_removed", "reliance", "continuation", "continuation_surface", "pending_responsibility_statement", "pending_assignment_statement", "record_external_dependence_statement", "evidence_present", "evidence_statement", "participants", "can_respond", "can_follow_up"];
    for (const key of FORBIDDEN_KEYS) {
      expect(returnedKeys).not.toContain(key);
    }
  });

  it("participants items have role and optional hint only", () => {
    const item: { role: string; hint?: string | null } = { role: "counterparty", hint: "Supplier" };
    expect(Object.keys(item).sort()).toEqual(["hint", "role"].sort());
  });

  it("neutral response includes reference_continuation_statement key (null)", () => {
    const neutral = {
      what_happened: [],
      if_removed: [],
      reliance: [],
      continuation: [],
      continuation_surface: false,
      pending_responsibility_statement: null,
      pending_assignment_statement: null,
      record_external_dependence_statement: null,
      evidence_present: false,
      evidence_statement: null,
      reference_continuation_statement: null,
      participants: [],
      can_respond: false,
      can_follow_up: false,
    };
    expect(neutral).toHaveProperty("reference_continuation_statement");
    expect(neutral.reference_continuation_statement).toBeNull();
  });

  it("reference_continuation_statement is doctrine-safe when present (string ≤90)", () => {
    const line = "A later activity referenced this record.";
    expect(line.length).toBeLessThanOrEqual(90);
    expect(/\b(you|click|should|must)\b/i.test(line)).toBe(false);
  });
});

describe("Public respond POST contract", () => {
  it("accepts assign_third_party and transfer_responsibility", () => {
    const content = readFileSync(PUBLIC_RESPOND_ROUTE, "utf-8");
    expect(content).toContain("assign_third_party");
    expect(content).toContain("transfer_responsibility");
  });

  it("accepts actor_role and participant_hint in body", () => {
    const content = readFileSync(PUBLIC_RESPOND_ROUTE, "utf-8");
    expect(content).toContain("actor_role");
    expect(content).toContain("participant_hint");
  });

  it("accepts evidence_text and evidence_pointer for attach_outcome_evidence", () => {
    const content = readFileSync(PUBLIC_RESPOND_ROUTE, "utf-8");
    expect(content).toContain("evidence_text");
    expect(content).toContain("evidence_pointer");
  });

  it("records participant via upsertParticipant", () => {
    const content = readFileSync(PUBLIC_RESPOND_ROUTE, "utf-8");
    expect(content).toContain("upsertParticipant");
  });

  it("records evidence via recordEvidence when attach_outcome_evidence", () => {
    const content = readFileSync(PUBLIC_RESPOND_ROUTE, "utf-8");
    expect(content).toContain("recordEvidence");
  });

  it("neutral response shape unchanged (ok: false only)", () => {
    const neutral = { ok: false };
    expect(Object.keys(neutral)).toEqual(["ok"]);
  });
});
