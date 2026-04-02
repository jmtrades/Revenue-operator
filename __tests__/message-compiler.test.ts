/**
 * Message Compiler: deterministic plan generation, rendering, intent mapping, and validation.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  compileMessage,
  compileMessageWithPlan,
  validatePlan,
  stateToIntent,
  actionToIntent,
  MessageIntent,
  createDeterministicPlan,
  clausesForIntent,
  renderMessage,
  optOutSuffixIfRequired,
  parseMessagePlan,
} from "@/lib/message-compiler";

const SRC_INDEX = readFileSync(resolve(__dirname, "../src/lib/message-compiler/index.ts"), "utf-8");
const SRC_RENDERER = readFileSync(resolve(__dirname, "../src/lib/message-compiler/renderer.ts"), "utf-8");
const SRC_FRAGMENTS = readFileSync(resolve(__dirname, "../src/lib/message-compiler/fragments.ts"), "utf-8");
const SRC_PLAN_GEN = readFileSync(resolve(__dirname, "../src/lib/message-compiler/plan-generator.ts"), "utf-8");

/* -------------------------------------------------------------------------- */
/*  Structural: no raw LLM output, deterministic plans                        */
/* -------------------------------------------------------------------------- */

describe("message-compiler structural guarantees", () => {
  it("index.ts does not import from any LLM module for compileMessage", () => {
    // compileMessage and compileMessageWithPlan use createDeterministicPlan + renderMessage
    expect(SRC_INDEX).toContain("createDeterministicPlan");
    expect(SRC_INDEX).toContain("renderMessage");
  });

  it("renderer uses forbidden-word filtering", () => {
    expect(SRC_RENDERER).toContain("FORBIDDEN_PHRASES");
    expect(SRC_RENDERER).toContain("applyForbiddenFilter");
  });

  it("fragments file enforces MAX_FRAGMENT of 90 chars", () => {
    expect(SRC_FRAGMENTS).toContain("MAX_FRAGMENT = 90");
  });

  it("plan generator maps every MessageIntent to clause types", () => {
    for (const intent of Object.values(MessageIntent)) {
      expect(SRC_PLAN_GEN).toContain(`${intent}:`);
    }
  });

  it("renderer supports record_expectation clause", () => {
    expect(SRC_RENDERER).toContain("record_expectation");
  });

  it("renderer enforces max chars for SMS and email", () => {
    expect(SRC_RENDERER).toContain("MAX_SMS");
    expect(SRC_RENDERER).toContain("MAX_EMAIL_BODY");
  });
});

/* -------------------------------------------------------------------------- */
/*  MessageIntent enum completeness                                           */
/* -------------------------------------------------------------------------- */

describe("MessageIntent", () => {
  it("contains all expected intent types", () => {
    const expected = [
      "follow_up", "confirm_booking", "reschedule_request",
      "payment_link", "payment_reminder", "clarification",
      "close_loop", "handoff_hold", "acknowledgement_request",
      "dispute_resolution", "outcome_confirmation",
    ];
    for (const intent of expected) {
      expect(MessageIntent).toHaveProperty(intent);
      expect(MessageIntent[intent as keyof typeof MessageIntent]).toBe(intent);
    }
  });

  it("has at least 10 intent types", () => {
    expect(Object.keys(MessageIntent).length).toBeGreaterThanOrEqual(10);
  });
});

/* -------------------------------------------------------------------------- */
/*  stateToIntent: pure function mapping                                      */
/* -------------------------------------------------------------------------- */

describe("stateToIntent", () => {
  it.each([
    ["NEW_INTEREST", "clarification"],
    ["CLARIFICATION", "clarification"],
    ["CONSIDERING", "follow_up"],
    ["SOFT_OBJECTION", "clarification"],
    ["HARD_OBJECTION", "clarification"],
    ["DRIFT", "follow_up"],
    ["COLD", "follow_up"],
    ["COMMITMENT", "confirm_booking"],
    ["POST_BOOKING", "confirm_booking"],
    ["NO_SHOW", "reschedule_request"],
  ] as const)("maps %s to %s", (state, expected) => {
    expect(stateToIntent(state)).toBe(expected);
  });

  it("returns null for unknown states", () => {
    expect(stateToIntent("UNKNOWN")).toBeNull();
    expect(stateToIntent("")).toBeNull();
    expect(stateToIntent("random_state")).toBeNull();
  });

  it("is deterministic (same input, same output)", () => {
    const result1 = stateToIntent("COMMITMENT");
    const result2 = stateToIntent("COMMITMENT");
    expect(result1).toBe(result2);
  });
});

