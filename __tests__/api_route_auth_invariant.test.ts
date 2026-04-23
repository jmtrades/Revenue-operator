/**
 * Multi-tenancy invariant (Phase 70) — baseline ratchet.
 *
 * Every API route that touches the database (imports getDb or createClient)
 * SHOULD also use one of the sanctioned auth helpers so tenant isolation is
 * enforced at the application layer. We do NOT rely on Postgres RLS — all
 * access goes through the service role key via getDb() — so any route that
 * reaches the DB without one of the helpers below is a potential cross-tenant
 * data-leak surface.
 *
 * Sanctioned helpers:
 *   - authorizeOrg / requireAuthenticated (Phase 70+ helpers)
 *   - requireWorkspaceMember / requireWorkspaceAccess / requireWorkspaceRole
 *   - verifyWebhookByProvider / verifyWebhookSignature / verifyStripeSignature /
 *     verifyTwilioSignature / verifyResendSignature (webhook-signed inbound)
 *   - CRON_SECRET / INTERNAL_API_KEY env check (server-to-server)
 *   - "@public-endpoint" comment (explicit public opt-out)
 *
 * HOW THIS TEST WORKS:
 *   - We count routes that touch the DB without any sanctioned marker.
 *   - The baseline is locked to the count at the time this test was authored
 *     (April 2026). If someone adds a NEW unauthed route, the count goes up
 *     and this test fails — catching the regression in CI.
 *   - The baseline should only ever go DOWN, not up. Lowering it is a
 *     happy event: we've migrated another route to a standard helper.
 *
 * See Phase 70 — Security + multi-tenancy hardening.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

const API_ROOT = path.resolve(__dirname, "..", "src", "app", "api");

const AUTH_MARKERS = [
  "authorizeOrg",
  "requireAuthenticated",
  "requireWorkspaceMember",
  "requireWorkspaceAccess",
  "requireWorkspaceRole",
  "verifyWebhookByProvider",
  "verifyWebhookSignature",
  "verifyStripeSignature",
  "verifyTwilioSignature",
  // Phase 78/Phase 4: always-on Twilio verifier (fail-closed wrapper around
  // verifyTwilioSignature with candidate-URL matching).
  "verifyTwilioRequest",
  "verifyResendSignature",
  "@public-endpoint",
  "CRON_SECRET",
  "INTERNAL_API_KEY",
];

/**
 * Current baseline: count of routes touching the DB without an auth marker
 * at the time Phase 70 was authored. DO NOT INCREASE without explicit
 * architectural review. Decreases are celebrated.
 */
const BASELINE_UNAUTHED_ROUTE_COUNT = 161;

function findRouteFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) findRouteFiles(full, acc);
    else if (entry === "route.ts" || entry === "route.tsx") acc.push(full);
  }
  return acc;
}

function touchesDatabase(src: string): boolean {
  return /\bgetDb\s*\(|\bcreateClient\s*\(/.test(src);
}

function hasSanctionedAuth(src: string): boolean {
  return AUTH_MARKERS.some((m) => src.includes(m));
}

describe("API route auth invariant (Phase 70 baseline ratchet)", () => {
  const routes = findRouteFiles(API_ROOT);

  it("finds a non-trivial number of API route files", () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it("the count of unauthed DB-touching routes does not exceed the baseline", () => {
    const violations: string[] = [];
    for (const file of routes) {
      const src = readFileSync(file, "utf-8");
      if (!touchesDatabase(src)) continue;
      if (!hasSanctionedAuth(src)) {
        violations.push(path.relative(path.resolve(__dirname, ".."), file));
      }
    }

    // Fail only if the count GREW — i.e. someone added a new unauthed route.
    if (violations.length > BASELINE_UNAUTHED_ROUTE_COUNT) {
      const diff = violations.length - BASELINE_UNAUTHED_ROUTE_COUNT;
      console.error(
        `\n${diff} new unauthed DB-touching route(s) beyond baseline ${BASELINE_UNAUTHED_ROUTE_COUNT}.\n` +
          `Either wire one of the sanctioned auth helpers or add a "// @public-endpoint" marker.\n\n` +
          `Current violations (${violations.length}):\n  - ${violations.sort().join("\n  - ")}\n`,
      );
    }
    expect(violations.length).toBeLessThanOrEqual(BASELINE_UNAUTHED_ROUTE_COUNT);
  });

  it("every Phase 70+ helper ships with at least one real caller in api/", () => {
    // Smoke-test: confirm the new helpers we introduced in Phase 70 aren't dead
    // code. If authorizeOrg has zero callers, we've regressed on the migration.
    const PHASE_70_HELPERS = ["authorizeOrg"];
    const callerCountsByHelper = new Map<string, number>();
    for (const file of routes) {
      const src = readFileSync(file, "utf-8");
      for (const helper of PHASE_70_HELPERS) {
        if (src.includes(helper)) {
          callerCountsByHelper.set(helper, (callerCountsByHelper.get(helper) ?? 0) + 1);
        }
      }
    }
    for (const helper of PHASE_70_HELPERS) {
      expect(callerCountsByHelper.get(helper) ?? 0).toBeGreaterThan(0);
    }
  });
});
