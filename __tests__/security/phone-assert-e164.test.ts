/**
 * Phase 78/Phase 3 — assertE164 / normalizePhone defense-in-depth.
 *
 * `assertE164` is called right before we interpolate a phone number into a
 * PostgREST `.or(...)` or `.in(...)` filter. It MUST reject any value that
 * isn't a strict E.164 string, because the interpolation site splits on
 * commas, dots, and parentheses — injecting those characters lets an
 * attacker graft arbitrary filters onto the query.
 */
import { describe, it, expect } from "vitest";
import { assertE164, normalizePhone } from "@/lib/security/phone";

describe("assertE164", () => {
  it("accepts a plain E.164", () => {
    expect(assertE164("+14155551234")).toBe("+14155551234");
  });

  it("accepts an international E.164", () => {
    expect(assertE164("+442071838750")).toBe("+442071838750");
  });

  it("rejects PostgREST injection payloads", () => {
    // Comma — grafts a second filter clause.
    expect(() => assertE164("+14155551234,1234567890)")).toThrow();
    // Quote — SQL injection marker.
    expect(() => assertE164("' OR '1'='1")).toThrow();
    // Dots / parens / `.or.` — PostgREST operator injection.
    expect(() => assertE164("+1415.or.(id.eq.uuid)")).toThrow();
    // Embedded whitespace.
    expect(() => assertE164("+1 415 555 1234")).toThrow();
    // Leading-zero country code.
    expect(() => assertE164("+0415555")).toThrow();
  });

  it("rejects non-E.164", () => {
    expect(() => assertE164("4155551234")).toThrow();
    expect(() => assertE164("")).toThrow();
    expect(() => assertE164(null as unknown as string)).toThrow();
    expect(() => assertE164(undefined as unknown as string)).toThrow();
    expect(() => assertE164(415 as unknown as string)).toThrow();
    expect(() => assertE164({} as unknown as string)).toThrow();
    // Too short (E.164 requires at least 2 subscriber digits).
    expect(() => assertE164("+1")).toThrow();
    // Too long (E.164 max 15 digits after +).
    expect(() => assertE164("+1234567890123456")).toThrow();
  });
});

describe("normalizePhone", () => {
  it("normalizes US-formatted inputs to +1XXXXXXXXXX", () => {
    expect(normalizePhone("(415) 555-1234")).toBe("+14155551234");
    expect(normalizePhone("415-555-1234")).toBe("+14155551234");
    expect(normalizePhone("415.555.1234")).toBe("+14155551234");
    expect(normalizePhone("4155551234")).toBe("+14155551234");
  });

  it("preserves valid E.164 inputs", () => {
    expect(normalizePhone("+14155551234")).toBe("+14155551234");
    expect(normalizePhone("+442071838750")).toBe("+442071838750");
  });

  it("strips US country-code prefix from 11-digit inputs", () => {
    expect(normalizePhone("14155551234")).toBe("+14155551234");
    expect(normalizePhone("1 415 555 1234")).toBe("+14155551234");
  });

  it("returns null on unrecoverable input", () => {
    expect(normalizePhone("hello")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone(123)).toBeNull();
    // Injection payloads must not normalize to anything — the punctuation is
    // discarded, but the remaining digit run has to still pass E.164.
    expect(normalizePhone("+14155551234,1234567890)")).toBeNull();
  });

  it("rejects too-short / too-long digit sequences", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("1234567890123456789")).toBeNull();
  });
});
