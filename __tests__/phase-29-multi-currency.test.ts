/**
 * Phase 29 — Multi-currency amount handling.
 */

import { describe, it, expect } from "vitest";
import {
  getCurrencyMeta,
  isSupportedCurrency,
  listSupportedCurrencies,
  formatAmount,
  convertAmount,
  formatDualCurrency,
  type FxRateTable,
} from "../src/lib/sales/multi-currency";

const RATE_TABLE: FxRateTable = {
  baseCurrency: "USD",
  rates: {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 150,
    CNY: 7.2,
    CAD: 1.36,
    AUD: 1.52,
    SEK: 10.5,
    INR: 83.5,
    BRL: 5.1,
    KRW: 1340,
  },
  fetchedAt: "2026-04-22T08:00:00.000Z",
  source: "ECB",
};

const STALE_TABLE: FxRateTable = {
  ...RATE_TABLE,
  fetchedAt: "2026-04-20T08:00:00.000Z", // >24h old from anchor
};

describe("getCurrencyMeta", () => {
  it("returns metadata for USD", () => {
    const meta = getCurrencyMeta("USD");
    expect(meta).not.toBeNull();
    expect(meta?.symbol).toBe("$");
    expect(meta?.decimals).toBe(2);
    expect(meta?.symbolPosition).toBe("before");
  });

  it("returns metadata for JPY (zero decimals)", () => {
    const meta = getCurrencyMeta("JPY");
    expect(meta?.decimals).toBe(0);
  });

  it("returns metadata for KRW (zero decimals)", () => {
    const meta = getCurrencyMeta("KRW");
    expect(meta?.decimals).toBe(0);
  });

  it("returns metadata for SEK (symbol after)", () => {
    const meta = getCurrencyMeta("SEK");
    expect(meta?.symbolPosition).toBe("after");
  });

  it("is case-insensitive", () => {
    expect(getCurrencyMeta("usd")).not.toBeNull();
    expect(getCurrencyMeta("Eur")).not.toBeNull();
  });

  it("returns null for unknown currency", () => {
    expect(getCurrencyMeta("XYZ")).toBeNull();
  });
});

describe("isSupportedCurrency", () => {
  it("true for USD, EUR, JPY", () => {
    expect(isSupportedCurrency("USD")).toBe(true);
    expect(isSupportedCurrency("EUR")).toBe(true);
    expect(isSupportedCurrency("JPY")).toBe(true);
  });

  it("false for made-up code", () => {
    expect(isSupportedCurrency("ZZZ")).toBe(false);
  });
});

describe("listSupportedCurrencies", () => {
  it("returns codes sorted alphabetically", () => {
    const list = listSupportedCurrencies();
    const codes = list.map((c) => c.code);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });

  it("includes at least 25 currencies", () => {
    expect(listSupportedCurrencies().length).toBeGreaterThanOrEqual(25);
  });
});

describe("formatAmount", () => {
  it("formats USD with symbol before", () => {
    const s = formatAmount(1234.56, "USD");
    // Intl may use non-breaking space; match flexibly
    expect(s).toMatch(/\$1,234\.56/);
  });

  it("respects noDecimals for USD", () => {
    const s = formatAmount(1234.56, "USD", { noDecimals: true });
    expect(s).toMatch(/\$1,235/); // rounded
    expect(s).not.toMatch(/\./);
  });

  it("formats JPY with no decimals even without noDecimals", () => {
    const s = formatAmount(12000, "JPY");
    expect(s).not.toMatch(/\./);
  });

  it("compact format abbreviates", () => {
    const s = formatAmount(1_200_000, "USD", { compact: true });
    // e.g., "$1.2M"
    expect(s).toMatch(/M|million/i);
  });

  it("unknown currency falls back", () => {
    const s = formatAmount(100, "ZZZ");
    expect(s).toContain("100");
    expect(s).toContain("ZZZ");
  });
});

describe("convertAmount", () => {
  it("USD→EUR uses direct rate", () => {
    const r = convertAmount(100, "USD", "EUR", RATE_TABLE, "2026-04-22T12:00:00.000Z");
    if ("error" in r) throw new Error("should not error");
    expect(r.amount).toBeCloseTo(92, 2);
    expect(r.currency).toBe("EUR");
    expect(r.rateUsed).toBeCloseTo(0.92, 4);
  });

  it("EUR→JPY converts via USD base", () => {
    const r = convertAmount(100, "EUR", "JPY", RATE_TABLE, "2026-04-22T12:00:00.000Z");
    if ("error" in r) throw new Error("should not error");
    // 100 EUR / 0.92 = ~108.7 USD; × 150 = ~16,304 JPY
    expect(r.amount).toBeCloseTo(16304.35, 1);
  });

  it("identity conversion (USD→USD) returns same amount, rate 1", () => {
    const r = convertAmount(42, "USD", "USD", RATE_TABLE, "2026-04-22T12:00:00.000Z");
    if ("error" in r) throw new Error("should not error");
    expect(r.amount).toBe(42);
    expect(r.rateUsed).toBe(1);
  });

  it("flags stale rates older than 24h", () => {
    const r = convertAmount(100, "USD", "EUR", STALE_TABLE, "2026-04-22T12:00:00.000Z");
    if ("error" in r) throw new Error("should not error");
    expect(r.stale).toBe(true);
  });

  it("fresh rates are not stale", () => {
    const r = convertAmount(100, "USD", "EUR", RATE_TABLE, "2026-04-22T12:00:00.000Z");
    if ("error" in r) throw new Error("should not error");
    expect(r.stale).toBe(false);
  });

  it("errors on unsupported from currency", () => {
    const r = convertAmount(100, "ZZZ", "USD", RATE_TABLE);
    expect("error" in r).toBe(true);
  });

  it("errors on unsupported to currency", () => {
    const r = convertAmount(100, "USD", "ZZZ", RATE_TABLE);
    expect("error" in r).toBe(true);
  });

  it("errors when rate missing for supported currency", () => {
    const partialTable: FxRateTable = {
      baseCurrency: "USD",
      rates: { EUR: 0.92 }, // INR intentionally missing
      fetchedAt: "2026-04-22T08:00:00.000Z",
      source: "test",
    };
    const r = convertAmount(100, "INR", "EUR", partialTable);
    expect("error" in r).toBe(true);
  });

  it("is case-insensitive on currency codes", () => {
    const r = convertAmount(100, "usd", "eur", RATE_TABLE, "2026-04-22T12:00:00.000Z");
    if ("error" in r) throw new Error("should not error");
    expect(r.currency).toBe("EUR");
  });

  it("includes source in result", () => {
    const r = convertAmount(100, "USD", "EUR", RATE_TABLE, "2026-04-22T12:00:00.000Z");
    if ("error" in r) throw new Error("should not error");
    expect(r.source).toBe("ECB");
  });
});

describe("formatDualCurrency", () => {
  it("renders native + converted when currencies differ", () => {
    const out = formatDualCurrency(100, "EUR", "USD", RATE_TABLE);
    expect(out.display).toContain("€100");
    expect(out.display).toMatch(/\(.*\$.*\)/);
  });

  it("renders only native when currencies match", () => {
    const out = formatDualCurrency(100, "USD", "USD", RATE_TABLE);
    expect(out.display).not.toContain("(");
  });

  it("falls back to native-only when conversion errors", () => {
    const out = formatDualCurrency(100, "USD", "ZZZ", RATE_TABLE);
    expect(out.display).toMatch(/\$100/);
    expect("error" in out.converted).toBe(true);
  });
});
