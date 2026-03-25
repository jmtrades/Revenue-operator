/**
 * Invariant: Hosted executor route is bounded (ORDER BY + LIMIT), no DELETE, no provider calls.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

describe("Hosted executor bounded", () => {
  it("hosted executor route contains ORDER BY and LIMIT", () => {
    const route = read("src/app/api/cron/hosted-executor/route.ts");
    expect(route).toMatch(/order\s*\(\s*["']created_at["']/i);
    expect(route).toMatch(/\.limit\s*\(/);
  });

  it("hosted executor route does not contain DELETE", () => {
    const route = read("src/app/api/cron/hosted-executor/route.ts");
    expect(route).not.toMatch(/\.delete\s*\(|DELETE\s+FROM|delete\s*from/i);
  });

  it("hosted executor route does not call delivery providers (twilio, stripe send)", () => {
    const route = read("src/app/api/cron/hosted-executor/route.ts");
    expect(route).not.toMatch(/twilio|stripe\.(messages|customers)|sendSms|sendEmail|createMessage/i);
  });

  it("hosted executor respects rate limit and emits pause_execution", () => {
    const route = read("src/app/api/cron/hosted-executor/route.ts");
    expect(route).toMatch(/assertWithinRateLimit|RateLimitExceededError/);
    expect(route).toMatch(/pause_execution/);
    expect(route).toMatch(/rate_ceiling_triggered/);
  });
});