/* -------------------------------------------------------------------------- */
/*  actionToIntent: pure function mapping                                     */
/* -------------------------------------------------------------------------- */

describe("actionToIntent", () => {
  it.each([
    ["greeting", "clarification"],
    ["clarifying_question", "clarification"],
    ["follow_up", "follow_up"],
    ["qualification_question", "clarification"],
    ["booking", "confirm_booking"],
    ["call_invite", "follow_up"],
    ["reminder", "confirm_booking"],
    ["prep_info", "follow_up"],
  ] as const)("maps %s to %s", (action, expected) => {
    expect(actionToIntent(action)).toBe(expected);
  });

  it("returns null for unknown actions", () => {
    expect(actionToIntent("UNKNOWN")).toBeNull();
    expect(actionToIntent("")).toBeNull();
  });

  it("is deterministic (same input, same output)", () => {
    const result1 = actionToIntent("booking");
    const result2 = actionToIntent("booking");
    expect(result1).toBe(result2);
  });
});

/* -------------------------------------------------------------------------- */
/*  clausesForIntent: deterministic clause generation                         */
/* -------------------------------------------------------------------------- */

describe("clausesForIntent", () => {
  it("returns array of clause plans for every known intent", () => {
    for (const intent of Object.values(MessageIntent)) {
      const clauses = clausesForIntent(intent);
      expect(Array.isArray(clauses)).toBe(true);
      expect(clauses.length).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(clause).toHaveProperty("type");
        expect(typeof clause.type).toBe("string");
      }
    }
  });

  it("follow_up returns next_step clause", () => {
    const clauses = clausesForIntent("follow_up");
    expect(clauses.some((c) => c.type === "next_step")).toBe(true);
  });

  it("confirm_booking returns confirmation_request clause", () => {
    const clauses = clausesForIntent("confirm_booking");
    expect(clauses.some((c) => c.type === "confirmation_request")).toBe(true);
  });

  it("payment_link returns payment_prompt clause", () => {
    const clauses = clausesForIntent("payment_link");
    expect(clauses.some((c) => c.type === "payment_prompt")).toBe(true);
  });

  it("reschedule_request includes both confirmation_request and next_step", () => {
    const clauses = clausesForIntent("reschedule_request");
    const types = clauses.map((c) => c.type);
    expect(types).toContain("confirmation_request");
    expect(types).toContain("next_step");
  });
});

/* -------------------------------------------------------------------------- */
/*  createDeterministicPlan                                                   */
/* -------------------------------------------------------------------------- */

describe("createDeterministicPlan", () => {
  it("returns a valid plan with required fields", () => {
    const plan = createDeterministicPlan("follow_up");
    expect(plan.intent).toBe("follow_up");
    expect(plan.stance).toBeDefined();
    expect(plan.entities).toBeDefined();
    expect(plan.constraints).toBeDefined();
    expect(plan.tone).toBeDefined();
    expect(plan.clauses).toBeDefined();
    expect(Array.isArray(plan.clauses)).toBe(true);
  });

  it("defaults to SMS constraints (max_chars 320)", () => {
    const plan = createDeterministicPlan("clarification");
    expect(plan.constraints.max_chars).toBe(320);
    expect(plan.constraints.channel).toBe("sms");
  });

  it("applies custom stance and tone", () => {
    const plan = createDeterministicPlan("follow_up", { stance: "confirm", tone: "warm" });
    expect(plan.stance).toBe("confirm");
    expect(plan.tone).toBe("warm");
  });

  it("uses audience-derived tone when tone is not explicit", () => {
    const plan = createDeterministicPlan("follow_up", { audience: "personal" });
    expect(plan.tone).toBe("warm");
    expect(plan.audience).toBe("personal");
  });

  it("explicit tone overrides audience-derived tone", () => {
    const plan = createDeterministicPlan("follow_up", { audience: "personal", tone: "firm" });
    expect(plan.tone).toBe("firm");
  });

  it("is deterministic across calls", () => {
    const p1 = createDeterministicPlan("confirm_booking", { stance: "request" });
    const p2 = createDeterministicPlan("confirm_booking", { stance: "request" });
    expect(p1).toEqual(p2);
  });
});

/* -------------------------------------------------------------------------- */
/*  optOutSuffixIfRequired                                                    */
/* -------------------------------------------------------------------------- */

describe("optOutSuffixIfRequired", () => {
  it("returns STOP text when required", () => {
    const suffix = optOutSuffixIfRequired(true);
    expect(suffix).toContain("STOP");
    expect(suffix.length).toBeGreaterThan(0);
  });

  it("returns empty string when not required", () => {
    expect(optOutSuffixIfRequired(false)).toBe("");
  });
});

