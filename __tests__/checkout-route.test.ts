/**
 * Contract tests for /api/billing/checkout
 * Ensures response shape, env validation, idempotency, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

(globalThis as Record<string, boolean>).__checkoutWorkspaceActive = false;

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: () => ({
      select: () => ({
        eq: (_col: string, val: string) => ({
          maybeSingle: () =>
            Promise.resolve({
              data: {
                id: val,
                owner_id: "test-user",
                billing_status: (globalThis as Record<string, boolean>).__checkoutWorkspaceActive ? "trial" : null,
                stripe_subscription_id: (globalThis as Record<string, boolean>).__checkoutWorkspaceActive ? "sub_test" : null,
              },
            }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => Promise.resolve({ error: null }),
    }),
  }),
}));

vi.mock("stripe", () => ({
  default: function Stripe() {
    return {
      customers: {
        create: vi.fn(() => Promise.resolve({ id: "cus_test" })),
        update: vi.fn(() => Promise.resolve({ id: "cus_test" })),
      },
      prices: {
        retrieve: vi.fn(() => Promise.resolve({ id: "price_test", type: "recurring" })),
      },
      checkout: {
        sessions: {
          create: vi.fn(() => Promise.resolve({ id: "cs_test", url: "https://checkout.stripe.com/test" })),
        },
      },
    };
  },
}));

describe("POST /api/billing/checkout", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  async function callCheckout(body: { email?: string; workspace_id?: string; tier?: string; interval?: string }) {
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

    const res = await callCheckout({ email: "test@example.com" });
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toHaveProperty("ok", false);
    expect(data).toHaveProperty("reason", "missing_env");
  });

  it("returns ok: false with reason missing_price_id when price for tier/interval is missing", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PRICE_SOLO_MONTH = undefined;
    process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

    const res = await callCheckout({ email: "test@example.com", tier: "solo", interval: "month" });
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toHaveProperty("ok", false);
    expect(data).toHaveProperty("reason", "missing_price_id");
  });

  it("returns ok: false with reason invalid_tier for enterprise", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

    const res = await callCheckout({ email: "test@example.com", tier: "enterprise", interval: "month" });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty("ok", false);
    expect(data).toHaveProperty("reason", "invalid_tier");
  });

  it("returns ok: false with reason missing_env when NEXT_PUBLIC_APP_URL is missing", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PRICE_SOLO_MONTH = "price_test";
    process.env.NEXT_PUBLIC_APP_URL = undefined;

    const res = await callCheckout({ email: "test@example.com" });
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toHaveProperty("ok", false);
    expect(data).toHaveProperty("reason", "missing_env");
  });

  it("returns ok: true with reason already_active if workspace has active subscription", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PRICE_SOLO_MONTH = "price_test";
    process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

    (globalThis as Record<string, boolean>).__checkoutWorkspaceActive = true;
    const res = await callCheckout({ workspace_id: "test-ws" });
    const data = await res.json();
    (globalThis as Record<string, boolean>).__checkoutWorkspaceActive = false;

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("reason", "already_active");
  });

  it("always returns JSON with ok property, never throws", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PRICE_SOLO_MONTH = "price_test";
    process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

    const res = await callCheckout({ email: "test@example.com", tier: "solo", interval: "month" });
    const contentType = res.headers.get("content-type");
    expect(contentType).toContain("application/json");

    const json = await res.json();
    expect(json).toHaveProperty("ok");
    expect(typeof json.ok).toBe("boolean");
  });
});
