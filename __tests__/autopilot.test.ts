import { describe, it, expect } from "vitest";
import {
  isOptOut,
  containsForbiddenPhrase,
  mergeSettings,
} from "../src/lib/autopilot";

describe("Autopilot", () => {
  it("detects opt-out keywords", () => {
    const s = mergeSettings({ opt_out_keywords: ["stop", "unsubscribe"] });
    expect(isOptOut("please stop", s)).toBe(true);
    expect(isOptOut("UNSUBSCRIBE", s)).toBe(true);
    expect(isOptOut("I want to continue", s)).toBe(false);
  });

  it("detects forbidden phrases", () => {
    const s = mergeSettings({ forbidden_phrases: ["guaranteed refund"] });
    expect(containsForbiddenPhrase("we offer guaranteed refund", s)).toBe(true);
    expect(containsForbiddenPhrase("hello there", s)).toBe(false);
  });

  it("merges settings with defaults", () => {
    const s = mergeSettings({ risk_level: "aggressive" });
    expect(s.risk_level).toBe("aggressive");
    expect(s.business_hours.start).toBe("09:00");
  });
});
