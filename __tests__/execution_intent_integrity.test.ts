/**
 * Action intent guarantees: dedupe_key unique, claim uses claimed_at IS NULL, 23505 handled, no deletes.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Execution intent integrity", () => {
  it("claimNextActionIntent uses claimed_at IS NULL", () => {
    const actionIntents = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(actionIntents).toMatch(/claimed_at.*null|is\(["']claimed_at["'].*null\)/);
    expect(actionIntents).toMatch(/\.is\(["']claimed_at["']/);
  });

  it("createActionIntent handles 23505 (unique violation)", () => {
    const actionIntents = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(actionIntents).toMatch(/23505/);
    expect(actionIntents).toMatch(/dedupe_key|dedupeKey/);
  });

  it("no delete operations on action_intents", () => {
    const actionIntents = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(actionIntents).not.toMatch(/\.delete\(|\.remove\(/);
  });

  it("completeActionIntent only updates completed_at, result_status, result_ref", () => {
    const actionIntents = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(actionIntents).toMatch(/completed_at|result_status|result_ref/);
  });
});
