/**
 * Structural tests for auth API routes.
 * Validates exports, input validation, security, and session handling.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const AUTH_DIR = path.join(ROOT, "src", "app", "api", "auth");
const OPS_AUTH_DIR = path.join(ROOT, "src", "app", "api", "ops", "auth");

function readRoute(dir: string, subdir: string): string {
  const filePath = path.join(dir, subdir, "route.ts");
  expect(existsSync(filePath), `${subdir}/route.ts should exist in ${dir}`).toBe(true);
  return readFileSync(filePath, "utf-8");
}

const AUTH_ROUTES = [
  "signin",
  "signup",
  "signout",
  "logout",
  "session",
  "forgot-password",
  "google",
  "profile",
  "resend-verification",
];

const OPS_AUTH_ROUTES = [
  "magic-link",
  "session",
  "verify",
  "enable-write",
  "logout",
];

describe("Auth routes: existence and handler exports", () => {
  for (const route of AUTH_ROUTES) {
    it(`auth/${route}/route.ts exists`, () => {
      const filePath = path.join(AUTH_DIR, route, "route.ts");
      expect(existsSync(filePath)).toBe(true);
    });
  }

  for (const route of OPS_AUTH_ROUTES) {
    it(`ops/auth/${route}/route.ts exists`, () => {
      const filePath = path.join(OPS_AUTH_DIR, route, "route.ts");
      expect(existsSync(filePath)).toBe(true);
    });
  }

  it("signin exports POST handler", () => {
    const src = readRoute(AUTH_DIR, "signin");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("signup exports POST handler", () => {
    const src = readRoute(AUTH_DIR, "signup");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("signout exports POST handler", () => {
    const src = readRoute(AUTH_DIR, "signout");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("logout exports POST handler", () => {
    const src = readRoute(AUTH_DIR, "logout");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("session exports GET handler", () => {
    const src = readRoute(AUTH_DIR, "session");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("forgot-password exports POST handler", () => {
    const src = readRoute(AUTH_DIR, "forgot-password");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("google exports GET handler", () => {
    const src = readRoute(AUTH_DIR, "google");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("profile exports PATCH handler", () => {
    const src = readRoute(AUTH_DIR, "profile");
    expect(src).toMatch(/export\s+async\s+function\s+PATCH/);
  });

  it("resend-verification exports POST handler", () => {
    const src = readRoute(AUTH_DIR, "resend-verification");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("ops/auth/magic-link exports POST handler", () => {
    const src = readRoute(OPS_AUTH_DIR, "magic-link");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("ops/auth/session exports GET handler", () => {
    const src = readRoute(OPS_AUTH_DIR, "session");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("ops/auth/verify exports GET handler", () => {
    const src = readRoute(OPS_AUTH_DIR, "verify");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("ops/auth/enable-write exports POST handler", () => {
    const src = readRoute(OPS_AUTH_DIR, "enable-write");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });
});

describe("Sign-in route: input validation", () => {
  const src = readRoute(AUTH_DIR, "signin");

  it("validates email input", () => {
    expect(src).toContain("validateEmail");
  });

  it("validates password input", () => {
    expect(src).toContain("validatePasswordForSignin");
  });

  it("handles invalid JSON body", () => {
    expect(src).toContain("Invalid request");
    expect(src).toContain("status: 400");
  });

  it("returns friendly error messages (not raw auth errors)", () => {
    expect(src).toContain("toFriendlySigninError");
  });

  it("applies rate limiting by IP", () => {
    expect(src).toContain("checkRateLimit");
    expect(src).toContain("getClientIp");
    expect(src).toContain("status: 429");
  });
});

describe("Sign-up route: input validation", () => {
  const src = readRoute(AUTH_DIR, "signup");

  it("validates email input", () => {
    expect(src).toContain("validateEmail");
  });

  it("validates password with signup rules", () => {
    expect(src).toContain("validatePasswordForSignup");
  });

  it("enforces minimum password length of 8 characters", () => {
    expect(src).toContain("Password must be at least 8 characters");
  });

  it("enforces password must contain at least one number", () => {
    expect(src).toContain("Password must contain at least one number");
  });

  it("normalizes business name input", () => {
    expect(src).toContain("normalizeBusinessName");
  });

  it("handles invalid JSON body", () => {
    expect(src).toContain("Invalid request");
    expect(src).toContain("status: 400");
  });

  it("returns friendly error messages", () => {
    expect(src).toContain("toFriendlySignupError");
  });

  it("applies rate limiting by IP (stricter than signin)", () => {
    expect(src).toContain("checkRateLimit");
    expect(src).toContain("getClientIp");
  });

  it("handles duplicate account detection", () => {
    expect(src).toContain("Account already exists");
  });
});

describe("Auth routes: no secrets exposed in responses", () => {
  it("signin does not expose SESSION_SECRET in response", () => {
    const src = readRoute(AUTH_DIR, "signin");
    // Should use env var but never include it in the JSON response
    expect(src).toContain("process.env.SESSION_SECRET");
    // The response should only contain ok, userId, workspaceId, redirectTo
    expect(src).not.toMatch(/NextResponse\.json\(.*SESSION_SECRET/);
    expect(src).not.toMatch(/NextResponse\.json\(.*sessionSecret/);
  });

  it("signup does not expose SESSION_SECRET in response", () => {
    const src = readRoute(AUTH_DIR, "signup");
    expect(src).toContain("process.env.SESSION_SECRET");
    expect(src).not.toMatch(/NextResponse\.json\(.*SESSION_SECRET/);
    expect(src).not.toMatch(/NextResponse\.json\(.*sessionSecret/);
  });

  it("signin does not expose SUPABASE_SERVICE_ROLE_KEY in response", () => {
    const src = readRoute(AUTH_DIR, "signin");
    expect(src).not.toMatch(/NextResponse\.json\(.*SERVICE_ROLE/);
  });

  it("signup does not expose SUPABASE_SERVICE_ROLE_KEY in response", () => {
    const src = readRoute(AUTH_DIR, "signup");
    expect(src).not.toMatch(/NextResponse\.json\(.*SERVICE_ROLE/);
    expect(src).not.toMatch(/NextResponse\.json\(.*serviceRoleKey/);
  });

  it("session route does not expose password or tokens", () => {
    const src = readRoute(AUTH_DIR, "session");
    expect(src).not.toMatch(/NextResponse\.json\(.*password/);
    expect(src).not.toMatch(/NextResponse\.json\(.*token/i);
  });

  it("ops/auth/session does not expose session token in response body", () => {
    const src = readRoute(OPS_AUTH_DIR, "session");
    // Should expose id, email, role but NOT raw token
    expect(src).not.toMatch(/NextResponse\.json\(.*sessionToken/);
  });

  it("google route does not expose client_secret in response", () => {
    const src = readRoute(AUTH_DIR, "google");
    expect(src).not.toContain("client_secret");
  });
});

describe("Auth routes: session creation uses secure cookies", () => {
  it("signin creates session cookie via createSessionCookie", () => {
    const src = readRoute(AUTH_DIR, "signin");
    expect(src).toContain("createSessionCookie");
    expect(src).toContain("Set-Cookie");
  });

  it("signup creates session cookie via createSessionCookie", () => {
    const src = readRoute(AUTH_DIR, "signup");
    expect(src).toContain("createSessionCookie");
    expect(src).toContain("Set-Cookie");
  });

  it("signout clears cookie with HttpOnly and Max-Age=0", () => {
    const src = readRoute(AUTH_DIR, "signout");
    expect(src).toContain("HttpOnly");
    expect(src).toContain("Max-Age=0");
    expect(src).toContain("SameSite=Lax");
  });

  it("logout clears cookie with HttpOnly and Max-Age=0", () => {
    const src = readRoute(AUTH_DIR, "logout");
    expect(src).toContain("HttpOnly");
    expect(src).toContain("Max-Age=0");
    expect(src).toContain("SameSite=Lax");
  });

  it("google route sets state cookie with httpOnly and secure options", () => {
    const src = readRoute(AUTH_DIR, "google");
    expect(src).toContain("httpOnly: true");
    expect(src).toContain("sameSite:");
    expect(src).toContain("secure:");
  });

  it("signin fails closed when SESSION_SECRET is not configured", () => {
    const src = readRoute(AUTH_DIR, "signin");
    expect(src).toContain("Server configuration error");
    // Must return 500, not succeed silently
    expect(src).toContain("status: 500");
  });

  it("session route never returns 500 (always returns 200 with session: null on failure)", () => {
    const src = readRoute(AUTH_DIR, "session");
    expect(src).toContain("session: null");
    expect(src).toContain("Cache-Control");
    expect(src).toContain("no-store");
  });
});

describe("Auth routes: CSRF protection on mutation endpoints", () => {
  it("forgot-password uses assertSameOrigin", () => {
    const src = readRoute(AUTH_DIR, "forgot-password");
    expect(src).toContain("assertSameOrigin");
  });

  it("resend-verification uses assertSameOrigin", () => {
    const src = readRoute(AUTH_DIR, "resend-verification");
    expect(src).toContain("assertSameOrigin");
  });

  it("profile uses assertSameOrigin", () => {
    const src = readRoute(AUTH_DIR, "profile");
    expect(src).toContain("assertSameOrigin");
  });

  it("ops/auth/magic-link uses assertSameOrigin", () => {
    const src = readRoute(OPS_AUTH_DIR, "magic-link");
    expect(src).toContain("assertSameOrigin");
  });

  it("ops/auth/enable-write uses assertSameOrigin", () => {
    const src = readRoute(OPS_AUTH_DIR, "enable-write");
    expect(src).toContain("assertSameOrigin");
  });
});

describe("Auth routes: force-dynamic export", () => {
  for (const route of AUTH_ROUTES) {
    it(`auth/${route} exports dynamic = "force-dynamic"`, () => {
      const src = readRoute(AUTH_DIR, route);
      expect(src).toContain('"force-dynamic"');
    });
  }

  for (const route of OPS_AUTH_ROUTES) {
    it(`ops/auth/${route} exports dynamic = "force-dynamic"`, () => {
      const src = readRoute(OPS_AUTH_DIR, route);
      expect(src).toContain('"force-dynamic"');
    });
  }
});

describe("Ops auth routes: role-based access", () => {
  it("enable-write requires ADMIN role", () => {
    const src = readRoute(OPS_AUTH_DIR, "enable-write");
    expect(src).toContain("ADMIN");
    expect(src).toContain("Only ADMIN can enable write access");
    expect(src).toContain("status: 403");
  });

  it("ops session returns 401 for unauthenticated requests", () => {
    const src = readRoute(OPS_AUTH_DIR, "session");
    expect(src).toContain("Unauthorized");
    expect(src).toContain("status: 401");
  });

  it("verify route redirects to login on missing or invalid token", () => {
    const src = readRoute(OPS_AUTH_DIR, "verify");
    expect(src).toContain("missing_token");
    expect(src).toContain("redirect");
  });

  it("enable-write uses logStaffAction for audit trail", () => {
    const src = readRoute(OPS_AUTH_DIR, "enable-write");
    expect(src).toContain("logStaffAction");
  });
});
