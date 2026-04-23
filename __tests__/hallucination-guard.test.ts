import { describe, it, expect } from "vitest";
import {
  scanUtteranceForHallucinations,
  enforceHallucinationGuard,
  type WorkspaceFacts,
} from "../src/lib/voice/hallucination-guard";

describe("hallucination-guard — scanUtteranceForHallucinations", () => {
  it("blocks always-blocked phrases regardless of allowlist", () => {
    const r = scanUtteranceForHallucinations(
      "You'll get guaranteed results within 30 days.",
      { allowedGuarantees: ["guaranteed results"] },
    );
    expect(r.severity).toBe("block");
    const matched = r.findings.find((f) => f.reason === "always_blocked_phrase");
    expect(matched).toBeDefined();
  });

  it("blocks unverified price claims", () => {
    const r = scanUtteranceForHallucinations("Our product costs $99/mo.");
    expect(r.severity).toBe("block");
    expect(r.findings.some((f) => f.category === "price")).toBe(true);
  });

  it("allows price claims present in allowlist", () => {
    const facts: WorkspaceFacts = { allowedPrices: [/\$\d+\s?\/\s?mo/i] };
    const r = scanUtteranceForHallucinations("Our product costs $99/mo.", facts);
    // price_quote pattern may match the 'costs $99/mo' phrase — both detectors should allow
    const priceFindings = r.findings.filter((f) => f.category === "price");
    expect(priceFindings).toHaveLength(0);
  });

  it("blocks unverified compliance claims", () => {
    const r = scanUtteranceForHallucinations("We are HIPAA-compliant and SOC 2 Type 2 certified.");
    expect(r.severity).toBe("block");
    expect(r.findings.some((f) => f.category === "compliance_claim")).toBe(true);
  });

  it("warns on competitor comparative claims", () => {
    const r = scanUtteranceForHallucinations(
      "We're faster than HubSpot and cheaper than Salesforce.",
    );
    expect(["warn", "block"]).toContain(r.severity);
    expect(r.findings.some((f) => f.category === "competitor_claim")).toBe(true);
  });

  it("respects workspace blockedTerms", () => {
    const r = scanUtteranceForHallucinations(
      "This is definitely a cure-all solution.",
      { blockedTerms: ["cure-all"] },
    );
    expect(r.severity).toBe("block");
    expect(r.findings.some((f) => f.reason === "workspace_blocked_term")).toBe(true);
  });

  it("allows a fact-free pleasantry", () => {
    const r = scanUtteranceForHallucinations("Thanks for your time today, I appreciate it.");
    expect(r.severity).toBe("allow");
    expect(r.findings).toHaveLength(0);
  });

  it("empty utterance → allow / no findings", () => {
    const r = scanUtteranceForHallucinations("");
    expect(r.severity).toBe("allow");
    expect(r.findings).toHaveLength(0);
  });
});

describe("hallucination-guard — enforceHallucinationGuard", () => {
  it("returns safe fallback text when severity is block", () => {
    const { text, mutated, scan } = enforceHallucinationGuard("Our price is $999/mo flat.");
    expect(mutated).toBe(true);
    expect(text).not.toBe("Our price is $999/mo flat.");
    expect(scan.severity).toBe("block");
  });

  it("returns original text when nothing is blocked", () => {
    const { text, mutated } = enforceHallucinationGuard("Happy to help with that.");
    expect(mutated).toBe(false);
    expect(text).toBe("Happy to help with that.");
  });
});
