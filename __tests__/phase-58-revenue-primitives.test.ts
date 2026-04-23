/**
 * Phase 58 — Revenue-core primitives.
 */
import { describe, it, expect } from "vitest";
import {
  toAccountId,
  toDealId,
  toContactId,
  toOwnerId,
  toOrgId,
  toIdempotencyKey,
  ISODateSchema,
  toISODate,
  daysBetween,
  addDays,
  isoBefore,
  isoAfter,
  moneyFromMajor,
  moneyMajor,
  moneyAdd,
  moneySub,
  moneyScale,
  moneyEquals,
  moneyCmp,
  currencyScale,
  toProbability,
  clampProbability,
  toRate,
  stageRank,
  stagesSkipped,
  safeValidate,
  CurrencySchema,
  StageSchema,
  MoneySchema,
} from "../src/lib/revenue-core/primitives";

describe("id schemas", () => {
  it("accepts typical ids", () => {
    expect(toAccountId("acc_123")).toBe("acc_123");
    expect(toDealId("deal-abc")).toBe("deal-abc");
    expect(toContactId("c1")).toBe("c1");
    expect(toOwnerId("rep_9")).toBe("rep_9");
    expect(toOrgId("org1")).toBe("org1");
    expect(toIdempotencyKey("idem-xyz")).toBe("idem-xyz");
  });

  it("rejects empty", () => {
    expect(() => toAccountId("")).toThrow();
  });

  it("rejects whitespace / special chars", () => {
    expect(() => toAccountId("acc 1")).toThrow();
    expect(() => toAccountId("acc/1")).toThrow();
    expect(() => toAccountId("' OR 1=1")).toThrow();
  });

  it("rejects leading punctuation", () => {
    expect(() => toAccountId("-bad")).toThrow();
    expect(() => toAccountId("_bad")).toThrow();
  });

  it("rejects > 128 chars", () => {
    expect(() => toAccountId("a".repeat(129))).toThrow();
  });
});

describe("ISODate normalization", () => {
  it("canonicalizes short and long forms to same string", () => {
    const a = toISODate("2026-04-22");
    const b = toISODate("2026-04-22T00:00:00Z");
    const c = toISODate("2026-04-22T00:00:00.000+00:00");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("rejects garbage", () => {
    expect(() => toISODate("not-a-date")).toThrow();
  });

  it("daysBetween computes signed delta", () => {
    const a = toISODate("2026-01-01T00:00:00Z");
    const b = toISODate("2026-01-11T00:00:00Z");
    expect(daysBetween(a, b)).toBe(10);
    expect(daysBetween(b, a)).toBe(-10);
  });

  it("addDays round-trips", () => {
    const a = toISODate("2026-01-01T00:00:00Z");
    expect(addDays(a, 30)).toBe(toISODate("2026-01-31T00:00:00Z"));
    expect(addDays(a, -1)).toBe(toISODate("2025-12-31T00:00:00Z"));
  });

  it("isoBefore / isoAfter are strict", () => {
    const a = toISODate("2026-01-01");
    const b = toISODate("2026-01-02");
    expect(isoBefore(a, b)).toBe(true);
    expect(isoAfter(b, a)).toBe(true);
    expect(isoBefore(a, a)).toBe(false);
    expect(isoAfter(a, a)).toBe(false);
  });

  it("safeValidate returns structured failure on bad ISO", () => {
    const r = safeValidate(ISODateSchema, "garbage");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.length).toBeGreaterThan(0);
    }
  });
});

