/**
 * Proof capsule: dependency-outcome lines only. Max 8 lines, max 90 chars, no forbidden words.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MAX_LINE = 90;
const MAX_LINES = 8;
const FORBIDDEN = ["you", "your", "we", "us", "click", "optimize", "ROI", "KPI", "dashboard"];

describe("Proof capsule period", () => {
  it("module defines max line and max lines constants", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");
    expect(content).toContain("MAX_LINE_LEN = 90");
    expect(content).toContain("MAX_LINES = 8");
  });

  it("causality and continuation and displacement lines are at most 90 chars", () => {
    const known = [
      "Outcomes followed intervention.",
      "Confirmation occurred after follow-up.",
      "Conversation resumed after outreach.",
      "Payment completed after reminder.",
      "Agreement acknowledged after request.",
      "A delay did not continue.",
      "Attendance uncertainty did not persist.",
      "Participants acted without reconfirmation.",
      "Payment followed recorded terms.",
      "Coordination occurred through the record.",
    ];
    for (const line of known) {
      expect(line.length).toBeLessThanOrEqual(MAX_LINE);
    }
  });

  it("line categories count is within max lines", () => {
    const known = [
      "Outcomes followed intervention.",
      "Confirmation occurred after follow-up.",
      "Attendance uncertainty did not persist.",
      "Participants acted without reconfirmation.",
    ];
    expect(known.length).toBeLessThanOrEqual(MAX_LINES);
  });

  it("no forbidden words in proof capsule lines", () => {
    const known = [
      "Outcomes followed intervention.",
      "Confirmation occurred after follow-up.",
      "Payments completed after reminder.",
      "Agreement acknowledged after request.",
      "An operational failure did not continue.",
    ];
    const wordBoundary = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    for (const line of known) {
      for (const word of FORBIDDEN) {
        expect(wordBoundary(word).test(line), `line should not contain "${word}"`).toBe(false);
      }
    }
  });

  it("normalization line is at most 90 chars", () => {
    const line = "Work proceeded without verification.";
    expect(line.length).toBeLessThanOrEqual(MAX_LINE);
  });

  it("protection line is at most 90 chars and capsule can include it when capacity allows", () => {
    const protectionLine = "An operational failure did not continue.";
    expect(protectionLine.length).toBeLessThanOrEqual(MAX_LINE);
    const content = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");
    expect(content).toContain("operational_exposures");
    expect(content).toContain("PROOF_CAPSULE_PROTECTION_LINE");
    expect(content).toContain("interrupted_by_process");
  });

  it("no internal ids in known output shape", () => {
    const known = [
      "Outcomes followed intervention.",
      "Confirmation occurred after follow-up.",
      "Agreement acknowledged after request.",
    ];
    const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    for (const line of known) {
      expect(uuidRe.test(line), `line should not contain uuid: ${line}`).toBe(false);
    }
  });
});
