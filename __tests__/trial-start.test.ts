/**
 * Contract tests for /api/trial/start
 * Ensures response shape, idempotency, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockWorkspace = {
  id: "ws_trial_test",
  owner_id: "user_trial_test",
  billing_status: null as string | null,
  stripe_subscription_id: null as string | null,
};
(globalThis as Record<string, unknown>).__trialStartExistingUserId = null as string | null;

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (table: string) => {
      if (table === "workspaces") {
        const row = () => Promise.resolve({ data: mockWorkspace });
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: row,
              order: () => ({ limit: () => ({ maybeSingle: row }) }),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === "users") {
        const existingId = (globalThis as Record<string, unknown>).__trialStartExistingUserId as string | null;
        const userRow = () =>
          Promise.resolve({ data: existingId ? { id: existingId } : null });
        return {
          select: () => ({
            eq: (col: string) => ({
              limit: () => ({ maybeSingle: userRow }),
              maybeSingle: () => (col === "id" ? Promise.resolve({ data: { email: "test@example.com" } }) : userRow()),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
        };
      }
      return { insert: () => Promise.resolve({ error: null }), upsert: () => Promise.resolve({ error: null }) };
    },
  }),
}));

vi.mock("stripe", () => ({
  default: function Stripe() {
    return {
      customers: { create: vi.fn(() => Promise.resolve({ id: "cus_test" })), update: vi.fn(() => Promise.resolve({ id: "cus_test" })) },
      prices: { retrieve: vi.fn(() => Promise.resolve({ id: "price_test", type: "recurring" })) },
      checkout: {
        sessions: { create: vi.fn(() => Promise.resolve({ id: "cs_test", url: "https://checkout.stripe.com/test" })) },
      },
    };
  },
}));

describe("Trial start route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PRICE_SOLO_MONTH = "price_test";
    process.env.NEXT_PUBLIC_APP_URL = "https://test.com";
    mockWorkspace.billing_status = null;
    mockWorkspace.stripe_subscription_id = null;
    (globalThis as Record<string, unknown>).__trialStartExistingUserId = null;
  });

  it("returns ok: true and workspace_id on success", async () => {
    const { POST } = await import("@/app/api/trial/start/route");
    const req = new NextRequest("http://localhost/api/trial/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        hired_roles: ["full_autopilot"],
        business_type: "general",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("ok", true);
    expect(json).toHaveProperty("workspace_id");
    expect(typeof json.workspace_id).toBe("string");
  });

  it("returns ok: false with reason for invalid email", async () => {
    const { POST } = await import("@/app/api/trial/start/route");
    const req = new NextRequest("http://localhost/api/trial/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toHaveProperty("ok", false);
    expect(json).toHaveProperty("reason", "invalid_email");
  });

  it("returns ok: false with reason for invalid JSON", async () => {
    const { POST } = await import("@/app/api/trial/start/route");
    const req = new NextRequest("http://localhost/api/trial/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toHaveProperty("ok", false);
    expect(json).toHaveProperty("reason", "invalid_json");
  });

  it("is idempotent - returns ok: true if workspace already exists with trial", async () => {
    const email = "test-idempotent@example.com";
    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    mockWorkspace.id = workspaceId;
    mockWorkspace.owner_id = userId;
    mockWorkspace.billing_status = "trial";
    mockWorkspace.stripe_subscription_id = "sub_test";
    (globalThis as Record<string, unknown>).__trialStartExistingUserId = userId;

    const { POST } = await import("@/app/api/trial/start/route");
    const req = new NextRequest("http://localhost/api/trial/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("ok", true);
    expect(json).toHaveProperty("workspace_id", workspaceId);
  });

  it("always returns JSON, never throws", async () => {
    const { POST } = await import("@/app/api/trial/start/route");
    const req = new NextRequest("http://localhost/api/trial/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const res = await POST(req);
    const contentType = res.headers.get("content-type");
    expect(contentType).toContain("application/json");

    const json = await res.json();
    expect(json).toHaveProperty("ok");
  });
});
