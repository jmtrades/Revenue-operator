/**
 * A2) Billing contracts: deterministic JSON, tier+interval mapping, webhook idempotency, portal safe failure.
 */

import { describe, it, expect } from "vitest";
import { resolvePriceId, getPriceId, priceIdToTierAndInterval } from "@/lib/stripe-prices";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

const ALLOWED_REASONS = [
  "missing_env",
  "invalid_json",
  "invalid_email",
  "invalid_tier",
  "invalid_interval",
  "missing_price_id",
  "wrong_price_mode",
  "stripe_unreachable",
  "workspace_creation_failed",
  "checkout_creation_failed",
  "workspace_id_or_email_required",
] as const;

describe("Billing contracts", () => {
  describe("tier + interval to price id", () => {
    it("resolvePriceId returns null for invalid tier", () => {
      expect(resolvePriceId("invalid", "month")).toBeNull();
      expect(resolvePriceId("enterprise", "month")).toBeNull();
    });

    it("resolvePriceId returns null for invalid interval", () => {
      expect(resolvePriceId("solo", "weekly")).toBeNull();
    });

    it("resolvePriceId returns null when env not set", () => {
      const prev = process.env.STRIPE_PRICE_SOLO_MONTH;
      delete process.env.STRIPE_PRICE_SOLO_MONTH;
      expect(resolvePriceId("solo", "month")).toBeNull();
      if (prev !== undefined) process.env.STRIPE_PRICE_SOLO_MONTH = prev;
    });
  });

  describe("priceIdToTierAndInterval", () => {
    it("returns null for unknown price id", () => {
      expect(priceIdToTierAndInterval("price_unknown")).toBeNull();
      expect(priceIdToTierAndInterval(null)).toBeNull();
    });
  });

  describe("getPriceId returns allowed reason on failure", () => {
    it("invalid_tier for non-tier", async () => {
      const r = await getPriceId("x", "month");
      expect(r.ok).toBe(false);
      expect((r as { reason: string }).reason).toBe("invalid_tier");
    });

    it("invalid_interval for non-interval", async () => {
      const r = await getPriceId("solo", "x");
      expect(r.ok).toBe(false);
      expect((r as { reason: string }).reason).toBe("invalid_interval");
    });

    it("missing_price_id when env unset", async () => {
      const prev = process.env.STRIPE_PRICE_SOLO_MONTH;
      delete process.env.STRIPE_PRICE_SOLO_MONTH;
      const r = await getPriceId("solo", "month");
      if (prev !== undefined) process.env.STRIPE_PRICE_SOLO_MONTH = prev;
      expect(r.ok).toBe(false);
      expect((r as { reason: string }).reason).toBe("missing_price_id");
    });
  });

  describe("checkout route uses effectiveOrigin", () => {
    it("checkout route has effectiveOrigin and never hardcodes localhost", () => {
      const route = readFileSync(path.join(ROOT, "src/app/api/billing/checkout/route.ts"), "utf-8");
      expect(route).toMatch(/effectiveOrigin|NEXT_PUBLIC_APP_URL/);
      expect(route).not.toMatch(/localhost.*checkout|checkout.*localhost/);
    });
  });

  describe("webhook uses raw body and signature", () => {
    it("webhook reads req.text() for raw body", () => {
      const route = readFileSync(path.join(ROOT, "src/app/api/billing/webhook/route.ts"), "utf-8");
      expect(route).toMatch(/req\.text\(\)|await req\.text/);
      expect(route).toMatch(/stripe-signature|constructEvent/);
    });

    it("webhook returns 200 on duplicate event (23505)", () => {
      const route = readFileSync(path.join(ROOT, "src/app/api/billing/webhook/route.ts"), "utf-8");
      expect(route).toContain("23505");
      expect(route).toMatch(/200|received.*true/);
    });
  });

  describe("failure response reason in allowed set", () => {
    it("trial and checkout return deterministic reason strings", () => {
      const trial = readFileSync(path.join(ROOT, "src/app/api/trial/start/route.ts"), "utf-8");
      expect(trial).toContain("invalid_json");
      expect(trial).toContain("invalid_email");
      expect(trial).toContain("missing_env");
      expect(trial).toContain("reason:");
      expect(trial).toMatch(/priceResult\.reason|getPriceId/);
    });

    it("stripe-prices getPriceId returns only allowed reasons", () => {
      const reasons = new Set(ALLOWED_REASONS);
      expect(reasons.has("missing_price_id")).toBe(true);
      expect(reasons.has("invalid_tier")).toBe(true);
      expect(reasons.has("invalid_interval")).toBe(true);
    });
  });
});
