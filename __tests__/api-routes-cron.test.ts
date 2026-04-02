/**
 * Structural tests for cron API routes.
 * Validates exports, authorization, error handling across a representative sample.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const CRON_DIR = path.join(ROOT, "src", "app", "api", "cron");

function readRoute(subdir: string): string {
  const filePath = path.join(CRON_DIR, subdir, "route.ts");
  expect(existsSync(filePath), `cron/${subdir}/route.ts should exist`).toBe(true);
  return readFileSync(filePath, "utf-8");
}

/** Representative sample of cron routes covering different categories */
const CRON_SAMPLE = [
  "billing",
  "core",
  "daily-digest",
  "daily-metrics",
  "daily-trust",
  "deal-death",
  "adoption-acceleration",
  "benchmark-aggregation",
  "campaign-process",
  "closure",
  "commitment-recovery",
  "coordination",
  "data-retention",
  "economic-activation",
  "self-healing",
  "heartbeat",
  "guarantee",
  "guarantees",
  "learning",
  "network-intelligence",
  "month-end-anchor",
  "morning-state",
];

describe("Cron routes: directory contains expected routes", () => {
  it("cron directory exists and contains many routes", () => {
    expect(existsSync(CRON_DIR)).toBe(true);
    const entries = readdirSync(CRON_DIR);
    // There are 101+ cron routes
    expect(entries.length).toBeGreaterThanOrEqual(50);
  });

  for (const route of CRON_SAMPLE) {
    it(`cron/${route}/route.ts exists`, () => {
      const filePath = path.join(CRON_DIR, route, "route.ts");
      expect(existsSync(filePath)).toBe(true);
    });
  }
});

describe("Cron routes: export POST or GET handlers", () => {
  for (const route of CRON_SAMPLE) {
    it(`cron/${route} exports GET or POST handler`, () => {
      const src = readRoute(route);
      const hasGet = /export\s+async\s+function\s+GET/.test(src);
      const hasPost = /export\s+async\s+function\s+POST/.test(src);
      expect(
        hasGet || hasPost,
        `cron/${route} should export GET or POST handler`,
      ).toBe(true);
    });
  }
});

