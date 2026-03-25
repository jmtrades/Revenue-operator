/**
 * Invariant: runGovernedExecution is the single entry point for governed execution.
 * Only connector ingest invokes it. No bypass of compiler; no alternate emit paths.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

function* walkTs(dir: string, prefix = ""): Generator<string> {
  try {
    const entries = readdirSync(path.join(dir, prefix), { withFileTypes: true });
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".next") continue;
        yield* walkTs(dir, rel);
      } else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") && !e.name.endsWith(".spec.ts")) {
        yield rel;
      }
    }
  } catch {
    // ignore
  }
}

const ALLOWED_RUN_GOVERNED_CALLERS = [
  "app/api/connectors/events/ingest/route.ts",
  "lib/execution-plan/run.ts",
  "lib/execution-plan/index.ts",
];

describe("runGovernedExecution single entry", () => {
  it("runGovernedExecution is only called from connector ingest or re-exported from execution-plan", () => {
    const callers: string[] = [];
    for (const rel of walkTs(SRC, "")) {
      const full = path.join(SRC, rel);
      const normalized = rel.replace(/\\/g, "/");
      try {
        const content = readFileSync(full, "utf-8");
        if (!content.includes("runGovernedExecution")) continue;
        if (ALLOWED_RUN_GOVERNED_CALLERS.some((a) => normalized.includes(a))) continue;
        if (content.includes("runGovernedExecution") && (content.includes("await runGovernedExecution") || content.includes("runGovernedExecution("))) {
          callers.push(normalized);
        }
      } catch {
        // skip
      }
    }
    expect(callers).toEqual([]);
  });
});
