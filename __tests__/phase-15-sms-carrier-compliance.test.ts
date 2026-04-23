/**
 * Phase 15 — SMS carrier compliance (CTIA keyword handling + 10DLC/A2P tier).
 */

import { describe, it, expect } from "vitest";
import {
  classifySmsKeyword,
  OPT_OUT_KEYWORDS,
  HELP_KEYWORDS,
  OPT_IN_KEYWORDS,
  assessA2pState,
  unregisteredDefault,
} from "../src/lib/compliance/sms-carrier-compliance";

describe("classifySmsKeyword — opt-out", () => {
  it("detects STOP regardless of case", () => {
    expect(classifySmsKeyword("STOP").intent).toBe("opt_out");
    expect(classifySmsKeyword("stop").intent).toBe("opt_out");
    expect(classifySmsKeyword("Stop").intent).toBe("opt_out");
  });

  it("detects STOP with trailing punctuation", () => {
    expect(classifySmsKeyword("STOP!").intent).toBe("opt_out");
    expect(classifySmsKeyword("stop.").intent).toBe("opt_out");
    expect(classifySmsKeyword("  stop  ").intent).toBe("opt_out");
  });

  it("detects every mandated opt-out keyword", () => {
    for (const k of OPT_OUT_KEYWORDS) {
      expect(classifySmsKeyword(k).intent).toBe("opt_out");
    }
  });

  it("catches embedded STOP in a multi-word message (TCPA safe)", () => {
    expect(classifySmsKeyword("please stop texting me").intent).toBe("opt_out");
    expect(classifySmsKeyword("I want to unsubscribe now").intent).toBe("opt_out");
  });

  it("returns the compliance reply for opt-out", () => {
    const r = classifySmsKeyword("STOP");
    expect(r.requiredReply).toMatch(/unsubscribed/i);
    expect(r.requiredReply).toMatch(/START/i);
  });
});

describe("classifySmsKeyword — help", () => {
  it("detects HELP regardless of case", () => {
    expect(classifySmsKeyword("HELP").intent).toBe("help");
    expect(classifySmsKeyword("help").intent).toBe("help");
    expect(classifySmsKeyword("?").intent).toBe("help");
  });

  it("does NOT classify long messages with 'help' embedded as help", () => {
    // "I need help understanding your pricing plans" — 7 words, ambiguous.
    const r = classifySmsKeyword("I need help understanding your pricing plans");
    expect(r.intent).toBe("none");
  });

  it("returns the CTIA help reply", () => {
    const r = classifySmsKeyword("HELP");
    expect(r.requiredReply).toMatch(/STOP to unsubscribe/i);
  });

  it("accepts custom help reply", () => {
    const r = classifySmsKeyword("HELP", "Custom help text here");
    expect(r.requiredReply).toBe("Custom help text here");
  });
});

describe("classifySmsKeyword — opt-in", () => {
  it("detects START keyword for re-subscribe", () => {
    expect(classifySmsKeyword("START").intent).toBe("opt_in");
    expect(classifySmsKeyword("start").intent).toBe("opt_in");
    expect(classifySmsKeyword("YES").intent).toBe("opt_in");
  });

  it("every mandated opt-in keyword resolves", () => {
    for (const k of OPT_IN_KEYWORDS) {
      expect(classifySmsKeyword(k).intent).toBe("opt_in");
    }
  });

  it("returns the compliance re-subscribe reply", () => {
    const r = classifySmsKeyword("START");
    expect(r.requiredReply).toMatch(/re-subscribed/i);
  });
});

describe("classifySmsKeyword — none", () => {
  it("returns none for normal chatter", () => {
    const r = classifySmsKeyword("Yes I'd like to book an appointment");
    // "yes" is a 7-word message — should NOT opt-in trigger
    expect(r.intent).toBe("none");
  });

  it("returns none for empty body", () => {
    expect(classifySmsKeyword("").intent).toBe("none");
    expect(classifySmsKeyword("   ").intent).toBe("none");
  });

  it("every keyword set is disjoint with help/opt-in/opt-out", () => {
    for (const k of OPT_OUT_KEYWORDS) {
      expect(HELP_KEYWORDS.has(k)).toBe(false);
      expect(OPT_IN_KEYWORDS.has(k)).toBe(false);
    }
    for (const k of HELP_KEYWORDS) {
      expect(OPT_IN_KEYWORDS.has(k)).toBe(false);
    }
  });
});

