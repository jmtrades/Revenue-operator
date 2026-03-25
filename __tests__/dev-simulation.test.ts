/**
 * Dev simulation security: Block in production unless DEV_SIM_SECRET present
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

describe("Dev simulation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("should be blocked in production without secret", async () => {
    process.env.NODE_ENV = "production";
    process.env.DEV_SIM_SECRET = undefined;
    const { POST } = await import("@/app/api/dev/simulate-inbound/route");
    const req = new NextRequest("http://localhost/api/dev/simulate-inbound", {
      method: "POST",
      headers: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/not available|production/i);
  });

  it("when DEV_SIM_SECRET matches, returns 401 (no session) not 403", async () => {
    process.env.NODE_ENV = "production";
    process.env.DEV_SIM_SECRET = "test-secret-123";
    const { POST } = await import("@/app/api/dev/simulate-inbound/route");
    const req = new NextRequest("http://localhost/api/dev/simulate-inbound", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret-123" },
    });
    const res = await POST(req);
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(401);
  });
});
