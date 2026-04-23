/**
 * Phase 78 / Task 6.4 — verify the duplicate overage cron is retired.
 *
 * The route at /api/cron/usage-overage used to call stripe.invoiceItems.create
 * with a different idempotency key shape than /api/billing/overage, so when
 * both paths fired in the same billing period Stripe would create two line
 * items. Task 6.4 retired the route (410 Gone) and removed it from the core
 * bundler and health-check expectations.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");

describe("Phase 78 Task 6.4 — usage-overage cron retirement", () => {
  it("route returns 410 Gone instead of invoicing", async () => {
    const mod = await import("@/app/api/cron/usage-overage/route");
    expect(typeof mod.GET).toBe("function");
    const res = await mod.GET();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("route_retired");
    expect(body.replacement).toBe("/api/billing/overage");
  });

  it("route source no longer imports reportUsageOverage or calls Stripe", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "src/app/api/cron/usage-overage/route.ts"),
      "utf8",
    );
    // No import of the old biller.
    expect(src).not.toMatch(/from\s+["']@\/lib\/billing\/overage["']/);
    // No import of Stripe client or helpers.
    expect(src).not.toMatch(/from\s+["']@\/lib\/billing\/stripe-client["']/);
    // No call to invoiceItems.create (ignore the word appearing in the header comment).
    expect(src).not.toMatch(/\.invoiceItems\.create\(/);
    // Must carry the retirement marker for anyone reading it.
    expect(src).toMatch(/route_retired/);
  });

  it("cron/core CORE_STEPS no longer lists /api/cron/usage-overage", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "src/app/api/cron/core/route.ts"),
      "utf8",
    );
    // The string appears only in the retirement comment, never as a CORE_STEPS entry.
    const asListEntry = /"\/api\/cron\/usage-overage"/.test(src);
    expect(asListEntry).toBe(false);
  });

  it("lib/cron/health-check CRON_JOBS no longer lists usage-overage", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "src/lib/cron/health-check.ts"),
      "utf8",
    );
    // The usage-overage job is not registered as a heartbeat config entry.
    const asJobConfig = /\{\s*name:\s*"usage-overage"/.test(src);
    expect(asJobConfig).toBe(false);
  });
});
