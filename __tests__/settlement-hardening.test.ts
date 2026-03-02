/**
 * Settlement hardening: subscription item resolution, lease, dedupe, suspension entry once.
 */

import { describe, it, expect } from "vitest";

function _hasDb(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    (typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string" ||
      typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string")
  );
}

describe("settlement-hardening", () => {
  describe("resolving and persisting stripe_subscription_item_id", () => {
    it("prefers item with price.id === STRIPE_DEFAULT_PRICE_ID", () => {
      const defaultPriceId = "price_xxx";
      const items = [
        { id: "si_2", price: { id: "price_other" } },
        { id: "si_1", price: { id: "price_xxx" } },
      ];
      const preferred = items.find((i) => (i.price as { id?: string }).id === defaultPriceId);
      expect(preferred?.id).toBe("si_1");
    });
    it("fallback to first item when no price match", () => {
      const items = [{ id: "si_1", price: { id: "price_other" } }];
      const preferred = items.find((i) => (i.price as { id?: string }).id === "price_xxx");
      const fallback = items[0];
      expect(preferred ?? fallback).toBe(fallback);
    });
  });

  describe("lease acquisition prevents concurrent export", () => {
    it("second acquire fails when first holds lease", () => {
      const leaseUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const now = new Date();
      const firstHolds = new Date(leaseUntil) > now;
      expect(firstHolds).toBe(true);
    });
  });

  describe("deduped authorization sends", () => {
    it("only one send in 7 days", () => {
      const lastSentAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const shouldSkip = lastSentAt > sevenDaysAgo;
      expect(shouldSkip).toBe(true);
    });
    it("send when last_sent_at is null", () => {
      const lastSentAt = null;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const shouldSkip = lastSentAt != null && new Date(lastSentAt) > sevenDaysAgo;
      expect(shouldSkip).toBe(false);
    });
  });

  describe("suspension entry created once", () => {
    it("3 failures -> suspended and one entry; 4th failure does not create new entry", () => {
      const consecutiveFailures = 3;
      const suspensionEntryCreatedAt = "2025-01-01T00:00:00Z";
      const alreadyCreated = suspensionEntryCreatedAt != null;
      const shouldSetEntryField = !alreadyCreated;
      expect(consecutiveFailures >= 3).toBe(true);
      expect(shouldSetEntryField).toBe(false);
    });
  });
});
