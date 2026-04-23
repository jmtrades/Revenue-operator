/**
 * Phase 28 — International compliance.
 */

import { describe, it, expect } from "vitest";
import {
  assessInternational,
  listSupportedCountries,
} from "../src/lib/compliance/international-compliance";

describe("assessInternational — UK (PECR + UK GDPR)", () => {
  it("email with existing customer → soft opt-in", () => {
    const a = assessInternational({
      country: "GB",
      channel: "email",
      purpose: "telemarketing",
      existingCustomer: true,
    });
    expect(a.consentBasis).toBe("soft_opt_in_ok");
    expect(a.regimes).toContain("UK GDPR");
    expect(a.regimes).toContain("PECR");
  });

  it("SMS requires opt-in", () => {
    const a = assessInternational({
      country: "GB",
      channel: "sms",
      purpose: "telemarketing",
    });
    expect(a.consentBasis).toBe("opt_in_required");
    expect(a.requiredOptOut).toContain("STOP keyword");
  });

  it("call hours restricted to 8-21 local", () => {
    const a = assessInternational({ country: "GB", channel: "call", purpose: "telemarketing" });
    expect(a.localTimeWindow).toEqual({ startHour: 8, endHour: 21 });
  });
});

describe("assessInternational — Germany (strict)", () => {
  it("marketing calls require express written consent", () => {
    const a = assessInternational({ country: "DE", channel: "call", purpose: "telemarketing" });
    expect(a.expressWrittenRequired).toBe(true);
    expect(a.consentBasis).toBe("opt_in_required");
  });

  it("email always requires opt-in (no soft opt-in in ePrivacy transposition)", () => {
    const a = assessInternational({
      country: "DE",
      channel: "email",
      purpose: "telemarketing",
      existingCustomer: true,
    });
    expect(a.consentBasis).toBe("opt_in_required");
  });
});

describe("assessInternational — France (Bloctel)", () => {
  it("call compliance cites Bloctel", () => {
    const a = assessInternational({ country: "FR", channel: "call", purpose: "telemarketing" });
    expect(a.citations.some((c) => c.includes("Bloctel"))).toBe(true);
    expect(a.requiredOptOut.some((m) => m.includes("Bloctel"))).toBe(true);
  });

  it("call hours 10-20 per French law", () => {
    const a = assessInternational({ country: "FR", channel: "call", purpose: "telemarketing" });
    expect(a.localTimeWindow).toEqual({ startHour: 10, endHour: 20 });
  });
});

describe("assessInternational — Canada (CASL)", () => {
  it("email requires CASL disclosures", () => {
    const a = assessInternational({ country: "CA", channel: "email", purpose: "telemarketing" });
    expect(a.requiredDisclosures.some((d) => d.includes("mailing address"))).toBe(true);
    expect(a.requiredOptOut.some((o) => o.includes("60 days"))).toBe(true);
  });

  it("SMS requires express written consent", () => {
    const a = assessInternational({ country: "CA", channel: "sms", purpose: "telemarketing" });
    expect(a.expressWrittenRequired).toBe(true);
  });

  it("existing customer → soft opt-in for email", () => {
    const a = assessInternational({
      country: "CA",
      channel: "email",
      purpose: "telemarketing",
      existingCustomer: true,
    });
    expect(a.consentBasis).toBe("soft_opt_in_ok");
  });
});

describe("assessInternational — Australia (Spam Act)", () => {
  it("SMS opt-out hours 9-20", () => {
    const a = assessInternational({ country: "AU", channel: "sms", purpose: "telemarketing" });
    expect(a.localTimeWindow).toEqual({ startHour: 9, endHour: 20 });
  });

  it("call requires DNCR wash", () => {
    const a = assessInternational({ country: "AU", channel: "call", purpose: "telemarketing" });
    expect(a.requiredOptOut.some((o) => o.includes("DNCR"))).toBe(true);
  });
});

describe("assessInternational — India (DPDP + TRAI)", () => {
  it("blocks marketing SMS without explicit opt-in", () => {
    const a = assessInternational({
      country: "IN",
      channel: "sms",
      purpose: "telemarketing",
      hasExplicitOptIn: false,
    });
    expect(a.blocked).toBe(true);
    expect(a.blockedReason).toMatch(/TRAI DND/);
  });

  it("unblocks marketing SMS with explicit opt-in", () => {
    const a = assessInternational({
      country: "IN",
      channel: "sms",
      purpose: "telemarketing",
      hasExplicitOptIn: true,
    });
    expect(a.blocked).toBe(false);
  });
});

describe("assessInternational — purpose adjustments", () => {
  it("transactional email allows legitimate interest", () => {
    const a = assessInternational({
      country: "DE",
      channel: "email",
      purpose: "transactional",
    });
    expect(a.consentBasis).toBe("legitimate_interest_ok");
  });

  it("service call doesn't require express written consent", () => {
    const a = assessInternational({
      country: "DE",
      channel: "call",
      purpose: "service",
    });
    expect(a.expressWrittenRequired).toBe(false);
  });
});

describe("assessInternational — explicit opt-in short-circuit", () => {
  it("explicit opt-in → legitimate_interest_ok regardless of country default", () => {
    const a = assessInternational({
      country: "DE",
      channel: "email",
      purpose: "telemarketing",
      hasExplicitOptIn: true,
    });
    expect(a.consentBasis).toBe("legitimate_interest_ok");
  });
});

describe("assessInternational — unknown country", () => {
  it("falls back to conservative defaults", () => {
    const a = assessInternational({
      country: "ZZ",
      channel: "email",
      purpose: "telemarketing",
    });
    expect(a.regimes).toEqual(["unknown"]);
    expect(a.consentBasis).toBe("unverifiable");
    expect(a.expressWrittenRequired).toBe(true);
  });
});

describe("listSupportedCountries", () => {
  it("includes the ten core jurisdictions", () => {
    const list = listSupportedCountries();
    for (const c of ["GB", "DE", "FR", "CA", "AU", "SG", "BR", "IN", "ZA", "JP"]) {
      expect(list).toContain(c);
    }
  });

  it("returns them sorted", () => {
    const list = listSupportedCountries();
    const sorted = [...list].sort();
    expect(list).toEqual(sorted);
  });
});
