/**
 * Integration tests for billing routes (trial start + checkout)
 * Mocks Stripe API to verify response contracts, idempotency, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Stripe (price type overridable via global for wrong_price_mode test)
const mockStripeCustomer = { id: "cus_test123" };
const mockStripeSession = { id: "cs_test123", url: "https://checkout.stripe.com/test" };
(globalThis as Record<string, string>).__billingMockPriceType = "recurring";

vi.mock("stripe", () => ({
  default: function Stripe() {
    const mockPriceType = (globalThis as Record<string, string>).__billingMockPriceType ?? "recurring";
    return {
      customers: {
        create: vi.fn(() => Promise.resolve(mockStripeCustomer)),
        update: vi.fn(() => Promise.resolve(mockStripeCustomer)),
      },
      prices: {
        retrieve: vi.fn(() => Promise.resolve({ id: "price_test", type: mockPriceType })),
      },
      checkout: {
        sessions: {
          create: vi.fn(() => Promise.resolve(mockStripeSession)),
        },
      },
    };
  },
}));

// Mock database (mockExistingUserId set in idempotent test so user lookup returns existing)
const mockWorkspace = {
  id: "ws_test",
  owner_id: "user_test",
  billing_status: null as string | null,
  stripe_subscription_id: null as string | null,
  stripe_customer_id: null as string | null,
};
(globalThis as Record<string, unknown>).__billingMockExistingUserId = null as string | null;

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (table: string) => {
      if (table === "workspaces") {
        const wsRow = () => Promise.resolve({ data: mockWorkspace });
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: wsRow,
              order: () => ({
                limit: () => ({ maybeSingle: wsRow }),
              }),
            }),
            order: () => ({
              limit: () => ({ maybeSingle: wsRow }),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === "users") {
        const existingId = (globalThis as Record<string, unknown>).__billingMockExistingUserId as string | null;
        const userRow = () =>
          Promise.resolve({ data: existingId ? { id: existingId } : null });
        return {
          select: () => ({
            eq: (col: string) => ({
              limit: () => ({ maybeSingle: userRow }),
              maybeSingle: () =>
                col === "id"
                  ? Promise.resolve({ data: { email: "test@example.com" } })
                  : userRow(),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
        };
      }
      return {
        insert: () => Promise.resolve({ error: null }),
        upsert: () => Promise.resolve({ error: null }),
      };
    },
  }),
}));

vi.mock("@/lib/auth/session-edge", () => ({
  jsonWithSession: (data: unknown) => {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
}));

describe("Billing Integration Tests", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    // Reset mock workspace state
    mockWorkspace.billing_status = null;
    mockWorkspace.stripe_subscription_id = null;
    mockWorkspace.stripe_customer_id = null;
    // Phase 78/Phase 6: reset cached Stripe singleton so mock closure is fresh per test
    const { __resetStripeForTests } = await import("@/lib/billing/stripe-client");
    __resetStripeForTests();
  });

  describe("POST /api/billing/checkout", () => {
    async function callCheckout(body: { workspace_id?: string; email?: string; tier?: string; interval?: string }) {
      const { POST } = await import("@/app/api/billing/checkout/route");
      const req = new NextRequest("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return POST(req);
    }

    it("returns ok: false with reason missing_env when STRIPE_SECRET_KEY is missing", async () => {
      process.env.STRIPE_SECRET_KEY = undefined;
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_test";
      process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

      const res = await callCheckout({ workspace_id: "ws_test", tier: "solo", interval: "month" });
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data).toHaveProperty("ok", false);
      expect(data).toHaveProperty("reason", "missing_env");
    });

    it("returns ok: false with reason missing_price_id when price for tier is missing", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test";
      process.env.STRIPE_PRICE_SOLO_MONTH = undefined;
      process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

      const res = await callCheckout({ workspace_id: "ws_test", tier: "solo", interval: "month" });
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data).toHaveProperty("ok", false);
      expect(data).toHaveProperty("reason", "missing_price_id");
    });

    it("returns ok: false with reason wrong_price_mode when price type is not recurring", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test";
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_test";
      process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

      (globalThis as Record<string, string>).__billingMockPriceType = "one_time";
      const res = await callCheckout({ workspace_id: "ws_test", tier: "solo", interval: "month" });
      const data = await res.json();
      (globalThis as Record<string, string>).__billingMockPriceType = "recurring";

      expect(res.status).toBe(503);
      expect(data).toHaveProperty("ok", false);
      expect(data).toHaveProperty("reason", "wrong_price_mode");
    });

    it("returns ok: true with reason already_active when workspace has active subscription", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test";
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_test";
      process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

      mockWorkspace.billing_status = "trial";
      mockWorkspace.stripe_subscription_id = "sub_test";

      const res = await callCheckout({ workspace_id: "ws_test", tier: "solo", interval: "month" });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty("ok", true);
      expect(data).toHaveProperty("reason", "already_active");
      expect(data).toHaveProperty("workspace_id", "ws_test");
    });

    it("returns ok: true with checkout_url on success", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test";
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_test";
      process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

      const res = await callCheckout({ workspace_id: "ws_test", tier: "solo", interval: "month" });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty("ok", true);
      expect(data).toHaveProperty("checkout_url");
      expect(data.checkout_url).toBe("https://checkout.stripe.com/test");
    });

    it("is idempotent: repeated call with same workspace_id returns already_active", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test";
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_test";
      process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

      // First call succeeds
      const res1 = await callCheckout({ workspace_id: "ws_test", tier: "solo", interval: "month" });
      const data1 = await res1.json();
      expect(data1.ok).toBe(true);

      // Update mock to simulate subscription created
      mockWorkspace.billing_status = "trial";
      mockWorkspace.stripe_subscription_id = "sub_test";

      // Second call returns already_active
      const res2 = await callCheckout({ workspace_id: "ws_test", tier: "solo", interval: "month" });
      const data2 = await res2.json();

      expect(res2.status).toBe(200);
      expect(data2).toHaveProperty("ok", true);
      expect(data2).toHaveProperty("reason", "already_active");
    });
  });

  describe("POST /api/trial/start", () => {
    async function callTrialStart(body: { email: string; hired_roles?: string[]; business_type?: string; tier?: string; interval?: string }) {
      const { POST } = await import("@/app/api/trial/start/route");
      const req = new NextRequest("http://localhost/api/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return POST(req);
    }

    it("returns ok: false with reason invalid_email for invalid email", async () => {
      const res = await callTrialStart({ email: "invalid-email" });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toHaveProperty("ok", false);
      expect(data).toHaveProperty("reason", "invalid_email");
    });

    it("returns ok: true with workspace_id and checkout_url on success", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test";
      process.env.STRIPE_PRICE_SOLO_MONTH = "price_test";
      process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

      const res = await callTrialStart({ email: "test@example.com", tier: "solo", interval: "month" });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty("ok", true);
      expect(data).toHaveProperty("workspace_id");
      expect(data).toHaveProperty("checkout_url");
    });

    it("is idempotent: returns ok: true for existing workspace with active subscription", async () => {
      mockWorkspace.billing_status = "trial";
      mockWorkspace.stripe_subscription_id = "sub_test";
      (globalThis as Record<string, unknown>).__billingMockExistingUserId = "user_test";

      const res = await callTrialStart({ email: "test@example.com" });
      const data = await res.json();

      (globalThis as Record<string, unknown>).__billingMockExistingUserId = null;
      expect(res.status).toBe(200);
      expect(data).toHaveProperty("ok", true);
      expect(data).toHaveProperty("workspace_id");
    });
  });
});
