/**
 * Auth sign-in and sign-up API contract: correct status and JSON shape for
 * invalid input, missing env, and never expose stack traces.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

describe("Auth signin/signup API contract", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("POST /api/auth/signin with empty body returns 400 and error message", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const { POST } = await import("@/app/api/auth/signin/route");
    const req = new NextRequest("http://localhost/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
    expect(typeof data.error).toBe("string");
    expect(data.error.length).toBeGreaterThan(0);
    expect(data).not.toHaveProperty("stack");
    expect(JSON.stringify(data)).not.toMatch(/at\s+\S+\s+\(/);
  });

  it("POST /api/auth/signin with invalid JSON returns 400", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const { POST } = await import("@/app/api/auth/signin/route");
    const req = new NextRequest("http://localhost/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
    expect(JSON.stringify(data)).not.toMatch(/stack|at\s+\S+\(/);
  });

  it("POST /api/auth/signup with empty body returns 400 and error message", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const { POST } = await import("@/app/api/auth/signup/route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
    expect(typeof data.error).toBe("string");
    expect(data.error.length).toBeGreaterThan(0);
    expect(data).not.toHaveProperty("stack");
    expect(JSON.stringify(data)).not.toMatch(/at\s+\S+\s+\(/);
  });

  it("POST /api/auth/signup with short password returns 400 with friendly message", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const { POST } = await import("@/app/api/auth/signup/route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.co", password: "12345", businessName: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/6 characters|Password/);
  });

  it("POST /api/auth/signup with email and password returns 200 or 4xx with ok/error shape", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const { POST } = await import("@/app/api/auth/signup/route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123", businessName: "Test Co" }),
    });
    const res = await POST(req);
    // Without real Supabase: 400 (signUp error) or 503 (session not configured). With real Supabase: 200 or confirmEmail.
    expect([200, 400, 503]).toContain(res.status);
    const data = await res.json();
    if (res.status === 200) {
      expect(data.ok).toBe(true);
      expect(data).not.toHaveProperty("stack");
    } else {
      expect(data).toHaveProperty("error");
      expect(JSON.stringify(data)).not.toMatch(/at\s+\S+\s+\(/);
    }
  });
});
