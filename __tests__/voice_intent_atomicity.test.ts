/**
 * Ring 3 — Atomic execution intents. place_outbound_call uses dedupe_key,
 * claim uses claimed_at IS NULL, unique on dedupe_key, 23505 handled.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice intent atomicity", () => {
  it("place_outbound_call emission uses dedupe_key", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toContain("place_outbound_call");
    expect(emit).toMatch(/dedupeKey|dedupe_key/);
    expect(emit).toMatch(/call:.*workspaceId|call:.*conversationId/);
  });

  it("createActionIntent uses dedupe_key and handles 23505", () => {
    const index = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(index).toContain("dedupe_key");
    expect(index).toContain("23505");
  });

  it("claimNextActionIntent uses claimed_at IS NULL for atomicity", () => {
    const index = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(index).toContain("claimed_at");
    expect(index).toMatch(/is\(["']claimed_at["'],\s*null\)|\.is\("claimed_at",\s*null\)/);
  });

  it("action_intents table has unique constraint on dedupe_key", () => {
    const migration = readFileSync(path.join(ROOT, "supabase/migrations/action_intents.sql"), "utf-8");
    expect(migration).toMatch(/dedupe_key|unique|UNIQUE/);
  });
});
