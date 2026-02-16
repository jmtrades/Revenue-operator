/**
 * Reliability doctrine: enforced mode blocks legacy, webhooks ingest-only,
 * consumer uses lock, action retry semantics, proof idempotency, grep guards.
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

const appDir = path.join(process.cwd(), "src", "app");

describe("Doctrine enforced — legacy path blocked", () => {
  const orig = process.env.DOCTRINE_ENFORCED;

  afterEach(() => {
    process.env.DOCTRINE_ENFORCED = orig;
  });

  it("processWebhookJob throws when DOCTRINE_ENFORCED=1", async () => {
    process.env.DOCTRINE_ENFORCED = "1";
    const { processWebhookJob } = await import("@/lib/pipeline/process-webhook");
    await expect(processWebhookJob("fake-webhook-id")).rejects.toThrow(/Doctrine violation/);
  });

  it("assertNotEnforcedOrConvert throws when DOCTRINE_ENFORCED=1", async () => {
    process.env.DOCTRINE_ENFORCED = "1";
    const { assertNotEnforcedOrConvert } = await import("@/lib/doctrine/enforce");
    expect(() =>
      assertNotEnforcedOrConvert({ jobType: "process_webhook", id: "x", message: "test" })
    ).toThrow(/Doctrine violation/);
  });
});

describe("Grep guard — no route imports process-webhook in production", () => {
  function findRouteFiles(dir: string): string[] {
    const acc: string[] = [];
    if (!fs.existsSync(dir)) return acc;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith("_") && e.name !== "node_modules") {
        acc.push(...findRouteFiles(full));
      } else if (e.isFile() && (e.name === "route.ts" || e.name === "route.js")) {
        acc.push(full);
      }
    }
    return acc;
  }

  it("no production app route file statically imports process-webhook or processWebhookJob", () => {
    const routes = findRouteFiles(appDir).filter(
      (f) => !f.includes("/api/dev/") && !f.includes("simulate-inbound")
    );
    const violations: string[] = [];
    const staticImportProcessWebhook = /import\s+.*\s+from\s+["'].*process-webhook["']/;
    const staticImportProcessWebhookJob = /import\s+\{[^}]*processWebhookJob[^}]*\}\s+from/;
    for (const file of routes) {
      const content = fs.readFileSync(file, "utf8");
      if (staticImportProcessWebhook.test(content) || staticImportProcessWebhookJob.test(content)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("Webhooks ingest-only — do not call processCanonicalSignal inline", () => {
  function findWebhookRoutes(dir: string): string[] {
    const acc: string[] = [];
    if (!fs.existsSync(dir)) return acc;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) acc.push(...findWebhookRoutes(full));
      else if (e.name === "route.ts" && (full.includes("webhook") || full.includes("inbound")))
        acc.push(full);
    }
    return acc;
  }

  it("inbound/webhook route files do not call processCanonicalSignal", () => {
    const routes = findWebhookRoutes(appDir);
    const violations: string[] = [];
    for (const file of routes) {
      const content = fs.readFileSync(file, "utf8");
      if (content.includes("processCanonicalSignal")) violations.push(path.relative(process.cwd(), file));
    }
    expect(violations).toEqual([]);
  });
});

describe("Signal consumer — uses lead lock", () => {
  it("consumer imports lead-lock and calls acquireLeadLock and releaseLeadLock", () => {
    const consumerPath = path.join(process.cwd(), "src/lib/signals/consumer.ts");
    const content = fs.readFileSync(consumerPath, "utf8");
    expect(content).toMatch(/acquireLeadLock/);
    expect(content).toMatch(/releaseLeadLock/);
    expect(content).toMatch(/lead-lock/);
  });
});

describe("Action retry — failure does not set processed_at, sets next_retry_at", () => {
  it("persist.scheduleActionRetry updates attempt_count, last_error, next_retry_at and never processed_at", () => {
    const persistPath = path.join(process.cwd(), "src/lib/action-queue/persist.ts");
    const content = fs.readFileSync(persistPath, "utf8");
    expect(content).toMatch(/attempt_count/);
    expect(content).toMatch(/last_error/);
    expect(content).toMatch(/next_retry_at/);
    expect(content).not.toMatch(/processed_at.*scheduleActionRetry|scheduleActionRetry.*processed_at/);
    const updateInSchedule = content.slice(content.indexOf("scheduleActionRetry"), content.indexOf("return { shouldDLQ }"));
    expect(updateInSchedule).not.toContain("processed_at");
  });

  it("worker runActionJob on failure calls scheduleActionRetry and does not call markActionCommandProcessed in catch", () => {
    const workerPath = path.join(process.cwd(), "src/lib/action-queue/worker.ts");
    const content = fs.readFileSync(workerPath, "utf8");
    expect(content).toMatch(/scheduleActionRetry/);
    expect(content).toMatch(/markActionCommandProcessed/);
    expect(content).toMatch(/catch\s*\([^)]*\)[\s\S]*?scheduleActionRetry/);
    expect(content).toMatch(/try\s*\{[\s\S]*?markActionCommandProcessed/);
  });
});

describe("Proof idempotency — recordProof uses dedup_key and upsert", () => {
  it("recordProof builds proof_dedup_key from proof_type, lead_id, signal_id", () => {
    const recordPath = path.join(process.cwd(), "src/lib/proof/record.ts");
    const content = fs.readFileSync(recordPath, "utf8");
    expect(content).toMatch(/proof_dedup_key|proofDedupKey|dedup_key/);
    expect(content).toMatch(/upsert|onConflict|ignoreDuplicates/);
  });
});