describe("Money", () => {
  it("uses integer minor units — no float drift", () => {
    const a = moneyFromMajor(0.1, "USD");
    const b = moneyFromMajor(0.2, "USD");
    const c = moneyAdd(a, b);
    // 0.1 + 0.2 !== 0.3 in floats, but with minor units we get 10 + 20 = 30.
    expect(c.minor).toBe(30);
    expect(moneyMajor(c)).toBe(0.3);
  });

  it("JPY has no decimals", () => {
    expect(currencyScale("JPY")).toBe(1);
    const jpy = moneyFromMajor(1234, "JPY");
    expect(jpy.minor).toBe(1234);
    expect(moneyMajor(jpy)).toBe(1234);
  });

  it("rejects cross-currency add / sub", () => {
    const usd = moneyFromMajor(100, "USD");
    const eur = moneyFromMajor(100, "EUR");
    expect(() => moneyAdd(usd, eur)).toThrow(/currency mismatch/);
    expect(() => moneySub(usd, eur)).toThrow(/currency mismatch/);
    expect(() => moneyCmp(usd, eur)).toThrow(/currency mismatch/);
  });

  it("moneyScale rounds half-away-from-zero", () => {
    const a = moneyFromMajor(1, "USD");
    const half = moneyScale(a, 0.5);
    expect(half.minor).toBe(50);
  });

  it("moneyEquals / moneyCmp", () => {
    const a = moneyFromMajor(100, "USD");
    const b = moneyFromMajor(100, "USD");
    const c = moneyFromMajor(200, "USD");
    expect(moneyEquals(a, b)).toBe(true);
    expect(moneyCmp(a, b)).toBe(0);
    expect(moneyCmp(a, c)).toBe(-1);
    expect(moneyCmp(c, a)).toBe(1);
  });

  it("MoneySchema rejects non-integer minor", () => {
    expect(() => MoneySchema.parse({ minor: 10.5, currency: "USD" })).toThrow();
    expect(() => MoneySchema.parse({ minor: Infinity, currency: "USD" })).toThrow();
  });

  it("rejects unknown currency", () => {
    expect(() => CurrencySchema.parse("ABC")).toThrow();
  });
});

describe("Probability & Rate", () => {
  it("accepts [0,1] for probability", () => {
    expect(toProbability(0)).toBe(0);
    expect(toProbability(0.5)).toBe(0.5);
    expect(toProbability(1)).toBe(1);
  });

  it("rejects out-of-range probability", () => {
    expect(() => toProbability(-0.01)).toThrow();
    expect(() => toProbability(1.01)).toThrow();
    expect(() => toProbability(NaN)).toThrow();
  });

  it("clampProbability saturates", () => {
    expect(clampProbability(-5)).toBe(0);
    expect(clampProbability(1.5)).toBe(1);
    expect(clampProbability(NaN)).toBe(0);
    expect(clampProbability(0.3)).toBeCloseTo(0.3, 12);
  });

  it("toRate honors [-1, 5] window", () => {
    expect(toRate(0)).toBe(0);
    expect(toRate(-0.5)).toBe(-0.5);
    expect(toRate(4.99)).toBeCloseTo(4.99, 2);
    expect(() => toRate(-1.1)).toThrow();
    expect(() => toRate(5.1)).toThrow();
  });
});

describe("Stages", () => {
  it("canonical ordering", () => {
    expect(stageRank("prospecting")).toBe(0);
    expect(stageRank("closed_won")).toBe(6);
  });

  it("stagesSkipped counts gaps", () => {
    expect(stagesSkipped("prospecting", "qualification")).toBe(0);
    expect(stagesSkipped("prospecting", "proposal")).toBe(3);
    expect(stagesSkipped("negotiation", "prospecting")).toBe(0); // backward is 0
  });

  it("StageSchema rejects unknown stage", () => {
    expect(() => StageSchema.parse("won")).toThrow();
    expect(() => StageSchema.parse("PROSPECTING")).toThrow();
  });
});

describe("safeValidate envelope", () => {
  it("returns ok true for valid", () => {
    const r = safeValidate(CurrencySchema, "USD");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("USD");
  });

  it("returns structured issues on failure", () => {
    const r = safeValidate(MoneySchema, { minor: "bad", currency: "USD" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.path === "minor")).toBe(true);
    }
  });
});
