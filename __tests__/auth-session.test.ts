/**
 * Tests for src/lib/auth/session.ts
 * Structural tests verifying security properties of session cookie handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const SRC = readFileSync(
  path.resolve(__dirname, "..", "src", "lib", "auth", "session.ts"),
  "utf-8",
);

/* ------------------------------------------------------------------ */
/*  Structural tests                                                   */
/* ------------------------------------------------------------------ */

describe("session.ts structural", () => {
  it("uses HMAC-SHA256 for signing", () => {
    expect(SRC).toContain('createHmac("sha256"');
  });

  it("imports createHmac from crypto", () => {
    expect(SRC).toMatch(/import\s*\{[^}]*createHmac[^}]*\}\s*from\s*["']crypto["']/);
  });

  it("uses timingSafeEqual for constant-time comparison", () => {
    expect(SRC).toContain("timingSafeEqual");
  });

  it("imports timingSafeEqual from crypto", () => {
    expect(SRC).toMatch(/import\s*\{[^}]*timingSafeEqual[^}]*\}\s*from\s*["']crypto["']/);
  });

  it("sets HttpOnly flag on cookie", () => {
    expect(SRC).toContain("HttpOnly");
  });

  it("sets Secure flag in production", () => {
    expect(SRC).toContain("Secure");
    expect(SRC).toMatch(/production.*Secure|Secure.*production/s);
  });

  it("sets SameSite attribute", () => {
    expect(SRC).toContain("SameSite=Lax");
  });

  it("has 30-day max age (60 * 60 * 24 * 30)", () => {
    expect(SRC).toContain("60 * 60 * 24 * 30");
  });

  it("sets Max-Age on the cookie string", () => {
    expect(SRC).toContain("Max-Age=");
  });

  it("requires SESSION_SECRET in production", () => {
    expect(SRC).toContain("SESSION_SECRET is required in production");
  });

  it("uses base64url encoding for payload", () => {
    expect(SRC).toContain("base64url");
  });

  it("checks expiry before returning session", () => {
    expect(SRC).toContain("data.exp");
    expect(SRC).toMatch(/exp\s*<\s*Math\.floor/);
  });

  it("checks signature length before comparing", () => {
    expect(SRC).toContain("expected.length !== signature.length");
  });

  it("falls back to ENCRYPTION_KEY if SESSION_SECRET is missing", () => {
    expect(SRC).toContain("ENCRYPTION_KEY");
  });
});

/* ------------------------------------------------------------------ */
/*  Unit tests with session secret set                                 */
/* ------------------------------------------------------------------ */

describe("session cookie round-trip", () => {
  const TEST_SECRET = "test-secret-key-for-vitest-at-least-16";

  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it("createSessionCookie returns a cookie string", async () => {
    const { createSessionCookie } = await import("@/lib/auth/session");
    const cookie = createSessionCookie({ userId: "u1", workspaceId: "w1" });
    expect(cookie).toBeTypeOf("string");
    expect(cookie).toContain("revenue_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
  });

  it("getSessionFromCookie restores the payload", async () => {
    const { createSessionCookie, getSessionFromCookie } = await import("@/lib/auth/session");
    const cookie = createSessionCookie({ userId: "u1", workspaceId: "w1" });
    expect(cookie).not.toBeNull();
    const session = getSessionFromCookie(cookie!);
    expect(session).not.toBeNull();
    expect(session!.userId).toBe("u1");
    expect(session!.workspaceId).toBe("w1");
    expect(session!.exp).toBeTypeOf("number");
  });

  it("getSessionFromCookie returns null for null header", async () => {
    const { getSessionFromCookie } = await import("@/lib/auth/session");
    expect(getSessionFromCookie(null)).toBeNull();
  });

  it("getSessionFromCookie returns null for tampered cookie", async () => {
    const { createSessionCookie, getSessionFromCookie } = await import("@/lib/auth/session");
    const cookie = createSessionCookie({ userId: "u1" });
    expect(cookie).not.toBeNull();
    const tampered = cookie!.replace(/revenue_session=([^.]+)/, "revenue_session=AAAA");
    expect(getSessionFromCookie(tampered)).toBeNull();
  });

  it("getSessionFromCookie returns null for missing cookie name", async () => {
    const { getSessionFromCookie } = await import("@/lib/auth/session");
    expect(getSessionFromCookie("other_cookie=abc")).toBeNull();
  });
});

describe("session without secret", () => {
  beforeEach(() => {
    delete process.env.SESSION_SECRET;
    delete process.env.ENCRYPTION_KEY;
    process.env.NODE_ENV = "test";
  });

  it("createSessionCookie returns null when no secret", async () => {
    const { createSessionCookie } = await import("@/lib/auth/session");
    const cookie = createSessionCookie({ userId: "u1" });
    expect(cookie).toBeNull();
  });

  it("isSessionEnabled returns false when no secret", async () => {
    const { isSessionEnabled } = await import("@/lib/auth/session");
    expect(isSessionEnabled()).toBe(false);
  });
});
