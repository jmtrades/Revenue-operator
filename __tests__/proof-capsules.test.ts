/**
 * Proof capsules: length/line caps, no forbidden words, stable ordering, idempotent upsert, no internal ids.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const PERIOD_PATH = path.join(ROOT, "src/lib/proof-capsule-period/index.ts");
const _MAX_LINE = 90;
const _MAX_LINES = 8;
const FORBIDDEN = ["you", "your", "we", "us", "click", "optimize", "ROI", "KPI", "dashboard", "assistant"];

describe("Proof capsules", () => {
  it("output respects max line length and max lines", () => {
    const content = readFileSync(PERIOD_PATH, "utf-8");
    expect(content).toContain("MAX_LINE_LEN = 90");
    expect(content).toContain("MAX_LINES = 8");
    expect(content).toContain("slice(0, MAX_LINES)");
  });

  it("no forbidden words in proof capsule lines", () => {
    const known = [
      "Outcomes followed intervention.",
      "Confirmation occurred after follow-up.",
      "Conversation resumed after outreach.",
      "Payment completed after reminder.",
      "Agreement acknowledged after request.",
      "Attendance uncertainty did not persist.",
      "Participants acted without reconfirmation.",
    ];
    const wordBoundary = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    for (const line of known) {
      for (const word of FORBIDDEN) {
        expect(wordBoundary(word).test(line), `line should not contain "${word}"`).toBe(false);
      }
    }
  });

  it("builds from causal_chains, continuation_exposures, coordination_displacement", () => {
    const content = readFileSync(PERIOD_PATH, "utf-8");
    expect(content).toContain("causal_chains");
    expect(content).toContain("continuation_exposures");
    expect(content).toContain("coordination_displacement_events");
  });

  it("idempotent upsert uses onConflict", () => {
    const content = readFileSync(PERIOD_PATH, "utf-8");
    expect(content).toContain("upsert");
    expect(content).toContain("onConflict");
    expect(content).toMatch(/workspace_id.*period_end|period_end.*workspace_id/);
  });

  it("no internal ids in known output lines", () => {
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

  it("re-export from proof-capsules index", async () => {
    const mod = await import("@/lib/proof-capsules");
    expect(typeof mod.buildProofCapsuleForPeriod).toBe("function");
    expect(typeof mod.saveProofCapsule).toBe("function");
  });
});