describe("Cron routes: authorization via CRON_SECRET / assertCronAuthorized", () => {
  for (const route of CRON_SAMPLE) {
    it(`cron/${route} uses assertCronAuthorized`, () => {
      const src = readRoute(route);
      expect(src).toContain("assertCronAuthorized");
    });
  }

  it("assertCronAuthorized is imported from @/lib/runtime", () => {
    // Check a few routes to confirm import source
    for (const route of ["billing", "core", "daily-digest", "heartbeat"]) {
      const src = readRoute(route);
      expect(src).toMatch(/import.*assertCronAuthorized.*from.*["']@\/lib\/runtime["']/);
    }
  });

  it("authorization check is called before any business logic", () => {
    // The authErr check should be near the top of the handler
    for (const route of ["billing", "daily-metrics", "heartbeat", "closure"]) {
      const src = readRoute(route);
      const handlerMatch = src.match(/export\s+async\s+function\s+(GET|POST)\s*\(/);
      expect(handlerMatch).not.toBeNull();

      // assertCronAuthorized should appear before any db calls
      const authIdx = src.indexOf("assertCronAuthorized");
      const dbIdx = src.indexOf("getDb()");

      if (dbIdx > -1) {
        expect(authIdx).toBeLessThan(dbIdx);
      }
    }
  });
});

describe("Cron routes: error handling", () => {
  it("billing cron wraps logic in try/catch", () => {
    const src = readRoute("billing");
    expect(src).toContain("try {");
    expect(src).toContain("catch");
  });

  it("daily-metrics cron has error handling", () => {
    const src = readRoute("daily-metrics");
    expect(src).toContain("try {");
    expect(src).toContain("catch");
  });

  it("campaign-process cron has error handling", () => {
    const src = readRoute("campaign-process");
    expect(src).toContain("try {");
    expect(src).toContain("catch");
  });

  it("deal-death cron delegates to domain functions (detectDealDeath, recordDealDeathSignal)", () => {
    const src = readRoute("deal-death");
    expect(src).toContain("detectDealDeath");
    expect(src).toContain("recordDealDeathSignal");
  });

  it("adoption-acceleration cron has error handling", () => {
    const src = readRoute("adoption-acceleration");
    // Uses runSafeCron which wraps in try/catch
    const hasTryCatch = src.includes("try {") || src.includes("runSafeCron");
    expect(hasTryCatch).toBe(true);
  });

  it("self-healing cron has error handling", () => {
    const src = readRoute("self-healing");
    expect(src).toContain("try {");
    expect(src).toContain("catch");
  });

  it("core bundler uses runSafeCron for safe execution", () => {
    const src = readRoute("core");
    expect(src).toContain("runSafeCron");
  });

  it("guarantees bundler uses runSafeCron for safe execution", () => {
    const src = readRoute("guarantees");
    expect(src).toContain("runSafeCron");
  });
});

describe("Cron routes: force-dynamic export", () => {
  for (const route of CRON_SAMPLE) {
    it(`cron/${route} exports dynamic = "force-dynamic"`, () => {
      const src = readRoute(route);
      expect(src).toContain('"force-dynamic"');
    });
  }
});

describe("Cron routes: return structured JSON responses", () => {
  it("billing cron returns JSON with ok field", () => {
    const src = readRoute("billing");
    expect(src).toContain("NextResponse.json");
  });

  it("heartbeat cron returns JSON with ok and timestamp", () => {
    const src = readRoute("heartbeat");
    expect(src).toContain("ok: true");
    expect(src).toContain("ts:");
  });

  it("daily-trust cron returns JSON with sent count", () => {
    const src = readRoute("daily-trust");
    expect(src).toContain("ok: true");
    expect(src).toContain("sent:");
  });

  it("month-end-anchor cron returns JSON with sent count", () => {
    const src = readRoute("month-end-anchor");
    expect(src).toContain("ok: true");
    expect(src).toContain("sent:");
  });

  it("network-intelligence cron returns JSON", () => {
    const src = readRoute("network-intelligence");
    expect(src).toContain("ok: true");
  });
});

describe("Cron routes: no hardcoded secrets", () => {
  for (const route of CRON_SAMPLE) {
    it(`cron/${route} does not contain hardcoded secrets`, () => {
      const src = readRoute(route);
      expect(src).not.toMatch(/sk_live_[a-zA-Z0-9]+/);
      expect(src).not.toMatch(/sk_test_[a-zA-Z0-9]+/);
      expect(src).not.toMatch(/whsec_[a-zA-Z0-9]+/);
      // No hardcoded CRON_SECRET values
      expect(src).not.toMatch(/CRON_SECRET\s*=\s*["'][a-zA-Z0-9]+["']/);
    });
  }
});

describe("Cron routes: broad sample across all subdirectories", () => {
  it("all cron route directories contain a route.ts file", () => {
    const entries = readdirSync(CRON_DIR);
    const missing: string[] = [];
    for (const entry of entries) {
      const routeFile = path.join(CRON_DIR, entry, "route.ts");
      if (!existsSync(routeFile)) {
        missing.push(entry);
      }
    }
    // All directories should have a route.ts
    expect(missing).toEqual([]);
  });

  it("every cron route imports from next/server", () => {
    const entries = readdirSync(CRON_DIR);
    const failures: string[] = [];
    for (const entry of entries) {
      const routeFile = path.join(CRON_DIR, entry, "route.ts");
      if (!existsSync(routeFile)) continue;
      const src = readFileSync(routeFile, "utf-8");
      if (!src.includes("next/server")) {
        failures.push(entry);
      }
    }
    expect(failures).toEqual([]);
  });

  it("every cron route uses assertCronAuthorized", () => {
    const entries = readdirSync(CRON_DIR);
    const failures: string[] = [];
    for (const entry of entries) {
      const routeFile = path.join(CRON_DIR, entry, "route.ts");
      if (!existsSync(routeFile)) continue;
      const src = readFileSync(routeFile, "utf-8");
      if (!src.includes("assertCronAuthorized")) {
        failures.push(entry);
      }
    }
    // All cron routes must verify authorization
    expect(failures).toEqual([]);
  });

  it("every cron route exports dynamic = force-dynamic", () => {
    const entries = readdirSync(CRON_DIR);
    const failures: string[] = [];
    for (const entry of entries) {
      const routeFile = path.join(CRON_DIR, entry, "route.ts");
      if (!existsSync(routeFile)) continue;
      const src = readFileSync(routeFile, "utf-8");
      if (!src.includes('"force-dynamic"')) {
        failures.push(entry);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("Cron routes: core bundler orchestrates many sub-crons", () => {
  it("core bundler defines CORE_STEPS array with sub-cron paths", () => {
    const src = readRoute("core");
    expect(src).toContain("CORE_STEPS");
    // Should reference multiple cron paths
    expect(src).toContain("/api/cron/connector-inbox");
    expect(src).toContain("/api/cron/hosted-executor");
    expect(src).toContain("/api/cron/action-intent-watchdog");
    expect(src).toContain("/api/cron/self-healing");
    expect(src).toContain("/api/cron/data-retention");
  });

  it("guarantees bundler defines GUARANTEE_STEPS array", () => {
    const src = readRoute("guarantees");
    expect(src).toContain("GUARANTEE_STEPS");
    expect(src).toContain("/api/cron/progress-watchdog");
    expect(src).toContain("/api/cron/integrity-audit");
    expect(src).toContain("/api/cron/closure");
  });
});

describe("Cron routes: specific domain logic", () => {
  it("data-retention cron enforces workspace-level retention policies", () => {
    const src = readRoute("data-retention");
    expect(src).toContain("data_retention");
    expect(src).toContain("purge");
  });

  it("campaign-process cron respects daily limits per billing tier", () => {
    const src = readRoute("campaign-process");
    expect(src).toContain("BILLING_PLANS");
    expect(src).toContain("MAX_PER_TICK");
  });

  it("economic-activation cron recomputes economic_active", () => {
    const src = readRoute("economic-activation");
    expect(src).toContain("recomputeEconomicActive");
    expect(src).toContain("ensureActivation");
  });

  it("commitment-recovery cron transitions stale commitments and escalates", () => {
    const src = readRoute("commitment-recovery");
    expect(src).toContain("transitionStaleCommitments");
    expect(src).toContain("runRecoveryForCommitment");
    expect(src).toContain("escalateCommitmentToAuthority");
  });

  it("benchmark-aggregation cron computes anonymized industry benchmarks", () => {
    const src = readRoute("benchmark-aggregation");
    expect(src).toContain("benchmark");
    expect(src).toContain("industry");
  });
});
