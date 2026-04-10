import { describe, it, expect } from "vitest";
import { normalizePhoneE164, phoneDigitsOnly, isValidPhoneLength } from "@/lib/phone/normalize";

describe("phone normalization", () => {
  describe("normalizePhoneE164", () => {
    it("returns empty for null/undefined/empty", () => {
      expect(normalizePhoneE164(null)).toBe("");
      expect(normalizePhoneE164(undefined)).toBe("");
      expect(normalizePhoneE164("")).toBe("");
    });

    it("normalizes US 10-digit to +1 prefix", () => {
      expect(normalizePhoneE164("2125551234")).toBe("+12125551234");
    });

    it("normalizes US 11-digit starting with 1", () => {
      expect(normalizePhoneE164("12125551234")).toBe("+12125551234");
    });

    it("handles +1 prefix already present", () => {
      expect(normalizePhoneE164("+12125551234")).toBe("+12125551234");
    });

    it("strips formatting characters", () => {
      expect(normalizePhoneE164("(212) 555-1234")).toBe("+12125551234");
      expect(normalizePhoneE164("212-555-1234")).toBe("+12125551234");
      expect(normalizePhoneE164("212.555.1234")).toBe("+12125551234");
    });

    it("handles 00 international prefix", () => {
      expect(normalizePhoneE164("004412345678901")).toBe("+4412345678901");
    });

    it("passes through international numbers with + prefix", () => {
      expect(normalizePhoneE164("+442071234567")).toBe("+442071234567");
    });

    it("handles international 12-digit number without prefix", () => {
      expect(normalizePhoneE164("442071234567")).toBe("+442071234567");
    });

    it("returns raw for too-short numbers", () => {
      expect(normalizePhoneE164("12345")).toBe("12345");
    });
  });

  describe("phoneDigitsOnly", () => {
    it("strips non-digits", () => {
      expect(phoneDigitsOnly("+1 (212) 555-1234")).toBe("12125551234");
    });

    it("returns empty for null", () => {
      expect(phoneDigitsOnly(null)).toBe("");
    });
  });

  describe("isValidPhoneLength", () => {
    it("returns true for 10-digit number", () => {
      expect(isValidPhoneLength("2125551234")).toBe(true);
    });

    it("returns true for 15-digit number", () => {
      expect(isValidPhoneLength("123456789012345")).toBe(true);
    });

    it("returns false for 9-digit number", () => {
      expect(isValidPhoneLength("123456789")).toBe(false);
    });

    it("returns false for 16-digit number", () => {
      expect(isValidPhoneLength("1234567890123456")).toBe(false);
    });
  });
});
