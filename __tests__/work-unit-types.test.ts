/**
 * Unit tests for src/lib/work-unit/types.ts
 * Validates WORK_UNIT_TYPES array, definitions, isAllowedState, and getWorkUnitTypeDefinition.
 */
import { describe, it, expect } from "vitest";
import {
  WORK_UNIT_TYPES,
  SPEC_WORK_UNIT_TYPES,
  WORK_UNIT_TYPE_DEFINITIONS,
  getWorkUnitTypeDefinition,
  isAllowedState,
} from "@/lib/work-unit/types";
import type { WorkUnitType } from "@/lib/work-unit/types";

describe("WORK_UNIT_TYPES — array integrity", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(WORK_UNIT_TYPES)).toBe(true);
    expect(WORK_UNIT_TYPES.length).toBeGreaterThan(0);
  });

  it("contains at least 20 types (12 spec + 8 extended)", () => {
    expect(WORK_UNIT_TYPES.length).toBeGreaterThanOrEqual(20);
  });

  it("includes all spec types", () => {
    for (const specType of SPEC_WORK_UNIT_TYPES) {
      expect(WORK_UNIT_TYPES).toContain(specType);
    }
  });

  it("contains no duplicate entries", () => {
    const unique = new Set(WORK_UNIT_TYPES);
    expect(unique.size).toBe(WORK_UNIT_TYPES.length);
  });
});

describe("WORK_UNIT_TYPES — known types present", () => {
  const KNOWN_TYPES = [
    "appointment",
    "follow_up" in WORK_UNIT_TYPES ? "follow_up" : "followup_commitment",
    "lead_acquisition",
    "payment_obligation",
    "contract_generation",
    "disclosure_confirmation",
    "compliance_review",
    "verbal_consent_record",
    "escalation_event",
    "document_request",
    "cross_party_confirmation",
    "shared_transaction",
    "inbound_lead",
    "outbound_prospect",
    "qualification_call",
    "compliance_notice",
    "contract_execution",
    "retention_cycle",
    "dispute_resolution",
  ];

  for (const t of KNOWN_TYPES) {
    it(`includes "${t}"`, () => {
      expect(WORK_UNIT_TYPES).toContain(t);
    });
  }
});

describe("getWorkUnitTypeDefinition", () => {
  it("returns a definition for every WORK_UNIT_TYPE", () => {
    for (const type of WORK_UNIT_TYPES) {
      const def = getWorkUnitTypeDefinition(type);
      expect(def).not.toBeNull();
      expect(def!.type).toBe(type);
    }
  });

  it("each definition has non-empty allowed_states", () => {
    for (const type of WORK_UNIT_TYPES) {
      const def = getWorkUnitTypeDefinition(type);
      expect(def!.allowed_states.length).toBeGreaterThan(0);
    }
  });

  it("each definition has the required shape", () => {
    for (const type of WORK_UNIT_TYPES) {
      const def = getWorkUnitTypeDefinition(type)!;
      expect(typeof def.type).toBe("string");
      expect(Array.isArray(def.allowed_states)).toBe(true);
      expect(typeof def.required_confirmations).toBe("boolean");
      expect(typeof def.completion_requires_evidence).toBe("boolean");
      expect(typeof def.completion_requires_payment).toBe("boolean");
      expect(typeof def.completion_requires_third_party).toBe("boolean");
      expect(typeof def.allows_internal_close).toBe("boolean");
      expect(typeof def.responsible_actor_role).toBe("string");
      expect(Array.isArray(def.escalation_triggers)).toBe(true);
    }
  });

  it("returns null for unknown type", () => {
    expect(getWorkUnitTypeDefinition("nonexistent_type")).toBeNull();
    expect(getWorkUnitTypeDefinition("")).toBeNull();
  });
});

