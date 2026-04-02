/**
 * Structural tests for webhook API routes.
 * Validates signature verification, error handling, idempotency, and rate limiting.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const WEBHOOKS_DIR = path.join(ROOT, "src", "app", "api", "webhooks");

function readRoute(subdir: string): string {
  const filePath = path.join(WEBHOOKS_DIR, subdir, "route.ts");
  expect(existsSync(filePath), `webhooks/${subdir}/route.ts should exist`).toBe(true);
  return readFileSync(filePath, "utf-8");
}

const WEBHOOK_ROUTES = [
  "inbound",
  "inbound-generic",
  "lead-inbound",
  "manage",
  "zoom",
];

describe("Webhook routes: existence and handler exports", () => {
  for (const route of WEBHOOK_ROUTES) {
    it(`webhooks/${route}/route.ts exists`, () => {
      const filePath = path.join(WEBHOOKS_DIR, route, "route.ts");
      expect(existsSync(filePath)).toBe(true);
    });
  }

  it("inbound exports POST handler", () => {
    const src = readRoute("inbound");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("inbound-generic exports POST handler", () => {
    const src = readRoute("inbound-generic");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("lead-inbound exports POST handler", () => {
    const src = readRoute("lead-inbound");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("zoom exports POST handler", () => {
    const src = readRoute("zoom");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("manage exports GET handler (list endpoints)", () => {
    const src = readRoute("manage");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });
});

describe("Webhook routes: signature verification", () => {
  it("inbound route verifies webhook signature", () => {
    const src = readRoute("inbound");
    expect(src).toContain("verifyWebhookSignature");
    expect(src).toContain("WEBHOOK_SECRET");
    expect(src).toContain("x-webhook-signature");
  });

  it("inbound route checks timestamp freshness to prevent replay attacks", () => {
    const src = readRoute("inbound");
    expect(src).toContain("isTimestampFresh");
    expect(src).toContain("x-webhook-timestamp");
  });

  it("inbound-generic route verifies Bearer token in Authorization header", () => {
    const src = readRoute("inbound-generic");
    expect(src).toContain("INBOUND_WEBHOOK_SECRET");
    expect(src).toContain("authorization");
    expect(src).toContain("Bearer");
  });

  it("zoom route verifies x-zm-signature using HMAC-SHA256", () => {
    const src = readRoute("zoom");
    expect(src).toContain("x-zm-signature");
    expect(src).toContain("ZOOM_WEBHOOK_SECRET");
    expect(src).toContain("createHmac");
    expect(src).toContain("sha256");
  });

  it("zoom route uses timing-safe comparison", () => {
    const src = readRoute("zoom");
    expect(src).toContain("timingSafeEqual");
  });

  it("lead-inbound route authenticates via session or x-api-key", () => {
    const src = readRoute("lead-inbound");
    expect(src).toContain("x-api-key");
    expect(src).toContain("LEAD_INBOUND_WEBHOOK_SECRET");
    expect(src).toContain("getSession");
  });

  it("zoom route rejects in production when secret not configured", () => {
    const src = readRoute("zoom");
    expect(src).toContain("NODE_ENV");
    expect(src).toContain("production");
    expect(src).toContain("Webhook not configured");
  });
});

describe("Webhook routes: no raw errors exposed", () => {
  it("inbound route returns structured errors, not raw exception messages", () => {
    const src = readRoute("inbound");
    // Should return structured { error: "..." } not raw stack traces
    expect(src).toMatch(/\{\s*error:/);
    expect(src).toContain("Unauthorized");
    expect(src).toContain("Invalid JSON");
    expect(src).toContain("Invalid body");
  });

  it("inbound-generic route returns structured errors", () => {
    const src = readRoute("inbound-generic");
    expect(src).toContain('"Unauthorized"');
    expect(src).toContain('"Invalid JSON"');
    expect(src).toContain("Webhook not configured");
  });

  it("zoom route returns structured errors", () => {
    const src = readRoute("zoom");
    expect(src).toContain('"Missing signature"');
    expect(src).toContain('"Invalid signature"');
    expect(src).toContain('"Invalid JSON"');
  });

  it("lead-inbound route returns structured errors", () => {
    const src = readRoute("lead-inbound");
    expect(src).toContain('"Unauthorized"');
  });
});

describe("Webhook routes: idempotency handling", () => {
  it("inbound route uses dedupe key (SHA-256 hash of content)", () => {
    const src = readRoute("inbound");
    expect(src).toContain("makeDedupeKey");
    expect(src).toContain("createHash");
    expect(src).toContain("sha256");
  });

  it("inbound route uses replay nonce claim", () => {
    const src = readRoute("inbound");
    expect(src).toContain("claimReplayNonce");
  });

  it("zoom route checks for existing events by dedupe_key", () => {
    const src = readRoute("zoom");
    expect(src).toContain("dedupeKey");
    expect(src).toContain("dedupe_key");
    expect(src).toContain("dedupe: true");
  });
});

describe("Webhook routes: rate limiting", () => {
  it("inbound route applies inbound-specific rate limiting", () => {
    const src = readRoute("inbound");
    expect(src).toContain("checkInboundRateLimit");
    expect(src).toContain("incrementInboundRateLimit");
  });

  it("manage route applies rate limiting", () => {
    const src = readRoute("manage");
    expect(src).toContain("checkRateLimit");
  });
});

describe("Webhook routes: required fields validation", () => {
  it("inbound route requires workspace_id, channel, external_lead_id, message", () => {
    const src = readRoute("inbound");
    expect(src).toContain("workspace_id");
    expect(src).toContain("channel");
    expect(src).toContain("external_lead_id");
    expect(src).toContain("message");
    expect(src).toContain("Missing");
  });

  it("inbound-generic route requires workspace_id", () => {
    const src = readRoute("inbound-generic");
    expect(src).toContain("workspace_id required");
  });

  it("inbound-generic route requires lead and message.content", () => {
    const src = readRoute("inbound-generic");
    expect(src).toContain("lead");
    expect(src).toContain("message");
  });

  it("lead-inbound route requires workspace_id, name, and phone", () => {
    const src = readRoute("lead-inbound");
    expect(src).toContain("workspace_id, name, and phone are required");
  });
});

describe("Webhook routes: no hardcoded secrets", () => {
  for (const route of WEBHOOK_ROUTES) {
    it(`webhooks/${route} does not contain hardcoded secrets`, () => {
      const filePath = path.join(WEBHOOKS_DIR, route, "route.ts");
      if (!existsSync(filePath)) return;
      const src = readFileSync(filePath, "utf-8");
      // No hardcoded webhook secrets or API keys
      expect(src).not.toMatch(/whsec_[a-zA-Z0-9]+/);
      expect(src).not.toMatch(/sk_live_[a-zA-Z0-9]+/);
      expect(src).not.toMatch(/sk_test_[a-zA-Z0-9]+/);
    });
  }
});

describe("Webhook routes: logging for observability", () => {
  it("inbound route uses structured logging", () => {
    const src = readRoute("inbound");
    expect(src).toContain("withContext");
    expect(src).toContain("logWebhookFailure");
  });

  it("zoom route uses logging", () => {
    const src = readRoute("zoom");
    expect(src).toContain("log");
  });

  it("lead-inbound route uses logging", () => {
    const src = readRoute("lead-inbound");
    expect(src).toContain("log");
  });
});

describe("Webhook routes: force-dynamic export", () => {
  const ROUTES_EXPECTED_DYNAMIC = ["inbound-generic", "inbound", "lead-inbound", "manage"];

  for (const route of ROUTES_EXPECTED_DYNAMIC) {
    it(`webhooks/${route} exports dynamic = "force-dynamic"`, () => {
      const filePath = path.join(WEBHOOKS_DIR, route, "route.ts");
      if (!existsSync(filePath)) return;
      const src = readFileSync(filePath, "utf-8");
      expect(src).toContain('"force-dynamic"');
    });
  }

  it("zoom route does not use caching (no export const revalidate)", () => {
    const src = readRoute("zoom");
    // zoom omits force-dynamic but also does not cache responses
    expect(src).not.toContain("revalidate");
  });
});
