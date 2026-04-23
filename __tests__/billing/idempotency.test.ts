/**
 * Phase 78/Phase 6 Task 6.2: Stripe idempotency key helper.
 * Key must be deterministic for (purpose, ...parts) within a day-bucket,
 * and differ across purposes.
 */

import { describe, it, expect } from "vitest";
import { stripeIdempotencyKey } from "@/lib/billing/stripe-idempotency";

describe("stripeIdempotencyKey", () => {
  it("is deterministic for same inputs and day", () => {
    const a = stripeIdempotencyKey("subscription-update", "ws_1", "prod_x");
    const b = stripeIdempotencyKey("subscription-update", "ws_1", "prod_x");
    expect(a).toBe(b);
  });

  it("differs when purpose differs", () => {
    expect(
      stripeIdempotencyKey("sub-create", "ws_1") ===
      stripeIdempotencyKey("invoice-create", "ws_1"),
    ).toBe(false);
  });

  it("differs when any part differs", () => {
    expect(
      stripeIdempotencyKey("sub-create", "ws_1") ===
      stripeIdempotencyKey("sub-create", "ws_2"),
    ).toBe(false);
  });

  it("returns a string that is safe to send as an HTTP header (ro_ prefix, <=255 chars)", () => {
    const k = stripeIdempotencyKey("sub-create", "ws_1");
    expect(k.startsWith("ro_")).toBe(true);
    expect(k.length).toBeLessThanOrEqual(255);
    // Must be printable ASCII
    expect(/^[\x21-\x7e]+$/.test(k)).toBe(true);
  });

  it("returns stable-length SHA-256 hex body regardless of input size", () => {
    const short = stripeIdempotencyKey("a");
    const longParts = Array.from({ length: 50 }, (_, i) => `part_${i}`);
    const long = stripeIdempotencyKey("a", ...longParts);
    expect(short.length).toBe(long.length);
  });
});
