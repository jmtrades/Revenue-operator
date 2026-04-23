/**
 * Phase 13d — Industry disclaimer engine tests (pure).
 */

import { describe, it, expect } from "vitest";
import {
  ALL_PARTY_CONSENT_STATES,
  buildIndustryWorkspaceFacts,
  getRequiredDisclaimers,
  mergeIndustryFacts,
} from "../src/lib/industry/disclaimers";

describe("getRequiredDisclaimers — base industries", () => {
  it("healthcare → HIPAA privacy notice", () => {
    const rules = getRequiredDisclaimers({ industry: "healthcare" });
    expect(rules.some((r) => r.id === "hipaa_notice")).toBe(true);
  });

  it("dental and medical also get HIPAA", () => {
    for (const industry of ["dental", "medical", "mental_health", "senior_care"]) {
      const rules = getRequiredDisclaimers({ industry });
      expect(rules.some((r) => r.id === "hipaa_notice")).toBe(true);
    }
  });

  it("veterinary does NOT get HIPAA", () => {
    const rules = getRequiredDisclaimers({ industry: "veterinary" });
    expect(rules.some((r) => r.id === "hipaa_notice")).toBe(false);
  });

  it("financial_services → FINRA + RIA disclaimers", () => {
    const rules = getRequiredDisclaimers({ industry: "financial_services" });
    const ids = rules.map((r) => r.id);
    expect(ids).toContain("finra_advertising");
    expect(ids).toContain("ria_advertising");
  });

  it("legal → attorney advertising", () => {
    const rules = getRequiredDisclaimers({ industry: "legal" });
    expect(rules.some((r) => r.id === "attorney_advertising")).toBe(true);
  });

  it("real_estate → fair housing + brokerage", () => {
    const rules = getRequiredDisclaimers({ industry: "real_estate" });
    const ids = rules.map((r) => r.id);
    expect(ids).toContain("fair_housing");
    expect(ids).toContain("re_brokerage_disclosure");
  });

  it("insurance → licensed producer", () => {
    const rules = getRequiredDisclaimers({ industry: "insurance" });
    expect(rules.some((r) => r.id === "insurance_producer")).toBe(true);
  });

  it("auto → FTC used car", () => {
    const rules = getRequiredDisclaimers({ industry: "auto" });
    expect(rules.some((r) => r.id === "ftc_used_car")).toBe(true);
  });

  it("home_services → no federal mandatory rules", () => {
    const rules = getRequiredDisclaimers({ industry: "home_services" });
    expect(rules.length).toBe(0);
  });

  it("null/unknown industry → empty", () => {
    expect(getRequiredDisclaimers({ industry: null }).length).toBe(0);
    expect(getRequiredDisclaimers({ industry: "bogus" }).length).toBe(0);
  });
});

describe("getRequiredDisclaimers — state overrides", () => {
  it("CA + legal → California attorney advertising rule", () => {
    const rules = getRequiredDisclaimers({ industry: "legal", state: "CA" });
    expect(rules.some((r) => r.id === "ca_attorney_advertising")).toBe(true);
    // Still includes the base attorney advertising rule too
    expect(rules.some((r) => r.id === "attorney_advertising")).toBe(true);
  });

  it("CA + fitness → auto-renewal disclosure", () => {
    const rules = getRequiredDisclaimers({ industry: "fitness", state: "CA" });
    expect(rules.some((r) => r.id === "ca_auto_renewal")).toBe(true);
  });

  it("CA + tech → auto-renewal tech variant", () => {
    const rules = getRequiredDisclaimers({ industry: "tech", state: "CA" });
    expect(rules.some((r) => r.id === "ca_auto_renewal_tech")).toBe(true);
  });

  it("NY + legal → NY 22 NYCRR 1200 attorney advertising", () => {
    const rules = getRequiredDisclaimers({ industry: "legal", state: "NY" });
    expect(rules.some((r) => r.id === "ny_attorney_advertising")).toBe(true);
  });

  it("FL + legal → FL attorney advertising", () => {
    const rules = getRequiredDisclaimers({ industry: "legal", state: "FL" });
    expect(rules.some((r) => r.id === "fl_attorney_advertising")).toBe(true);
  });

  it("TX + real_estate → IABS", () => {
    const rules = getRequiredDisclaimers({ industry: "real_estate", state: "TX" });
    expect(rules.some((r) => r.id === "tx_iabs")).toBe(true);
  });

  it("state overrides are scoped to the specified industry", () => {
    // Fitness in TX has no state-specific rule — should just be empty
    const rules = getRequiredDisclaimers({ industry: "fitness", state: "TX" });
    expect(rules.length).toBe(0);
  });

  it("invalid state codes are ignored", () => {
    const rules = getRequiredDisclaimers({ industry: "legal", state: "XX" });
    // Base attorney advertising still present, no state override
    expect(rules.some((r) => r.id === "attorney_advertising")).toBe(true);
    expect(rules.some((r) => r.id.startsWith("ca_") || r.id.startsWith("ny_") || r.id.startsWith("fl_"))).toBe(false);
  });
});

