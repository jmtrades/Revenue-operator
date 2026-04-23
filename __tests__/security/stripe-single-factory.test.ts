/**
 * Phase 78 / Phase 6 (P0-10 Payments) — Single `getStripe()` factory invariant.
 *
 * Before this phase, 17 call sites constructed `new Stripe(...)` directly
 * with their own apiVersion (or none at all). That is a correctness + audit
 * hazard:
 *
 *   1. API-version drift — some routes pinned "2024-12-18.acacia", some
 *      pinned nothing (latest-at-request time), some pinned older versions
 *      that had been deprecated. A webhook handler and a checkout route
 *      disagreeing on apiVersion will serialize the same object differently.
 *
 *   2. No central audit — PCI-adjacent auditors ask "show me every place you
 *      instantiate the Stripe SDK." 17 call sites is a 17x surface area.
 *
 *   3. Key-rotation risk — a forgotten `new Stripe(process.env.FOO)` in one
 *      file keeps working with an old key after rotation, silently drifting
 *      from the rest of the app.
 *
 * This test enforces that `new Stripe(` appears ONLY in the factory module.
 * Every other module must use `getStripe()` from `@/lib/billing/stripe-client`.
 *
 * If this test fails:
 *   - Add a `getStripe()` import in the offending file
 *   - Replace `new Stripe(secretKey, { apiVersion: "..." })` with `getStripe()`
 *   - The factory already pins apiVersion — no need to pass one at the call site
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const SRC_DIR = join(process.cwd(), "src");
/** The ONE file allowed to construct `new Stripe(...)`. */
const FACTORY_FILE = "src/lib/billing/stripe-client.ts";

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("Phase 78/Phase 6 — single Stripe factory invariant", () => {
  it("only src/lib/billing/stripe-client.ts may construct `new Stripe(`", () => {
    const allFiles = walk(SRC_DIR);
    const violations: string[] = [];
    for (const file of allFiles) {
      const rel = file.replace(`${process.cwd()}/`, "");
      if (rel === FACTORY_FILE) continue;
      const content = readFileSync(file, "utf8");
      // Match literal `new Stripe(` at a word boundary to avoid matching
      // e.g. `MyCustomNewStripe`.
      if (/\bnew Stripe\(/.test(content)) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });
});