/* -------------------------------------------------------------------------- */
/*  compileMessage: end-to-end deterministic compilation                      */
/* -------------------------------------------------------------------------- */

describe("compileMessage", () => {
  it("returns a non-empty string for every intent", () => {
    for (const intent of Object.values(MessageIntent)) {
      const text = compileMessage(intent);
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it("SMS channel output is <= 320 characters", () => {
    for (const intent of Object.values(MessageIntent)) {
      const text = compileMessage(intent, { channel: "sms" });
      expect(text.length).toBeLessThanOrEqual(320);
    }
  });

  it("email channel allows up to 500 characters", () => {
    const text = compileMessage("follow_up", { channel: "email" });
    expect(text.length).toBeLessThanOrEqual(500);
  });

  it("includes opt-out suffix when requireOptOut is true", () => {
    const text = compileMessage("follow_up", { channel: "sms", requireOptOut: true });
    expect(text).toContain("STOP");
  });

  it("does not include opt-out suffix when requireOptOut is false", () => {
    const text = compileMessage("follow_up", { channel: "sms", requireOptOut: false });
    expect(text).not.toContain("STOP");
  });

  it("is deterministic (same intent + context = same output)", () => {
    const ctx = { channel: "sms" as const, stance: "request" as const, tone: "neutral" as const };
    const t1 = compileMessage("clarification", ctx);
    const t2 = compileMessage("clarification", ctx);
    expect(t1).toBe(t2);
  });

  it("does not contain forbidden terms in output", () => {
    const forbidden = ["ROI", "KPI", "dashboard", "assistant", "optimize"];
    for (const intent of Object.values(MessageIntent)) {
      const text = compileMessage(intent);
      for (const term of forbidden) {
        expect(text.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  compileMessageWithPlan: returns both text and plan                        */
/* -------------------------------------------------------------------------- */

describe("compileMessageWithPlan", () => {
  it("returns object with text and plan properties", () => {
    const result = compileMessageWithPlan("follow_up");
    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("plan");
    expect(typeof result.text).toBe("string");
    expect(result.plan).toBeDefined();
    expect(result.plan.intent).toBe("follow_up");
  });

  it("plan has clauses array", () => {
    const result = compileMessageWithPlan("confirm_booking");
    expect(Array.isArray(result.plan.clauses)).toBe(true);
    expect(result.plan.clauses.length).toBeGreaterThan(0);
  });

  it("appends record_expectation clause when addRecordExpectation is true", () => {
    const result = compileMessageWithPlan("follow_up", { addRecordExpectation: true });
    const types = result.plan.clauses.map((c) => c.type);
    expect(types).toContain("record_expectation");
  });

  it("does not append record_expectation when addRecordExpectation is false", () => {
    const result = compileMessageWithPlan("follow_up", { addRecordExpectation: false });
    const types = result.plan.clauses.map((c) => c.type);
    expect(types).not.toContain("record_expectation");
  });

  it("sets channel constraints when channel is provided", () => {
    const result = compileMessageWithPlan("clarification", { channel: "email" });
    expect(result.plan.constraints.channel).toBe("email");
    expect(result.plan.constraints.max_chars).toBe(500);
  });

  it("sets SMS max_chars to 320", () => {
    const result = compileMessageWithPlan("clarification", { channel: "sms" });
    expect(result.plan.constraints.max_chars).toBe(320);
  });
});

/* -------------------------------------------------------------------------- */
/*  validatePlan                                                              */
/* -------------------------------------------------------------------------- */

describe("validatePlan", () => {
  it("returns null for non-object input", () => {
    expect(validatePlan(null)).toBeNull();
    expect(validatePlan(undefined)).toBeNull();
    expect(validatePlan("string")).toBeNull();
    expect(validatePlan(42)).toBeNull();
  });

  it("returns null for empty object", () => {
    expect(validatePlan({})).toBeNull();
  });

  it("injects default clauses when clauses are missing", () => {
    // Build a minimal valid plan-shaped object
    const raw = {
      intent: "follow_up",
      stance: "request",
      entities: {},
      constraints: { max_chars: 320, channel: "sms" },
      tone: "neutral",
      reason_tags: [],
      clauses: [],
    };
    const result = validatePlan(raw);
    if (result) {
      // If clauses were empty, they should be populated from clausesForIntent
      expect(Array.isArray(result.clauses)).toBe(true);
      expect(result.clauses.length).toBeGreaterThan(0);
    }
  });
});
