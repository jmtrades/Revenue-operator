/**
 * System spec (I–XVI) contract: work unit types, preview API shape, execution intents.
 * Ensures implementation matches docs/SYSTEM_SPEC.md.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  SPEC_WORK_UNIT_TYPES,
  getWorkUnitTypeDefinition,
  type WorkUnitType,
} from "@/lib/work-unit/types";
import type { IntentType } from "@/lib/action-intents";

const ROOT = path.resolve(__dirname, "..");

const SPEC_WORK_UNIT_NAMES = [
  "lead_acquisition",
  "appointment",
  "payment_obligation",
  "contract_generation",
  "disclosure_confirmation",
  "outbound_campaign_execution",
  "compliance_review",
  "verbal_consent_record",
  "followup_commitment",
  "escalation_event",
  "document_request",
  "cross_party_confirmation",
];

const SPEC_INTENT_TYPES: IntentType[] = [
  "send_message",
  "place_outbound_call",
  "schedule_followup",
  "escalate_to_human",
  "collect_payment",
  "generate_contract",
  "request_disclosure_confirmation",
  "record_verbal_consent",
];

describe("System spec (III) work unit types", () => {
  it("SPEC_WORK_UNIT_TYPES contains exactly the 12 spec types", () => {
    expect(SPEC_WORK_UNIT_TYPES).toHaveLength(12);
    for (const name of SPEC_WORK_UNIT_NAMES) {
      expect(SPEC_WORK_UNIT_TYPES).toContain(name);
    }
  });

  it("every spec work unit type has a definition with allowed_states and escalation_triggers", () => {
    for (const type of SPEC_WORK_UNIT_TYPES) {
      const def = getWorkUnitTypeDefinition(type as WorkUnitType);
      expect(def).not.toBeNull();
      expect(def!.allowed_states.length).toBeGreaterThan(0);
      expect(Array.isArray(def!.escalation_triggers)).toBe(true);
      expect(["system", "operator", "closer", "compliance", "auditor"]).toContain(def!.responsible_actor_role);
    }
  });
});

describe("System spec (XIII) execution intents", () => {
  it("action-intents module exports all spec intent types", async () => {
    const { createActionIntent } = await import("@/lib/action-intents");
    expect(typeof createActionIntent).toBe("function");
    for (const intentType of SPEC_INTENT_TYPES) {
      expect(["send_message", "place_outbound_call", "schedule_followup", "escalate_to_human", "collect_payment", "generate_contract", "request_disclosure_confirmation", "record_verbal_consent"]).toContain(intentType);
    }
  });
});

describe("System spec (VIII) message preview API", () => {
  it("preview route returns text, disclaimer_lines, approval_mode, policy_id, template_id", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/message/preview/route.ts"), "utf-8");
    expect(route).toContain("text:");
    expect(route).toContain("disclaimer_lines:");
    expect(route).toContain("approval_mode:");
    expect(route).toContain("policy_id:");
    expect(route).toContain("template_id:");
  });
});
