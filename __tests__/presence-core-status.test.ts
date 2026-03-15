/**
 * Contract: Presence page renders Core status as factual lines only; no icons or badges.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const PRESENCE_PAGE = path.join(ROOT, "src", "app", "dashboard", "presence", "page.tsx");

describe("Presence core status contract", () => {
  it("fetches core-status API", () => {
    const content = readFileSync(PRESENCE_PAGE, "utf-8");
    expect(content).toContain("core-status");
    expect(content).toContain("workspace_id");
  });

  it("renders Core status section with factual lines", () => {
    const content = readFileSync(PRESENCE_PAGE, "utf-8");
    expect(content).toContain("coreStatus");
    expect(content).toContain("inboundWasActive");
    expect(content).toContain("queueWasActive");
  });

  it("uses no icon or badge components", () => {
    const content = readFileSync(PRESENCE_PAGE, "utf-8");
    expect(content).not.toContain("Icon");
    expect(content).not.toContain("Badge");
  });
});
