/**
 * Invariant: Data retention route uses INSERT INTO archive; does not DELETE.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

describe("Data retention append-only", () => {
  it("retention route contains INSERT into archive tables", () => {
    const route = read("src/app/api/cron/data-retention/route.ts");
    expect(route).toMatch(/public_record_views_archive|executor_outcome_reports_archive|operational_ledger_archive/);
    expect(route).toMatch(/\.insert\s*\(/);
  });

  it("retention route does not contain DELETE FROM", () => {
    const route = read("src/app/api/cron/data-retention/route.ts");
    expect(route).not.toMatch(/delete\s+from|\.delete\s*\(/i);
  });
});
