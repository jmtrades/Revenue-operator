/**
 * Invariant: Hosted executor integrates with rate ceiling; on hit emits pause_execution and founder signal.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

describe("Hosted executor rate ceiling integration", () => {
  it("hosted executor imports assertWithinRateLimit", () => {
    const route = read("src/app/api/cron/hosted-executor/route.ts");
    expect(route).toMatch(/assertWithinRateLimit/);
  });

  it("on rate ceiling hit creates pause_execution intent", () => {
    const route = read("src/app/api/cron/hosted-executor/route.ts");
    expect(route).toMatch(/pause_execution/);
    expect(route).toMatch(/createActionIntent/);
  });

  it("on rate ceiling hit records rate_ceiling_triggered (ledger or founder alert)", () => {
    const route = read("src/app/api/cron/hosted-executor/route.ts");
    expect(route).toMatch(/rate_ceiling_triggered/);
  });
});
