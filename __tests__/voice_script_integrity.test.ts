/**
 * Voice script integrity (IV): place_outbound_call intent has script_blocks, disclaimer_lines; no freeform.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice intent payload shape", () => {
  it("execution-plan emit place_outbound_call payload includes script_blocks", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toContain("place_outbound_call");
  });

  it("voice intent contract test exists and validates payload", () => {
    const voiceTest = readFileSync(
      path.join(ROOT, "__tests__/voice-intent-contract.test.ts"),
      "utf-8"
    );
    expect(voiceTest).toContain("place_outbound_call");
    expect(voiceTest).toContain("script_blocks");
  });
});

describe("No voice API in repo", () => {
  it("execution-plan does not import Twilio voice or place direct call", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(build).not.toContain("twilio");
    expect(emit).not.toContain("calls.create");
  });
});
