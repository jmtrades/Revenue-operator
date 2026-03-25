/**
 * Conversation stage: deterministic. Same input → same stage. No regression unless contradiction.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { resolveConversationStage, CONVERSATION_STAGES, type ConversationStage } from "../src/lib/intelligence/conversation-stage";

const ROOT = path.resolve(__dirname, "..");

describe("Conversation stage determinism", () => {
  it("same input yields same stage", () => {
    const input = { previousStage: "initial" as ConversationStage, outcomeType: "payment_made", triageReason: null };
    const a = resolveConversationStage(input);
    const b = resolveConversationStage(input);
    expect(a).toBe(b);
  });

  it("outcome type maps to correct stage", () => {
    expect(resolveConversationStage({ previousStage: null, outcomeType: "opted_out" })).toBe("terminated");
    expect(resolveConversationStage({ previousStage: null, outcomeType: "legal_risk" })).toBe("escalated");
    expect(resolveConversationStage({ previousStage: null, outcomeType: "payment_made" })).toBe("post_commitment");
    expect(resolveConversationStage({ previousStage: null, outcomeType: "appointment_confirmed" })).toBe("closing");
    expect(resolveConversationStage({ previousStage: null, outcomeType: "payment_promised" })).toBe("commitment_negotiation");
    expect(resolveConversationStage({ previousStage: null, outcomeType: "complaint" })).toBe("objection_handling");
  });

  it("returned stage is always from CONVERSATION_STAGES", () => {
    const inputs = [
      { previousStage: null, outcomeType: "no_answer" },
      { previousStage: "information_exchange" as ConversationStage, outcomeType: "information_provided" },
      { previousStage: "closing" as ConversationStage, outcomeType: "unknown", contradictionDetected: true },
    ];
    for (const i of inputs) {
      const stage = resolveConversationStage(i);
      expect(CONVERSATION_STAGES).toContain(stage);
    }
  });

  it("no Math.random or crypto.randomUUID in conversation-stage", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/conversation-stage.ts"), "utf-8");
    expect(content).not.toContain("Math.random");
    expect(content).not.toContain("crypto.randomUUID");
  });
});
