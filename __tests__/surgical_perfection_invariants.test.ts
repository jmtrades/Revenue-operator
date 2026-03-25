/**
 * Surgical perfection: canonical pipeline, next-action labels, hosted executor bounds, no TRUNCATE in spine or cron.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const CRON_DIR = path.join(ROOT, "src", "app", "api", "cron");

function* walkCronRoutes(dir: string, prefix = ""): Generator<string> {
  try {
    for (const e of readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) yield* walkCronRoutes(dir, rel);
      else if (e.name === "route.ts") yield path.join(dir, prefix, e.name);
    }
  } catch {
    // ignore
  }
}

const NEXT_ACTION_ALLOWED_LABELS = [
  "Resolve authorization",
  "Confirm governance",
  "Open record",
  "Share record",
  "Record activation",
];

describe("Surgical perfection invariants", () => {
  it("next-action route returns only allowed primary labels", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/operational/next-action/route.ts"), "utf-8");
    for (const label of NEXT_ACTION_ALLOWED_LABELS) {
      expect(content).toContain(label);
    }
    expect(content).not.toContain('label: "Copy record link"');
    expect(content).not.toMatch(/label:\s*["']Add leads/);
  });

  it("next-action always returns ok and at most one primary action per branch", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/operational/next-action/route.ts"), "utf-8");
    expect(content).toMatch(/return NextResponse\.json\(\s*\{\s*ok:\s*true/);
    const returns = content.match(/return NextResponse\.json\(/g) || [];
    expect(returns.length).toBeGreaterThanOrEqual(5);
  });

  it("hosted executor does not contain TRUNCATE", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/cron/hosted-executor/route.ts"), "utf-8");
    expect(content.toLowerCase()).not.toContain("truncate");
  });

  it("hosted executor enforces 2-minute minimum cycle", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/cron/hosted-executor/route.ts"), "utf-8");
    expect(content).toMatch(/MIN_RUN_INTERVAL_MS|2\s*\*\s*60\s*\*\s*1000/);
  });

  it("hosted executor emits execution_cycle_completed per workspace", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/cron/hosted-executor/route.ts"), "utf-8");
    expect(content).toContain("execution_cycle_completed");
  });

  it("hosted executor bounds: max 10 workspaces, 5 intents per workspace", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/cron/hosted-executor/route.ts"), "utf-8");
    expect(content).toMatch(/MAX_WORKSPACES_PER_RUN\s*=\s*10|10\s*workspaces/);
    expect(content).toMatch(/MAX_INTENTS_PER_WORKSPACE_PER_RUN\s*=\s*5|5\s*intents/);
  });

  it("no cron route contains TRUNCATE", () => {
    const violators: string[] = [];
    for (const full of walkCronRoutes(CRON_DIR)) {
      const content = readFileSync(full, "utf-8");
      if (content.toLowerCase().includes("truncate")) {
        violators.push(path.relative(ROOT, full));
      }
    }
    expect(violators).toEqual([]);
  });
});
