import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("UNSPECIFIED jurisdiction forces preview", () => {
  it("compile / execution-plan never use send when jurisdiction is UNSPECIFIED", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    // Sanity: UNSPECIFIED guard present
    expect(build).toMatch(/jurisdictionUnspecified/);
    // When jurisdictionUnspecified branch is taken, we should use preview_required / emit_preview semantics, not send.
    expect(build).toMatch(/jurisdictionUnspecified .*\\? \"preview_required\"/s);
  });
});

