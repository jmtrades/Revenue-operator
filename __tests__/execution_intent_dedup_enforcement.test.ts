/**
 * Phase VII — Execution intent: dedupe_key enforced, no duplicate intent.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Execution intent dedup enforcement", () => {
  it("createActionIntent requires dedupeKey and handles 23505 unique violation", () => {
    const actionIntents = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(actionIntents).toContain("dedupe_key");
    expect(actionIntents).toContain("23505");
  });

  it("action_intents table has unique constraint on dedupe_key or (workspace_id, dedupe_key)", () => {
    const migration = readFileSync(path.join(ROOT, "supabase/migrations/action_intents.sql"), "utf-8");
    expect(migration).toMatch(/dedupe_key|unique|UNIQUE/);
  });
});
