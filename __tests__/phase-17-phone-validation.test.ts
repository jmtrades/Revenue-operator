/**
 * Phase 17 — Phone number validation + country + line-type hint.
 */

import { describe, it, expect } from "vitest";
import {
  validatePhoneNumber,
  normalizePhoneToE164,
  isPhoneSmsCapable,
} from "../src/lib/validation/phone-number";

describe("normalizePhoneToE164", () => {
  it("converts US 10-digit to +1XXXXXXXXXX", () => {
    expect(normalizePhoneToE164("(415) 555-1234")).toBe("+14155551234");
    expect(normalizePhoneToE164("4155551234")).toBe("+14155551234");
    expect(normalizePhoneToE164("415.555.1234")).toBe("+14155551234");
  });

  it("keeps + prefix unchanged if valid", () => {
    expect(normalizePhoneToE164("+442071838750")).toBe("+442071838750");
    expect(normalizePhoneToE164("+81312345678")).toBe("+81312345678");
  });

  it("returns null for garbage", () => {
    expect(normalizePhoneToE164("")).toBeNull();
    expect(normalizePhoneToE164("abc")).toBeNull();
    expect(normalizePhoneToE164("+abc")).toBeNull();
    expect(normalizePhoneToE164("123")).toBeNull();
  });

  it("handles 11-digit starting with 1 (US with country code)", () => {
    expect(normalizePhoneToE164("14155551234")).toBe("+14155551234");
  });
});

describe("validatePhoneNumber — US", () => {
  it("parses a San Francisco number", () => {
    const r = validatePhoneNumber("415-555-1234");
    expect(r.isValidSyntax).toBe(true);
    expect(r.countryCode).toBe("1");
    expect(r.countryIso).toBe("US");
    expect(r.npa).toBe("415");
    expect(r.region).toBe("CA");
  });

  it("parses a Texas Houston number", () => {
    const r = validatePhoneNumber("+17135551234");
    expect(r.region).toBe("TX");
  });

  it("parses a NYC number", () => {
    const r = validatePhoneNumber("212-555-1234");
    expect(r.region).toBe("NY");
  });

  it("flags toll-free NPA", () => {
    const r = validatePhoneNumber("800-555-1234");
    expect(r.lineType).toBe("toll_free");
    expect(isPhoneSmsCapable("800-555-1234")).toBe(false);
  });

  it("flags premium-rate 900 NPA", () => {
    const r = validatePhoneNumber("900-555-1234");
    expect(r.lineType).toBe("premium");
  });

  it("rejects invalid NPA starting with 0 or 1", () => {
    const r = validatePhoneNumber("+10155551234");
    expect(r.isValidSyntax).toBe(false);
    expect(r.issues).toContain("invalid_npa");
  });
});

describe("validatePhoneNumber — Canada", () => {
  it("detects Canadian NPA 416 as CA", () => {
    const r = validatePhoneNumber("+14165551234");
    expect(r.countryIso).toBe("CA");
    expect(r.npa).toBe("416");
  });

  it("detects Canadian NPA 604 (Vancouver)", () => {
    const r = validatePhoneNumber("+16045551234");
    expect(r.countryIso).toBe("CA");
  });
});

describe("validatePhoneNumber — international", () => {
  it("parses UK number as GB", () => {
    const r = validatePhoneNumber("+442071838750");
    expect(r.countryCode).toBe("44");
    expect(r.countryIso).toBe("GB");
  });

  it("parses Japan as JP", () => {
    const r = validatePhoneNumber("+81312345678");
    expect(r.countryIso).toBe("JP");
  });

  it("parses Germany as DE", () => {
    const r = validatePhoneNumber("+493012345678");
    expect(r.countryIso).toBe("DE");
  });

  it("parses Saudi Arabia 3-digit country code", () => {
    const r = validatePhoneNumber("+966112345678");
    expect(r.countryIso).toBe("SA");
  });

  it("parses Israel 3-digit country code", () => {
    const r = validatePhoneNumber("+972212345678");
    expect(r.countryIso).toBe("IL");
  });
});

describe("isPhoneSmsCapable", () => {
  it("allows normal mobile-capable US numbers", () => {
    expect(isPhoneSmsCapable("+14155551234")).toBe(true);
  });

  it("blocks toll-free", () => {
    expect(isPhoneSmsCapable("+18005551234")).toBe(false);
  });

  it("blocks premium", () => {
    expect(isPhoneSmsCapable("+19005551234")).toBe(false);
  });

  it("blocks unparseable", () => {
    expect(isPhoneSmsCapable("garbage")).toBe(false);
  });
});
