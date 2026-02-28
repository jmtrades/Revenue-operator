/**
 * Scenario objective safety. List execution without profile forces preview. Triage chooses route/qualify/escalate.
 */

import { describe, it, expect } from "vitest";
import { resolveObjectives } from "../src/lib/intelligence/objective-engine";

describe("Scenario objective safety", () => {
  it("list_execution without profile returns route (caller must force preview)", () => {
    const out = resolveObjectives({
      workspaceId: "w",
      leadState: { strategy_state: "discovery", intent_type: "follow_up" },
      conversationContext: { conversation_id: "c", domain_type: "general" },
      riskScore: 0,
      useModeKey: "list_execution",
      scenarioProfile: null,
    });
    expect(out.primary).toBe("route");
  });

  it("list_execution with profile uses profile primary objective", () => {
    const out = resolveObjectives({
      workspaceId: "w",
      leadState: { strategy_state: "discovery", intent_type: "follow_up" },
      conversationContext: { conversation_id: "c" },
      useModeKey: "list_execution",
      scenarioProfile: { primary_objective: "qualify", secondary_objectives: [] },
    });
    expect(out.primary).toBe("qualify");
  });

  it("triage inbound returns qualify or route or escalate", () => {
    const out = resolveObjectives({
      workspaceId: "w",
      leadState: { strategy_state: "discovery", intent_type: "follow_up" },
      conversationContext: { conversation_id: "c" },
      useModeKey: "triage",
    });
    expect(["qualify", "route", "escalate"]).toContain(out.primary);
  });

  it("triage with escalation state returns escalate", () => {
    const out = resolveObjectives({
      workspaceId: "w",
      leadState: { strategy_state: "escalation", intent_type: "follow_up" },
      conversationContext: { conversation_id: "c" },
      useModeKey: "triage",
    });
    expect(out.primary).toBe("escalate");
  });
});
