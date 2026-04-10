import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatCurrencyCents,
  convertCurrency,
  SUPPORTED_CURRENCIES,
} from "@/lib/currency";

describe("currency", () => {
  describe("SUPPORTED_CURRENCIES", () => {
    it("includes USD, EUR, GBP", () => {
      expect(SUPPORTED_CURRENCIES).toContain("USD");
      expect(SUPPORTED_CURRENCIES).toContain("EUR");
      expect(SUPPORTED_CURRENCIES).toContain("GBP");
    });

    it("has at least 5 currencies", () => {
      expect(SUPPORTED_CURRENCIES.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("formatCurrency", () => {
    it("formats USD in en-US locale", () => {
      const result = formatCurrency(100, "USD", "en-US");
      expect(result).toContain("100");
      expect(result).toMatch(/\$/);
    });

    it("formats zero amount", () => {
      const result = formatCurrency(0, "USD", "en-US");
      expect(result).toContain("0");
    });

    it("formats with 2 decimal places by default", () => {
      const result = formatCurrency(99.9, "USD", "en-US");
      expect(result).toContain("99.90");
    });

    it("falls back to USD for unsupported currency", () => {
      const result = formatCurrency(50, "XYZ", "en-US");
      expect(result).toMatch(/\$/);
    });

    it("uses compact notation for large amounts", () => {
      const result = formatCurrency(1500, "USD", "en-US", { compact: true });
      expect(result).toMatch(/1\.5K|1,500|\$1\.5K/i);
    });
  });

  describe("formatCurrencyCents", () => {
    it("converts cents to dollars", () => {
      const result = formatCurrencyCents(9900, "USD", "en-US");
      expect(result).toContain("99.00");
    });

    it("handles zero cents", () => {
      const result = formatCurrencyCents(0, "USD", "en-US");
      expect(result).toContain("0.00");
    });
  });

  describe("convertCurrency", () => {
    it("USD to USD returns same amount", () => {
      expect(convertCurrency(100, "USD", "USD")).toBe(100);
    });

    it("converts between currencies", () => {
      const converted = convertCurrency(100, "USD", "EUR");
      expect(converted).toBeGreaterThan(0);
      expect(converted).toBeLessThan(100); // EUR < USD
    });

    it("round-trip conversion is approximately identity", () => {
      const usdToEur = convertCurrency(100, "USD", "EUR");
      const backToUsd = convertCurrency(usdToEur, "EUR", "USD");
      expect(backToUsd).toBeCloseTo(100, 0);
    });

    it("unknown currency falls back to rate 1", () => {
      const result = convertCurrency(100, "XYZ", "USD");
      expect(result).toBe(100);
    });
  });
});
