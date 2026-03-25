/**
 * Conversation state snapshots: append-only. No DELETE. Bounded retrieval.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { buildConversationSnapshot, getPreviousSnapshot } from "../src/lib/intelligence/conversation-snapshot";

const ROOT = path.resolve(__dirname, "..");

describe("Snapshot append-only", () => {
  it("migration exists and has no DELETE FROM or TRUNCATE TABLE", () => {
    const p = path.join(ROOT, "supabase/migrations/conversation_state_snapshots.sql");
    expect(existsSync(p)).toBe(true);
    const sql = readFileSync(p, "utf-8");
    expect(sql.toLowerCase()).not.toMatch(/\bdelete\s+from\b/);
    expect(sql.toLowerCase()).not.toMatch(/\btruncate\s+table\b/);
  });

  it("conversation-snapshot.ts has no .delete( or .truncate(", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/conversation-snapshot.ts"), "utf-8");
    expect(content).not.toMatch(/\.delete\s*\(/);
    expect(content).not.toMatch(/\.truncate\s*\(/);
  });

  it("getPreviousSnapshot and buildConversationSnapshot are functions", () => {
    expect(typeof buildConversationSnapshot).toBe("function");
    expect(typeof getPreviousSnapshot).toBe("function");
  });

  it("conversation-snapshot uses ORDER BY and LIMIT for retrieval", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/conversation-snapshot.ts"), "utf-8");
    expect(content).toContain(".order(");
    expect(content).toContain(".limit(");
  });
});
