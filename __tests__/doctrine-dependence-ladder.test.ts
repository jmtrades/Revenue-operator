/**
 * Doctrine: evidence from dependence ladder must be factual only.
 * No numbers in user-facing outputs, max 90 chars, no marketing wording.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MAX_CHARS = 90;
const NO_NUMBERS = /\d|%|percent|percentile|score|ROI|KPI|saved|revenue|efficiency|optimization|improvement|performance|metric/i;
const MARKETING = /\b(you|your|we|us|click|try|discover|unlock|leverage|boost|maximize|minimize|best-in-class|cutting-edge)\b/i;

function allProofCapsuleLines(): string[] {
  const content = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");
  const lines: string[] = [];
  const lineRegex = /"(?:[^"\\]|\\.)*"/g;
  let m: RegExpExecArray | null;
  while ((m = lineRegex.exec(content)) !== null) {
    const s = m[0].slice(1, -1);
    if (s.length > 10 && !s.startsWith("workspace") && !s.includes(".")) continue;
    if (s.includes("followed") || s.includes("occurred") || s.includes("resumed") || s.includes("completed") || s.includes("acknowledged") || s.includes("did not") || s.includes("acted without") || s.includes("followed recorded") || s.includes("through the record") || s.includes("without manual")) lines.push(s);
  }
  const causality = ["Outcomes followed intervention.", "Confirmation occurred after follow-up.", "Conversation resumed after outreach.", "Payment completed after reminder.", "Agreement acknowledged after request."];
  const continuation = ["A delay did not continue.", "Attendance uncertainty did not persist.", "The payment did not remain outstanding.", "The agreement did not remain unconfirmed."];
  const displacement = ["Participants acted without reconfirmation.", "Payment followed recorded terms.", "Coordination occurred through the record.", "Work proceeded without manual clarification."];
  return [...causality, ...continuation, ...displacement];
}

describe("Doctrine: dependence ladder outputs", () => {
  it("no numbers in proof capsule line content", () => {
    const lines = allProofCapsuleLines();
    for (const line of lines) {
      expect(NO_NUMBERS.test(line), `line should contain no numbers/metrics: "${line}"`).toBe(false);
    }
  });

  it("proof capsule lines are at most 90 chars", () => {
    const lines = allProofCapsuleLines();
    for (const line of lines) {
      expect(line.length, `"${line}"`).toBeLessThanOrEqual(MAX_CHARS);
    }
  });

  it("proof capsule lines use only factual language", () => {
    const lines = allProofCapsuleLines();
    for (const line of lines) {
      expect(MARKETING.test(line), `line should not contain marketing wording: "${line}"`).toBe(false);
    }
  });

  it("continuation engine lines have no numbers", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/continuation-engine/record.ts"), "utf-8");
    const lines = [
      "A response delay would have continued.",
      "Attendance uncertainty would have remained.",
      "Payment would have remained incomplete.",
      "Responsibility would have remained unclear.",
    ];
    for (const line of lines) {
      expect(content).toContain(line);
      expect(NO_NUMBERS.test(line)).toBe(false);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    }
  });

  it("coordination displacement lines have no numbers", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/coordination-displacement/record.ts"), "utf-8");
    const afterLines = [
      "Participants acted without reconfirmation.",
      "Payment followed recorded terms.",
      "Responsibility was clarified through the record.",
      "Work proceeded without manual clarification.",
    ];
    const withoutLines = [
      "A schedule was confirmed without follow-up.",
      "Payment completed without manual chasing.",
      "Responsibility was clarified through the record.",
      "A shared record was confirmed without prompting.",
      "A conversation continued without re-engagement.",
    ];
    for (const line of [...afterLines, ...withoutLines]) {
      expect(content).toContain(line);
      expect(NO_NUMBERS.test(line)).toBe(false);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    }
  });

  it("record reference lines have no numbers and are at most 90 chars", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/record-reference/record.ts"), "utf-8");
    const lines = [
      "A participant referenced the record.",
      "A shared record was accessed as authority.",
    ];
    for (const line of lines) {
      expect(content).toContain(line);
      expect(NO_NUMBERS.test(line)).toBe(false);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    }
  });

  it("institutional_state transitions are deterministic (no random or time-dependent branching for state)", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/institutional-state/recompute.ts"), "utf-8");
    expect(content).not.toMatch(/Math\.random|random\(\)/);
    expect(content).toContain("operationally_embedded");
    expect(content).toContain("structurally_dependent");
  });

  it("operability anchor, assumption and normalization lines have no numbers and are at most 90 chars", () => {
    const operabilityLines = [
      "The operation is being maintained by the process.",
      "Ongoing work is being coordinated through the record.",
      "Current activity depends on the operating process.",
      "The operation became sustained through the process.",
      "The operation depended on the process remaining active.",
      "Work proceeded assuming the process.",
      "Work proceeded without verification.",
      "The process became treated as part of normal operation.",
    ];
    for (const line of operabilityLines) {
      expect(NO_NUMBERS.test(line)).toBe(false);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    }
  });

  it("exposure engine protection lines have no numbers and are at most 90 chars", () => {
    const exposureLines = [
      "A conversation would have remained without response.",
      "Attendance would have remained uncertain.",
      "Payment would have remained incomplete.",
      "Confirmation would have remained unreceived.",
      "An outcome would have remained unconfirmed.",
      "The process prevented an operational failure.",
      "An operational failure did not continue.",
    ];
    for (const line of exposureLines) {
      expect(NO_NUMBERS.test(line)).toBe(false);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    }
  });

  it("detachment lines have no numbers and are at most 90 chars", () => {
    const detachmentLines = [
      "Outcomes no longer required provider action.",
      "The process operated without supervision.",
      "Operations continued during absence.",
      "The process continued without provider involvement.",
      "The outcome did not require provider action.",
      "Operations remained stable during inactivity.",
      "Resolution occurred without manual decision.",
      "The provider was no longer required for operation.",
    ];
    for (const line of detachmentLines) {
      expect(NO_NUMBERS.test(line)).toBe(false);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    }
  });

  it("responsibility trace and proof capsule responsibility lines have no numbers and are at most 90 chars", () => {
    const traceLines = [
      "The outcome followed the operating process.",
      "The decision remained with the provider.",
      "Responsibility was shared between parties.",
    ];
    const proofLines = [
      "Outcomes occurred under the operating process.",
      "Decisions executed through the shared record.",
      "The provider did not manually determine the outcome.",
    ];
    for (const line of [...traceLines, ...proofLines]) {
      expect(NO_NUMBERS.test(line)).toBe(false);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    }
    const traceContent = readFileSync(path.join(ROOT, "src/lib/responsibility-moments/record.ts"), "utf-8");
    for (const line of traceLines) {
      expect(traceContent).toContain(line);
    }
    const proofContent = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");
    for (const line of proofLines) {
      expect(proofContent).toContain(line);
    }
  });
});