describe("isAllowedState", () => {
  it("returns true for valid states of appointment", () => {
    expect(isAllowedState("appointment", "proposed")).toBe(true);
    expect(isAllowedState("appointment", "confirmed")).toBe(true);
    expect(isAllowedState("appointment", "attended")).toBe(true);
    expect(isAllowedState("appointment", "no_show")).toBe(true);
    expect(isAllowedState("appointment", "cancelled")).toBe(true);
    expect(isAllowedState("appointment", "rescheduled")).toBe(true);
  });

  it("returns false for invalid states of appointment", () => {
    expect(isAllowedState("appointment", "paid")).toBe(false);
    expect(isAllowedState("appointment", "queued")).toBe(false);
    expect(isAllowedState("appointment", "nonexistent")).toBe(false);
  });

  it("returns true for valid states of payment_obligation", () => {
    expect(isAllowedState("payment_obligation", "pending")).toBe(true);
    expect(isAllowedState("payment_obligation", "paid")).toBe(true);
    expect(isAllowedState("payment_obligation", "overdue")).toBe(true);
    expect(isAllowedState("payment_obligation", "disputed")).toBe(true);
  });

  it("returns false for invalid states of payment_obligation", () => {
    expect(isAllowedState("payment_obligation", "proposed")).toBe(false);
    expect(isAllowedState("payment_obligation", "signed")).toBe(false);
  });

  it("returns true for valid states of followup_commitment", () => {
    expect(isAllowedState("followup_commitment", "pending")).toBe(true);
    expect(isAllowedState("followup_commitment", "scheduled")).toBe(true);
    expect(isAllowedState("followup_commitment", "completed")).toBe(true);
    expect(isAllowedState("followup_commitment", "overdue")).toBe(true);
  });

  it("returns true for valid states of lead_acquisition", () => {
    expect(isAllowedState("lead_acquisition", "new")).toBe(true);
    expect(isAllowedState("lead_acquisition", "contacted")).toBe(true);
    expect(isAllowedState("lead_acquisition", "qualified")).toBe(true);
    expect(isAllowedState("lead_acquisition", "converted")).toBe(true);
    expect(isAllowedState("lead_acquisition", "lost")).toBe(true);
  });

  it("returns true for valid states of dispute_resolution", () => {
    expect(isAllowedState("dispute_resolution", "open")).toBe(true);
    expect(isAllowedState("dispute_resolution", "investigating")).toBe(true);
    expect(isAllowedState("dispute_resolution", "resolved")).toBe(true);
    expect(isAllowedState("dispute_resolution", "escalated")).toBe(true);
    expect(isAllowedState("dispute_resolution", "closed")).toBe(true);
  });

  it("every allowed_state in a definition passes isAllowedState", () => {
    for (const type of WORK_UNIT_TYPES) {
      const def = WORK_UNIT_TYPE_DEFINITIONS[type];
      for (const state of def.allowed_states) {
        expect(isAllowedState(type, state)).toBe(true);
      }
    }
  });
});

describe("WORK_UNIT_TYPE_DEFINITIONS — specific business rules", () => {
  it("payment_obligation requires payment for completion", () => {
    expect(WORK_UNIT_TYPE_DEFINITIONS.payment_obligation.completion_requires_payment).toBe(true);
  });

  it("dispute_resolution requires third party", () => {
    expect(WORK_UNIT_TYPE_DEFINITIONS.dispute_resolution.completion_requires_third_party).toBe(true);
  });

  it("followup_commitment allows internal close", () => {
    expect(WORK_UNIT_TYPE_DEFINITIONS.followup_commitment.allows_internal_close).toBe(true);
  });

  it("disclosure_confirmation requires evidence for completion", () => {
    expect(WORK_UNIT_TYPE_DEFINITIONS.disclosure_confirmation.completion_requires_evidence).toBe(true);
  });

  it("compliance_review responsible actor is compliance", () => {
    expect(WORK_UNIT_TYPE_DEFINITIONS.compliance_review.responsible_actor_role).toBe("compliance");
  });
});
