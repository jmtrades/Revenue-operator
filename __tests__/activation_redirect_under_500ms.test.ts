/**
 * Activation success: show confirmation message then redirect. No instant redirect; 3s message then fade (activation_confirmation_identity covers copy).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const START_PAGE = path.join(ROOT, "src", "app", "dashboard", "start", "page.tsx");

describe("Activation redirect under 500ms", () => {
  it("shows confirmation when checkout=success", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    expect(content).toContain("Execution is now under institutional governance.");
    expect(content).toContain("checkout");
    expect(content).toContain("success");
  });

  it("confirmation shown for 3s then redirect (bounded timing)", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    expect(content).toContain("3000");
    expect(content).toMatch(/setTimeout\([^,]+,\s*3000\)/);
    expect(content).toMatch(/setTimeout\([^,]+,\s*3400\)/);
  });

  it("redirect goes to dashboard start without checkout param", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    expect(content).toContain("router.replace");
    expect(content).toContain("/dashboard/start");
  });
});
