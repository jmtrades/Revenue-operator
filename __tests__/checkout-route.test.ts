/**
 * Tests for checkout route
 */

import { POST } from "@/app/api/billing/checkout/route";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: "test-ws", owner_id: "test-user" } }),
        }),
        order: () => ({
          limit: () => ({
            single: () => Promise.resolve({ data: null }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => Promise.resolve({ error: null }),
    }),
  }),
}));

describe("POST /api/billing/checkout", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns STRIPE_NOT_CONFIGURED when STRIPE_SECRET_KEY is missing", async () => {
    process.env.STRIPE_SECRET_KEY = undefined;
    process.env.STRIPE_PRICE_ID = "price_test";
    process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

    const req = new NextRequest("http://localhost/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("STRIPE_NOT_CONFIGURED");
    expect(data.missing).toContain("STRIPE_SECRET_KEY");
  });

  it("returns STRIPE_NOT_CONFIGURED when STRIPE_PRICE_ID is missing", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PRICE_ID = undefined;
    process.env.NEXT_PUBLIC_APP_URL = "https://test.com";

    const req = new NextRequest("http://localhost/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("STRIPE_NOT_CONFIGURED");
    expect(data.missing).toContain("STRIPE_PRICE_ID");
  });

  it("returns STRIPE_NOT_CONFIGURED when NEXT_PUBLIC_APP_URL is missing", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PRICE_ID = "price_test";
    process.env.NEXT_PUBLIC_APP_URL = undefined;

    const req = new NextRequest("http://localhost/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("STRIPE_NOT_CONFIGURED");
    expect(data.missing).toContain("NEXT_PUBLIC_APP_URL");
  });
});
