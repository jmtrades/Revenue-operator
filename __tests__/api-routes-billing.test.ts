/**
 * Structural tests for billing API routes.
 * Validates exports, parameter validation, security, and response patterns.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const BILLING_DIR = path.join(ROOT, "src", "app", "api", "billing");

function readRoute(subdir: string): string {
  const filePath = path.join(BILLING_DIR, subdir, "route.ts");
  expect(existsSync(filePath), `${subdir}/route.ts should exist`).toBe(true);
  return readFileSync(filePath, "utf-8");
}

const BILLING_ROUTES = [
  "checkout",
  "portal",
  "usage",
  "status",
  "webhook",
  "change-plan",
  "dispute",
  "overage",
  "buy-minutes",
  "pause-coverage",
  "renewal",
  "scope",
  "continuation-context",
];

describe("Billing API routes: existence and handler exports", () => {
  for (const route of BILLING_ROUTES) {
    it(`${route}/route.ts exists`, () => {
      const filePath = path.join(BILLING_DIR, route, "route.ts");
      expect(existsSync(filePath)).toBe(true);
    });
  }

  it("checkout route exports POST handler", () => {
    const src = readRoute("checkout");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("portal route exports POST handler", () => {
    const src = readRoute("portal");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("usage route exports GET handler", () => {
    const src = readRoute("usage");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("status route exports GET handler", () => {
    const src = readRoute("status");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("webhook route exports POST handler", () => {
    const src = readRoute("webhook");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("change-plan route exports POST handler", () => {
    const src = readRoute("change-plan");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("dispute route exports POST handler", () => {
    const src = readRoute("dispute");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("overage route exports POST handler", () => {
    const src = readRoute("overage");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("buy-minutes route exports both POST and GET handlers", () => {
    const src = readRoute("buy-minutes");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });
});

describe("Checkout route: parameter validation", () => {
  const src = readRoute("checkout");

  it("validates tier parameter with PLAN_TO_TIER mapping", () => {
    expect(src).toContain("PLAN_TO_TIER");
    expect(src).toContain("solo");
    expect(src).toContain("business");
    expect(src).toContain("scale");
    expect(src).toContain("enterprise");
  });

  it("validates interval parameter (defaults to month)", () => {
    expect(src).toMatch(/interval.*month/);
  });

  it("handles invalid JSON body with 400 response", () => {
    expect(src).toContain("invalid_json");
    expect(src).toContain("status: 400");
  });

  it("requires workspace_id or email", () => {
    expect(src).toContain("workspace_id_or_email_required");
  });

  it("uses getPriceId for tier/interval resolution", () => {
    expect(src).toContain("getPriceId");
    expect(src).toContain("invalid_tier");
    expect(src).toContain("invalid_interval");
  });
});

describe("Change-plan route: parameter validation", () => {
  const src = readRoute("change-plan");

  it("validates plan_id is required", () => {
    expect(src).toContain("plan_id required");
  });

  it("rejects camelCase planId in favor of plan_id", () => {
    expect(src).toContain("Use plan_id, not planId");
  });

  it("validates plan_id maps to valid tier", () => {
    expect(src).toContain("PLAN_TO_TIER");
    expect(src).toContain("Invalid plan");
  });

  it("handles upgrade vs downgrade logic", () => {
    expect(src).toContain("TIER_RANK");
    expect(src).toContain("isDowngrade");
  });
});

describe("No hardcoded Stripe keys in route files", () => {
  for (const route of BILLING_ROUTES) {
    it(`${route} does not contain hardcoded Stripe keys`, () => {
      const filePath = path.join(BILLING_DIR, route, "route.ts");
      if (!existsSync(filePath)) return;
      const src = readFileSync(filePath, "utf-8");
      // Stripe secret keys start with sk_live_ or sk_test_
      expect(src).not.toMatch(/sk_live_[a-zA-Z0-9]+/);
      expect(src).not.toMatch(/sk_test_[a-zA-Z0-9]+/);
      // Stripe publishable keys start with pk_live_ or pk_test_
      expect(src).not.toMatch(/pk_live_[a-zA-Z0-9]+/);
      expect(src).not.toMatch(/pk_test_[a-zA-Z0-9]+/);
      // Webhook signing secrets start with whsec_
      expect(src).not.toMatch(/whsec_[a-zA-Z0-9]+/);
    });
  }
});

describe("Billing routes: auth / session validation", () => {
  it("checkout route imports auth (requireWorkspaceAccess or getSession)", () => {
    const src = readRoute("checkout");
    expect(src).toContain("requireWorkspaceAccess");
    expect(src).toContain("getSession");
  });

  it("portal route imports requireWorkspaceAccess", () => {
    const src = readRoute("portal");
    expect(src).toContain("requireWorkspaceAccess");
  });

  it("usage route imports requireWorkspaceAccess", () => {
    const src = readRoute("usage");
    expect(src).toContain("requireWorkspaceAccess");
  });

  it("status route imports requireWorkspaceAccess", () => {
    const src = readRoute("status");
    expect(src).toContain("requireWorkspaceAccess");
  });

  it("change-plan route imports requireWorkspaceAccess", () => {
    const src = readRoute("change-plan");
    expect(src).toContain("requireWorkspaceAccess");
  });

  it("buy-minutes route imports requireWorkspaceAccess", () => {
    const src = readRoute("buy-minutes");
    expect(src).toContain("requireWorkspaceAccess");
  });

  it("overage route uses assertCronAuthorized for cron-only access", () => {
    const src = readRoute("overage");
    expect(src).toContain("assertCronAuthorized");
  });
});

describe("Billing routes: structured JSON error responses", () => {
  it("checkout route returns structured { ok: false, reason } errors", () => {
    const src = readRoute("checkout");
    expect(src).toMatch(/ok:\s*false/);
    expect(src).toContain("reason:");
  });

  it("portal route returns structured { ok: false, reason } errors", () => {
    const src = readRoute("portal");
    expect(src).toMatch(/ok:\s*false/);
    expect(src).toContain("reason:");
  });

  it("usage route returns structured { error } responses", () => {
    const src = readRoute("usage");
    expect(src).toMatch(/\{\s*error:/);
  });

  it("status route returns structured { error } responses", () => {
    const src = readRoute("status");
    expect(src).toMatch(/\{\s*error:/);
  });

  it("change-plan route returns structured errors with status codes", () => {
    const src = readRoute("change-plan");
    expect(src).toMatch(/ok:\s*false/);
    expect(src).toContain("error:");
  });

  it("buy-minutes route returns structured { ok: false, reason } errors", () => {
    const src = readRoute("buy-minutes");
    expect(src).toMatch(/ok:\s*false/);
    expect(src).toContain("reason:");
  });
});

describe("Webhook route: signature verification", () => {
  const src = readRoute("webhook");

  it("imports Stripe for signature verification", () => {
    expect(src).toMatch(/import.*Stripe.*from\s+["']stripe["']/);
  });

  it("uses STRIPE_WEBHOOK_SECRET from environment", () => {
    expect(src).toContain("STRIPE_WEBHOOK_SECRET");
  });

  it("reads webhook secret from process.env (not hardcoded)", () => {
    expect(src).toContain("process.env.STRIPE_WEBHOOK_SECRET");
  });

  it("handles signature verification failure", () => {
    // The webhook route must handle invalid signatures
    expect(src).toContain("webhookSecret");
  });
});

describe("Billing routes: CSRF protection", () => {
  it("checkout route uses assertSameOrigin", () => {
    const src = readRoute("checkout");
    expect(src).toContain("assertSameOrigin");
  });

  it("portal route uses assertSameOrigin", () => {
    const src = readRoute("portal");
    expect(src).toContain("assertSameOrigin");
  });

  it("change-plan route uses assertSameOrigin", () => {
    const src = readRoute("change-plan");
    expect(src).toContain("assertSameOrigin");
  });

  it("buy-minutes route uses assertSameOrigin", () => {
    const src = readRoute("buy-minutes");
    expect(src).toContain("assertSameOrigin");
  });

  it("dispute route uses assertSameOrigin", () => {
    const src = readRoute("dispute");
    expect(src).toContain("assertSameOrigin");
  });

  it("overage route uses assertSameOrigin", () => {
    const src = readRoute("overage");
    expect(src).toContain("assertSameOrigin");
  });
});

describe("Billing routes: rate limiting", () => {
  it("checkout route applies rate limiting", () => {
    const src = readRoute("checkout");
    expect(src).toContain("checkRateLimit");
    expect(src).toContain("status: 429");
  });

  it("change-plan route applies rate limiting", () => {
    const src = readRoute("change-plan");
    expect(src).toContain("checkRateLimit");
    expect(src).toContain("status: 429");
  });

  it("buy-minutes route applies rate limiting", () => {
    const src = readRoute("buy-minutes");
    expect(src).toContain("checkRateLimit");
    expect(src).toContain("status: 429");
  });
});

describe("Billing routes: idempotency handling", () => {
  it("checkout route checks for existing subscription (idempotency)", () => {
    const src = readRoute("checkout");
    expect(src).toContain("already_active");
    expect(src).toContain("hasActiveSubscription");
  });

  it("overage route uses idempotency keys for Stripe invoice items", () => {
    const src = readRoute("overage");
    expect(src).toContain("idempotencyKey");
    expect(src).toContain("idempotencyBase");
  });
});

describe("Billing routes: Stripe key sourced from env", () => {
  for (const route of ["checkout", "portal", "change-plan", "overage", "buy-minutes"]) {
    it(`${route} reads STRIPE_SECRET_KEY from process.env`, () => {
      const src = readRoute(route);
      expect(src).toContain("process.env.STRIPE_SECRET_KEY");
    });
  }
});

describe("Billing routes: force-dynamic export", () => {
  for (const route of BILLING_ROUTES) {
    it(`${route} exports dynamic = "force-dynamic"`, () => {
      const filePath = path.join(BILLING_DIR, route, "route.ts");
      if (!existsSync(filePath)) return;
      const src = readFileSync(filePath, "utf-8");
      expect(src).toContain('"force-dynamic"');
    });
  }
});
