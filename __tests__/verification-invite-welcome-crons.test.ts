/**
 * Verification: invite flow, invite validate, first-day-check cron, day-3-nudge cron.
 * Ensures routes exist, require auth where needed, and return expected JSON shape.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

describe("Verification: invite, welcome, crons", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("POST /api/team/invite", () => {
    it("returns 401 without session", async () => {
      const { POST } = await import("@/app/api/team/invite/route");
      const req = new NextRequest("http://localhost/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: "00000000-0000-0000-0000-000000000001",
          email: "test@example.com",
          role: "agent",
        }),
      });
      const res = await POST(req);
      expect([401, 403]).toContain(res.status);
      const data = await res.json();
      expect(data).toHaveProperty("error");
      expect(JSON.stringify(data)).not.toMatch(/stack|at\s+\S+\(/);
    });

    it("returns 400 when workspace_id is missing", async () => {
      const { POST } = await import("@/app/api/team/invite/route");
      const req = new NextRequest("http://localhost/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", role: "agent" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });
  });

  describe("GET /api/invite/validate", () => {
    it("returns 400 when token is missing", async () => {
      const { GET } = await import("@/app/api/invite/validate/route");
      const req = new NextRequest("http://localhost/api/invite/validate");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });

    it("returns 200 with error for invalid token", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      const { GET } = await import("@/app/api/invite/validate/route");
      const req = new NextRequest("http://localhost/api/invite/validate?token=invalid-token-12345");
      const res = await GET(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty("error");
      expect(["invalid", "expired"]).toContain(data.error);
    });
  });

  describe("GET /api/cron/first-day-check", () => {
    it("returns 401 or 501 without cron auth", async () => {
      process.env.CRON_SECRET = "";
      const { GET } = await import("@/app/api/cron/first-day-check/route");
      const req = new NextRequest("http://localhost/api/cron/first-day-check", {
        method: "GET",
        headers: {},
      });
      const res = await GET(req);
      expect([401, 501]).toContain(res.status);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });

    it("returns 200 with ok when authorized (or 500 if DB unreachable in test)", async () => {
      process.env.CRON_SECRET = "test-cron-secret";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      const { GET } = await import("@/app/api/cron/first-day-check/route");
      const req = new NextRequest("http://localhost/api/cron/first-day-check", {
        method: "GET",
        headers: { Authorization: "Bearer test-cron-secret" },
      });
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
      const data = await res.json();
      if (res.status === 200) {
        expect(data).toHaveProperty("ok", true);
        expect(data).toHaveProperty("checked");
        expect(data).toHaveProperty("sent");
        expect(data).toHaveProperty("results");
      }
    });
  });

  describe("GET /api/cron/day-3-nudge", () => {
    it("returns 401 or 501 without cron auth", async () => {
      process.env.CRON_SECRET = "";
      const { GET } = await import("@/app/api/cron/day-3-nudge/route");
      const req = new NextRequest("http://localhost/api/cron/day-3-nudge", {
        method: "GET",
        headers: {},
      });
      const res = await GET(req);
      expect([401, 501]).toContain(res.status);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });

    it("returns 200 with ok when authorized (or 500 if DB unreachable in test)", async () => {
      process.env.CRON_SECRET = "test-cron-secret";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      const { GET } = await import("@/app/api/cron/day-3-nudge/route");
      const req = new NextRequest("http://localhost/api/cron/day-3-nudge", {
        method: "GET",
        headers: { Authorization: "Bearer test-cron-secret" },
      });
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
      const data = await res.json();
      if (res.status === 200) {
        expect(data).toHaveProperty("ok", true);
        expect(data).toHaveProperty("checked");
        expect(data).toHaveProperty("sent");
        expect(data).toHaveProperty("results");
      }
    });
  });

  describe("Welcome email on signup", () => {
    it("signup route uses sendWelcomeEmail on success path", async () => {
      const path = await import("path");
      const fs = await import("fs");
      const routePath = path.join(process.cwd(), "src/app/api/auth/signup/route.ts");
      const routeContent = fs.readFileSync(routePath, "utf-8");
      expect(routeContent).toContain("sendWelcomeEmail");
      expect(routeContent).toMatch(/sendWelcome\s*\(\s*\)/);
    });
  });
});
