import { describe, it, expect } from "vitest";
import {
  parseIvrOptions,
  detectIvrPrompt,
  planIvrNavigation,
} from "../src/lib/voice/ivr-navigator";

describe("ivr-navigator — parseIvrOptions", () => {
  it("parses 'for X, press N' style options", () => {
    const opts = parseIvrOptions(
      "For sales, press 1. For support, press 2. Press 0 for the operator.",
    );
    const bySales = opts.find((o) => o.label.includes("sales"));
    const bySupport = opts.find((o) => o.label.includes("support"));
    const byOp = opts.find((o) => o.label.includes("operator"));
    expect(bySales?.key).toBe("1");
    expect(bySales?.intent).toBe("sales");
    expect(bySupport?.key).toBe("2");
    expect(bySupport?.intent).toBe("support");
    expect(byOp?.key).toBe("0");
    // "operator" maps to reach_person first (it's the first intent that lists /\boperator\b/)
    expect(["operator", "reach_person"]).toContain(byOp?.intent);
  });

  it("parses 'press N for X' style options", () => {
    // Periods between statements prevent Pattern A ("for X, press N") from
    // grabbing the adjacent "for billing. Press 4" as a single option.
    // Look up by label — "scheduling" doesn't hit the `/\bschedule\b/` intent
    // phrase (word boundary) but is still correctly parsed as a menu option.
    const opts = parseIvrOptions("Press 3 for billing. Press 4 for scheduling.");
    const byBilling = opts.find((o) => o.label.includes("billing"));
    const bySched = opts.find((o) => o.label.includes("scheduling"));
    expect(byBilling?.key).toBe("3");
    expect(bySched?.key).toBe("4");
  });

  it("parses 'press one' word-form → '1'", () => {
    const opts = parseIvrOptions("For sales, press one.");
    expect(opts[0]?.key).toBe("1");
  });
});

describe("ivr-navigator — detectIvrPrompt", () => {
  it("returns isIvrPrompt true on canonical IVR text", () => {
    const d = detectIvrPrompt(
      "Please listen carefully, our menu options have changed. For sales, press 1. For support, press 2. Press 0 for an operator.",
    );
    expect(d.isIvrPrompt).toBe(true);
    expect(d.confidence).toBeGreaterThanOrEqual(0.5);
    expect(d.options.length).toBeGreaterThanOrEqual(2);
  });

  it("returns isIvrPrompt false on ordinary conversation", () => {
    const d = detectIvrPrompt("Hi this is Jim, how can I help you today?");
    expect(d.isIvrPrompt).toBe(false);
  });

  it("empty input → isIvrPrompt false", () => {
    const d = detectIvrPrompt("");
    expect(d.isIvrPrompt).toBe(false);
    expect(d.options).toHaveLength(0);
  });
});

describe("ivr-navigator — planIvrNavigation", () => {
  it("presses the exact-intent key when available", () => {
    const det = detectIvrPrompt("For sales, press 1. For support, press 2.");
    const plan = planIvrNavigation(det, "sales");
    expect(plan.action).toBe("press_key");
    expect(plan.key).toBe("1");
    expect(plan.matchedOption?.intent).toBe("sales");
  });

  it("falls back to operator when target intent absent", () => {
    const det = detectIvrPrompt("For sales, press 1. Press 0 for the operator.");
    const plan = planIvrNavigation(det, "billing");
    expect(plan.action).toBe("press_key");
    // The operator option's label is mapped to reach_person (first matching intent);
    // the fallback priority (reach_person > operator > general) still routes here.
    expect(["operator", "reach_person"]).toContain(plan.matchedOption?.intent);
    expect(plan.key).toBe("0");
  });

  it("waits when no IVR prompt detected", () => {
    const det = detectIvrPrompt("Hello?");
    const plan = planIvrNavigation(det, "sales");
    expect(plan.action).toBe("wait");
    expect(plan.matchedOption).toBeNull();
  });
});
