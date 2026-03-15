/**
 * Activation: after redirect show "Execution has been placed under record." for 3s then fade. No confetti, no celebration.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const START_PAGE = path.join(ROOT, "src", "app", "dashboard", "start", "page.tsx");

describe("Activation confirmation identity", () => {
  it("shows activation governance copy via i18n", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    expect(content).toContain('ts("activationGovernance")');
    const en = readFileSync(path.join(ROOT, "src", "i18n", "messages", "en.json"), "utf-8");
    expect(en).toContain("Execution is now under institutional governance.");
  });

  it("fade after 3 seconds (opacity only)", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    expect(content).toContain("activationFading");
    expect(content).toMatch(/setTimeout\([^,]+,\s*3000\)/);
    expect(content).toMatch(/opacity:\s*activationFading\s*\?\s*0\s*:\s*1/);
  });

  it("no confetti or celebration", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    expect(content).not.toContain("confetti");
    expect(content).not.toContain("celebration");
    expect(content).not.toContain("animation");
  });
});
