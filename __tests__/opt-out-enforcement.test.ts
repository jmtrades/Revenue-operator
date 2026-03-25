import { describe, it, expect } from "vitest";
import { checkPolicy, isOptOut } from "../src/lib/autopilot";

describe("Opt-out enforcement", () => {
  const baseSettings = {
    risk_level: "balanced" as const,
    business_hours: { start: "09:00", end: "17:00", timezone: "UTC", days: [1, 2, 3, 4, 5] },
    forbidden_phrases: [],
    vip_rules: { exclude_from_messaging: false, exclude_from_calls: false, domains: [] },
    opt_out_keywords: ["stop", "unsubscribe", "opt out"],
    safe_fallback_action: "clarifying_question",
  };

  it("checkPolicy blocks when lead.opt_out is true", () => {
    const r = checkPolicy(
      { opt_out: true },
      "Hello",
      "clarifying_question",
      baseSettings,
      "ENGAGED"
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("opt_out");
  });

  it("checkPolicy blocks when message contains opt-out keyword", () => {
    const r = checkPolicy(
      { opt_out: false },
      "please unsubscribe me",
      "clarifying_question",
      baseSettings,
      "ENGAGED"
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("opt_out");
  });

  it("isOptOut detects keywords", () => {
    expect(isOptOut("stop", baseSettings)).toBe(true);
    expect(isOptOut("UNSUBSCRIBE", baseSettings)).toBe(true);
    expect(isOptOut("opt out now", baseSettings)).toBe(true);
    expect(isOptOut("hello", baseSettings)).toBe(false);
  });
});
