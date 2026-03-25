/**
 * Contract: thread-participants. Sanitize hints (≤60), no PII in doctrine helper.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { sanitizeParticipantHint } from "@/lib/thread-participants";

const ROOT = path.resolve(__dirname, "..");
const LIB = path.join(ROOT, "src", "lib", "thread-participants", "index.ts");

describe("Thread participants contract", () => {
  it("sanitizeParticipantHint caps length at 60", () => {
    const long = "a".repeat(100);
    const out = sanitizeParticipantHint(long);
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(60);
  });

  it("sanitizeParticipantHint returns null for empty or whitespace", () => {
    expect(sanitizeParticipantHint("")).toBeNull();
    expect(sanitizeParticipantHint("   ")).toBeNull();
    expect(sanitizeParticipantHint(null)).toBeNull();
    expect(sanitizeParticipantHint(undefined)).toBeNull();
  });

  it("sanitizeParticipantHint rejects PII-like content (denylist)", () => {
    expect(sanitizeParticipantHint("user@example.com")).toBeNull();
    expect(sanitizeParticipantHint("see http://example.com")).toBeNull();
    expect(sanitizeParticipantHint("call +441234567890")).toBeNull();
    expect(sanitizeParticipantHint("Supplier")).not.toBeNull();
    expect(sanitizeParticipantHint("Accountant")).not.toBeNull();
  });

  it("listParticipantsForThread returns role and hint only (select has no id)", () => {
    const content = readFileSync(LIB, "utf-8");
    const selectMatch = content.match(/listParticipantsForThread[\s\S]*?\.select\([^)]+\)/);
    expect(selectMatch).toBeTruthy();
    expect(selectMatch![0]).toContain("actor_role");
    expect(selectMatch![0]).toContain("participant_hint");
    expect(selectMatch![0]).not.toContain("id");
  });
});
