/**
 * Unresolved questions registry: append-only. No DELETE/TRUNCATE. Schema and indexes.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { getOpenQuestions, recordUnresolvedQuestions, resolveQuestions } from "../src/lib/intelligence/unresolved-questions";

const ROOT = path.resolve(__dirname, "..");

describe("Unresolved questions append-only", () => {
  it("migration exists and has no DELETE FROM or TRUNCATE TABLE", () => {
    const p = path.join(ROOT, "supabase/migrations/unresolved_questions_registry.sql");
    expect(existsSync(p)).toBe(true);
    const sql = readFileSync(p, "utf-8");
    expect(sql.toLowerCase()).not.toMatch(/\bdelete\s+from\b/);
    expect(sql.toLowerCase()).not.toMatch(/\btruncate\s+table\b/);
  });

  it("migration creates table unresolved_questions with required columns", () => {
    const sql = readFileSync(path.join(ROOT, "supabase/migrations/unresolved_questions_registry.sql"), "utf-8");
    expect(sql).toContain("unresolved_questions");
    expect(sql).toContain("workspace_id");
    expect(sql).toContain("thread_id");
    expect(sql).toContain("question_type");
    expect(sql).toContain("question_text_short");
    expect(sql).toContain("raised_at");
    expect(sql).toContain("resolved_at");
    expect(sql).toContain("source_channel");
  });

  it("unresolved-questions.ts has no .delete( or .truncate(", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/unresolved-questions.ts"), "utf-8");
    expect(content).not.toMatch(/\.delete\s*\(/);
    expect(content).not.toMatch(/\.truncate\s*\(/);
  });

  it("exports recordUnresolvedQuestions, resolveQuestions, getOpenQuestions", () => {
    expect(typeof recordUnresolvedQuestions).toBe("function");
    expect(typeof resolveQuestions).toBe("function");
    expect(typeof getOpenQuestions).toBe("function");
  });
});
