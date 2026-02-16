/**
 * Message Compiler: plan schema, no forbidden words, max length, no raw LLM text.
 */

import { describe, it, expect } from "vitest";
import {
  compileMessage,
  compileMessageWithPlan,
  renderPlan,
  validatePlan,
  parseMessagePlan,
  clausesForIntent,
  MessageIntent,
} from "@/lib/message-compiler";
import type { MessagePlan } from "@/lib/message-compiler";

const FORBIDDEN = ["you", "your", "we", "us", "click", "optimize", "ROI", "KPI", "dashboard", "assistant"];
const MAX_SMS = 320;

describe("Message Compiler", () => {
  it("validates plan schema", () => {
    const valid = {
      intent: "follow_up",
      stance: "request",
      entities: {},
      constraints: {},
      tone: "neutral",
      reason_tags: [],
    };
    expect(parseMessagePlan(valid).success).toBe(true);
    expect(parseMessagePlan({ intent: "invalid" }).success).toBe(false);
    expect(parseMessagePlan({ ...valid, intent: "clarification" }).success).toBe(true);
  });

  it("ensures no forbidden words in compileMessage output", () => {
    const intents = [
      MessageIntent.follow_up,
      MessageIntent.confirm_booking,
      MessageIntent.payment_reminder,
      MessageIntent.clarification,
      MessageIntent.acknowledgement_request,
    ] as const;
    const wordBoundary = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    for (const intent of intents) {
      const msg = compileMessage(intent, { channel: "sms" });
      for (const word of FORBIDDEN) {
        expect(wordBoundary(word).test(msg), `intent ${intent} should not contain word "${word}"`).toBe(false);
      }
    }
  });

  it("ensures max length caps", () => {
    const msg = compileMessage("acknowledgement_request", { channel: "sms" });
    expect(msg.length).toBeLessThanOrEqual(MAX_SMS);
    const long = compileMessage("follow_up", { channel: "email" });
    expect(long.length).toBeLessThanOrEqual(500);
  });

  it("renderer output differs by intent", () => {
    const a = compileMessage("follow_up");
    const b = compileMessage("confirm_booking");
    const c = compileMessage("payment_reminder");
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });

  it("renderer output differs by tone when supported", () => {
    const neutral = compileMessage("follow_up", { tone: "neutral" });
    const warm = compileMessage("follow_up", { tone: "warm" });
    expect(neutral).not.toBe(warm);
  });

  it("no raw LLM output passes through as text", () => {
    const plan: MessagePlan = {
      intent: "clarification",
      stance: "request",
      entities: {},
      constraints: {},
      tone: "neutral",
      reason_tags: [],
      clauses: [{ type: "next_step" }],
    };
    const msg = renderPlan(plan, {}, "sms");
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
    expect(msg.length).toBeLessThanOrEqual(MAX_SMS);
  });

  it("plan contains clauses (no template ids)", () => {
    const { plan } = compileMessageWithPlan("follow_up", { channel: "sms" });
    expect(Array.isArray(plan.clauses)).toBe(true);
    expect(plan.clauses.length).toBeGreaterThan(0);
    expect(plan.clauses.every((c: { type: string }) => typeof c.type === "string" && !c.type.includes("template"))).toBe(true);
    const clauseTypes = ["acknowledgment", "next_step", "confirmation_request", "payment_prompt", "outcome", "close_loop", "handoff", "record_expectation"];
    expect(plan.clauses.every((c: { type: string }) => clauseTypes.includes(c.type))).toBe(true);
    const fromIntent = clausesForIntent("acknowledgement_request");
    expect(fromIntent.some((c) => c.type === "acknowledgment")).toBe(true);
  });

  it("record_expectation clause appends fixed text only when addRecordExpectation", () => {
    const without = compileMessage("follow_up", { channel: "sms" });
    const withClause = compileMessage("follow_up", { channel: "sms", addRecordExpectation: true });
    expect(withClause).toContain("Outcome will appear in the record.");
    expect(without).not.toContain("Outcome will appear in the record.");
  });

  it("record_expectation is deterministic across replays", () => {
    const a = compileMessage("follow_up", { channel: "sms", addRecordExpectation: true });
    const b = compileMessage("follow_up", { channel: "sms", addRecordExpectation: true });
    expect(a).toBe(b);
  });

  it("record_expectation output respects SMS length cap", () => {
    const msg = compileMessage("follow_up", { channel: "sms", addRecordExpectation: true });
    expect(msg.length).toBeLessThanOrEqual(MAX_SMS);
  });

  it("render is deterministic for same input", () => {
    const a = compileMessageWithPlan("payment_reminder", { channel: "sms" });
    const b = compileMessageWithPlan("payment_reminder", { channel: "sms" });
    expect(a.text).toBe(b.text);
    expect(a.plan.clauses).toEqual(b.plan.clauses);
  });

  it("validatePlan returns null for invalid raw", () => {
    expect(validatePlan(null)).toBeNull();
    expect(validatePlan({})).toBeNull();
    expect(validatePlan({ intent: "follow_up", stance: "request", entities: {}, constraints: {}, tone: "neutral", reason_tags: [] })).not.toBeNull();
  });
});
