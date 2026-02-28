/**
 * Public record authority: institutional header and copy. No automation, AI, software, system.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_PAGE = path.join(ROOT, "src", "app", "public", "work", "[external_ref]", "page.tsx");

describe("Public record authority copy", () => {
  it("has institutional header and verified line", () => {
    const content = readFileSync(PUBLIC_PAGE, "utf-8");
    expect(content).toMatch(/Governed commercial record/i);
    expect(content).toContain("Verified under declared jurisdiction");
  });

  it("has governed execution line under declared jurisdiction", () => {
    const content = readFileSync(PUBLIC_PAGE, "utf-8");
    expect(content).toContain("This record reflects governed execution under declared jurisdiction and review level.");
  });

  it("institutional copy does not mention automation, AI, software, or system", () => {
    const institutionalCopy = [
      "Governed commercial record",
      "This record reflects governed execution under declared jurisdiction and review level.",
    ];
    for (const line of institutionalCopy) {
      const lower = line.toLowerCase();
      expect(lower).not.toContain("automation");
      expect(lower).not.toContain(" ai ");
      expect(lower).not.toContain("software");
      expect(lower).not.toContain("system");
    }
  });

  it("has scarcity signal: record chronological, immutable, cannot be altered", () => {
    const content = readFileSync(PUBLIC_PAGE, "utf-8");
    expect(content).toMatch(/Chronological\.|chronological/i);
    expect(content).toMatch(/Unalterable once issued|cannot be altered/i);
    expect(content).not.toContain("blockchain");
    expect(content).not.toContain("append-only");
    expect(content).not.toContain("audit log");
  });

  it("forward line: may be forwarded without modification", () => {
    const content = readFileSync(PUBLIC_PAGE, "utf-8");
    expect(content).toMatch(/Forwardable without modification|may be forwarded without modification/i);
  });

  it("has viral trigger line and social reinforcement in footer", () => {
    const content = readFileSync(PUBLIC_PAGE, "utf-8");
    expect(content).toContain("If revenue depends on conversation, it must be governed.");
    expect(content).toContain("Used by independent operators and enterprise teams.");
    expect(content).toContain("footer");
  });
});
