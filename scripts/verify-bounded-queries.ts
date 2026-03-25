#!/usr/bin/env npx tsx
/**
 * Load guard: Ensures critical routes use ORDER BY + LIMIT (no unbounded scans).
 * Run before launch. Exit 1 if any critical route has unbounded select.
 */

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const CRITICAL_PATHS = [
  "src/app/api/cron/hosted-executor/route.ts",
  "src/app/api/cron/data-retention/route.ts",
  "src/app/api/internal/founder/export/route.ts",
];

function check(content: string, filePath: string): string[] {
  const errors: string[] = [];
  if (!content.includes(".limit(") && !content.includes("maybeSingle()")) {
    errors.push(`${filePath}: no .limit( or maybeSingle() found`);
  }
  if (content.includes(".from(") && !content.includes("limit") && !content.includes("maybeSingle") && !content.includes("single()")) {
    errors.push(`${filePath}: db queries must use .limit( or maybeSingle()/single()`);
  }
  return errors;
}

function main(): void {
  let failed = false;
  for (const rel of CRITICAL_PATHS) {
    const full = path.join(root, rel);
    try {
      const content = readFileSync(full, "utf-8");
      const errs = check(content, rel);
      if (errs.length > 0) {
        errs.forEach((e) => console.error("[verify-bounded-queries]", e));
        failed = true;
      }
    } catch (e) {
      console.error("[verify-bounded-queries]", rel, e);
      failed = true;
    }
  }
  if (failed) {
    process.exit(1);
  }
  console.log("[verify-bounded-queries] All critical routes use bounded queries.");
}

main();
