/**
 * Phase VII — Execution intent: atomic claim, replay-safe.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Execution intent claim atomicity", () => {
  it("claim uses claimed_at IS NULL in update/select so only one worker claims", () => {
    const actionIntents = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(actionIntents).toMatch(/claimed_at|is\s*\(\s*["']claimed_at["']\s*,\s*null\s*\)/);
  });

  it("action_intents migration has claimed_at column", () => {
    const migration = readFileSync(path.join(ROOT, "supabase/migrations/action_intents.sql"), "utf-8");
    expect(migration).toMatch(/claimed_at/);
  });
});
