/**
 * Auth routes never return 500 or expose stack traces. Use controlled error handling or normalizeApiResponse.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const SESSION_ROUTE = path.join(ROOT, "src", "app", "api", "auth", "session", "route.ts");
const AUTH_CALLBACK = path.join(ROOT, "src", "app", "auth", "callback", "route.ts");

describe("Auth routes no 500", () => {
  it("session route wraps handler in try/catch and returns 200 with session null on failure", () => {
    const content = readFileSync(SESSION_ROUTE, "utf-8");
    expect(content).toContain("try {");
    expect(content).toContain("} catch");
    expect(content).toContain("NextResponse.json({ session: null })");
    expect(content).not.toMatch(/status:\s*500|status:\s*5\d\d/);
  });

  it("auth callback uses getBaseUrl and redirects to sign-in on error", () => {
    const content = readFileSync(AUTH_CALLBACK, "utf-8");
    expect(content).toContain("getBaseUrl");
    expect(content).toContain("/sign-in");
    expect(content).toMatch(/redirect.*sign-in.*error=auth|sign-in\?error=auth/);
  });

  it("auth callback does not throw uncaught; errors redirect", () => {
    const content = readFileSync(AUTH_CALLBACK, "utf-8");
    expect(content).toContain("try {");
    expect(content).toContain("} catch");
  });
});
