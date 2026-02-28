/**
 * Invariant: Operational spine tables are never deleted. Append-only; only archived_at marking allowed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const SPINE_TABLES = [
  "operational_ledger",
  "activation_milestones",
  "public_record_views",
  "connector_events_dead_letter",
  "workspace_invites",
  "action_intents",
  "message_approval_decisions",
  "message_approval_locks",
];

function* walkTs(dir: string, prefix = ""): Generator<string> {
  try {
    const entries = readdirSync(path.join(dir, prefix), { withFileTypes: true });
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".next") continue;
        yield* walkTs(dir, rel);
      } else if ((e.name.endsWith(".ts") || e.name.endsWith(".tsx")) && !e.name.endsWith(".test.ts") && !e.name.endsWith(".spec.ts")) {
        yield rel;
      }
    }
  } catch {
    // ignore
  }
}

describe("Operational spine no DELETE", () => {
  it("no file in src contains .from(spine_table).delete()", () => {
    const violations: { file: string; table: string }[] = [];
    for (const rel of walkTs(SRC, "")) {
      const full = path.join(SRC, rel);
      try {
        const content = readFileSync(full, "utf-8");
        for (const table of SPINE_TABLES) {
          const quoted = `["']${table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`;
          const fromDelete = new RegExp(`\\.from\\s*\\(\\s*${quoted}\\s*\\)[\\s\\S]{0,200}\\.delete\\s*\\(`, "m");
          if (fromDelete.test(content)) violations.push({ file: rel, table });
        }
      } catch {
        // skip
      }
    }
    expect(violations).toEqual([]);
  });
});