describe("getRequiredDisclaimers — recording consent", () => {
  it("recording in one-party state → one-party disclaimer", () => {
    const rules = getRequiredDisclaimers({
      industry: "legal",
      state: "NY", // one-party
      isRecorded: true,
      channel: "voice",
    });
    expect(rules.some((r) => r.id === "recording_one_party")).toBe(true);
    expect(rules.some((r) => r.id === "recording_all_party")).toBe(false);
  });

  it("recording in all-party state → all-party disclaimer", () => {
    for (const state of ["CA", "FL", "IL", "MA", "MD", "PA", "WA"]) {
      const rules = getRequiredDisclaimers({
        industry: "legal",
        state,
        isRecorded: true,
        channel: "voice",
      });
      expect(ALL_PARTY_CONSENT_STATES.has(state)).toBe(true);
      expect(rules.some((r) => r.id === "recording_all_party")).toBe(true);
    }
  });

  it("recording not requested → no recording rule", () => {
    const rules = getRequiredDisclaimers({ industry: "legal", state: "CA", channel: "voice" });
    expect(rules.some((r) => r.id.startsWith("recording_"))).toBe(false);
  });
});

describe("getRequiredDisclaimers — debt collection + channels", () => {
  it("isDebtCollection=true → FDCPA mini-Miranda", () => {
    const rules = getRequiredDisclaimers({
      industry: "financial_services",
      isDebtCollection: true,
      channel: "voice",
    });
    expect(rules.some((r) => r.id === "fdcpa_mini_miranda")).toBe(true);
  });

  it("sms channel → TCPA stop + no email rule", () => {
    const rules = getRequiredDisclaimers({ industry: "fitness", channel: "sms" });
    const ids = rules.map((r) => r.id);
    expect(ids).toContain("tcpa_sms_stop");
    expect(ids).not.toContain("can_spam_unsubscribe");
  });

  it("email channel → CAN-SPAM + no sms rule", () => {
    const rules = getRequiredDisclaimers({ industry: "fitness", channel: "email" });
    const ids = rules.map((r) => r.id);
    expect(ids).toContain("can_spam_unsubscribe");
    expect(ids).not.toContain("tcpa_sms_stop");
  });

  it("voice channel excludes SMS-only rules", () => {
    const rules = getRequiredDisclaimers({ industry: "healthcare", channel: "voice" });
    expect(rules.some((r) => r.id === "tcpa_sms_stop")).toBe(false);
  });
});

describe("getRequiredDisclaimers — ordering + dedupe", () => {
  it("opening rules come before closing rules", () => {
    const rules = getRequiredDisclaimers({ industry: "fitness", channel: "sms" });
    // All rules include at least one closing (tcpa stop). Verify ordering.
    const indexOpening = rules.findIndex((r) => r.whenRequired === "opening");
    const indexClosing = rules.findIndex((r) => r.whenRequired === "closing");
    if (indexOpening !== -1 && indexClosing !== -1) {
      expect(indexOpening).toBeLessThan(indexClosing);
    }
  });

  it("no duplicate rule ids across industry + state stack", () => {
    const rules = getRequiredDisclaimers({
      industry: "legal",
      state: "CA",
      isRecorded: true,
      channel: "voice",
    });
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("buildIndustryWorkspaceFacts", () => {
  it("healthcare overlay includes HIPAA token + full text", () => {
    const facts = buildIndustryWorkspaceFacts({ industry: "healthcare" });
    expect(facts.allowedPolicies.some((p) => p.includes("HIPAA"))).toBe(true);
    expect(facts.allowedPolicies.some((p) => p.includes("HIPAA privacy practices"))).toBe(true);
  });

  it("legal overlay whitelists 'attorney advertising' token", () => {
    const facts = buildIndustryWorkspaceFacts({ industry: "legal" });
    expect(facts.allowedPolicies.some((p) => p.toLowerCase().includes("attorney advertising"))).toBe(true);
  });

  it("financial_services overlay whitelists 'past performance does not guarantee'", () => {
    const facts = buildIndustryWorkspaceFacts({ industry: "financial_services" });
    expect(
      facts.allowedPolicies.some((p) =>
        p.toLowerCase().includes("past performance does not guarantee future results"),
      ),
    ).toBe(true);
  });

  it("real_estate overlay whitelists fair housing", () => {
    const facts = buildIndustryWorkspaceFacts({ industry: "real_estate" });
    expect(facts.allowedPolicies.some((p) => p.toLowerCase().includes("equal housing opportunity"))).toBe(true);
  });

  it("auto overlay whitelists Buyer's Guide", () => {
    const facts = buildIndustryWorkspaceFacts({ industry: "auto" });
    expect(facts.allowedPolicies.some((p) => p.includes("Buyer's Guide"))).toBe(true);
  });

  it("unknown industry → empty overlay", () => {
    const facts = buildIndustryWorkspaceFacts({ industry: "bogus" });
    expect(facts.allowedPolicies.length).toBe(0);
  });
});

describe("mergeIndustryFacts", () => {
  it("merges overlay into existing WorkspaceFacts-shaped object", () => {
    const base = {
      allowedPolicies: ["our existing policy"],
      allowedGuarantees: ["satisfaction guaranteed"],
      allowedTimelines: ["same day"],
      allowedPrices: ["$99/mo"],
    };
    const overlay = buildIndustryWorkspaceFacts({ industry: "healthcare" });
    const merged = mergeIndustryFacts(base, overlay);
    expect(merged.allowedPolicies).toEqual([
      "our existing policy",
      ...overlay.allowedPolicies,
    ]);
    expect(merged.allowedGuarantees).toContain("satisfaction guaranteed");
    expect(merged.allowedTimelines).toContain("same day");
    expect((merged as { allowedPrices: string[] }).allowedPrices).toContain("$99/mo");
  });

  it("handles base with missing arrays", () => {
    const overlay = buildIndustryWorkspaceFacts({ industry: "legal" });
    const merged = mergeIndustryFacts({}, overlay);
    expect(merged.allowedPolicies?.length).toBeGreaterThan(0);
  });
});
