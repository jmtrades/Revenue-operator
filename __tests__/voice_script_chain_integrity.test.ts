/**
 * Phase III — Voice layer: script block chaining, no freeform. place_outbound_call only.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice script chain integrity", () => {
  it("execution-plan emit place_outbound_call payload includes script_blocks or script_blocks reference", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toContain("place_outbound_call");
    expect(emit).toMatch(/script_blocks|script_block/);
  });

  it("no voice path uses raw Twilio or freeform text for script", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).not.toMatch(/twilio|\.calls\.create|content:\s*["'][^"']{80,}/);
  });
});