describe("assessA2pState — throughput tiers", () => {
  const base = {
    brandStatus: "verified" as const,
    campaignStatus: "approved" as const,
    useCase: "customer_care",
    sampleMessages: ["Hi {name}, confirming appt at {time}"],
    lastCheckedAt: "2026-04-22T12:00:00Z",
  };

  it("T1 (score 76-100) gets 75 mps / 200k daily", () => {
    const a = assessA2pState({ ...base, vettingScore: 85 });
    expect(a.tier).toBe("T1");
    expect(a.mpsCap).toBe(75);
    expect(a.dailyMessageCap).toBe(200_000);
    expect(a.canSend).toBe(true);
  });

  it("T2 (score 26-75) gets 3 mps / 30k daily", () => {
    const a = assessA2pState({ ...base, vettingScore: 50 });
    expect(a.tier).toBe("T2");
    expect(a.mpsCap).toBe(3);
    expect(a.dailyMessageCap).toBe(30_000);
  });

  it("T3 (score 1-25) gets 1 mps / 3k daily", () => {
    const a = assessA2pState({ ...base, vettingScore: 10 });
    expect(a.tier).toBe("T3");
    expect(a.mpsCap).toBe(1);
    expect(a.dailyMessageCap).toBe(3_000);
  });

  it("T4 (score 0) gets 0.25 mps / 2k daily", () => {
    const a = assessA2pState({ ...base, vettingScore: 0 });
    expect(a.tier).toBe("T4");
    expect(a.mpsCap).toBe(0.25);
    expect(a.dailyMessageCap).toBe(2_000);
  });
});

describe("assessA2pState — blocked states", () => {
  it("unregistered brand cannot send", () => {
    const a = assessA2pState({
      brandStatus: "unregistered",
      campaignStatus: "unregistered",
      vettingScore: null,
      useCase: null,
      sampleMessages: [],
      lastCheckedAt: null,
    });
    expect(a.canSend).toBe(false);
    expect(a.tier).toBe("unregistered");
    expect(a.issues.some((i) => i.includes("not registered"))).toBe(true);
    expect(a.recommendedActions.length).toBeGreaterThan(0);
  });

  it("rejected brand surfaces blocking issue", () => {
    const a = assessA2pState({
      brandStatus: "rejected",
      campaignStatus: "unregistered",
      vettingScore: null,
      useCase: null,
      sampleMessages: [],
      lastCheckedAt: null,
    });
    expect(a.canSend).toBe(false);
    expect(a.issues.some((i) => /rejected/i.test(i))).toBe(true);
  });

  it("suspended campaign surfaces issue", () => {
    const a = assessA2pState({
      brandStatus: "verified",
      campaignStatus: "suspended",
      vettingScore: 50,
      useCase: "marketing",
      sampleMessages: ["Hi {name}"],
      lastCheckedAt: "2026-04-22T12:00:00Z",
    });
    expect(a.canSend).toBe(false);
    expect(a.issues.some((i) => /suspended/i.test(i))).toBe(true);
  });

  it("pending brand warns but doesn't hard-block", () => {
    const a = assessA2pState({
      brandStatus: "pending",
      campaignStatus: "pending",
      vettingScore: null,
      useCase: "marketing",
      sampleMessages: ["Hi {name}"],
      lastCheckedAt: "2026-04-22T12:00:00Z",
    });
    expect(a.canSend).toBe(false); // campaign not approved yet
    expect(a.issues.some((i) => /pending/i.test(i))).toBe(true);
  });
});

describe("unregisteredDefault", () => {
  it("returns non-sending state", () => {
    const a = unregisteredDefault();
    expect(a.canSend).toBe(false);
    expect(a.tier).toBe("unregistered");
    expect(a.mpsCap).toBe(0);
  });
});
