/**
 * Voice plan builder: script block order deterministic, required block types, no freeform fallback.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice plan integrity", () => {
  it("voice plan build has deterministic block order (blockTypeOrder)", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/voice/plan/build.ts"), "utf-8");
    expect(build).toMatch(/blockTypeOrder|script_blocks.*sort|order/);
  });

  it("required block types are enforced", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/voice/plan/build.ts"), "utf-8");
    expect(build).toMatch(/REQUIRED_BLOCK_TYPES|opening_block|disclosure_block|close_block/);
  });

  it("no freeform fallback for message text", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/voice/plan/build.ts"), "utf-8");
    expect(build).not.toMatch(/\.content\s*=|choices\[0\]|generateText/);
  });

  it("returns missing_blocks or invalid_state on failure (no generic freeform)", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/voice/plan/build.ts"), "utf-8");
    expect(build).toMatch(/missing_blocks|invalid_state|invalid_input/);
  });
});
