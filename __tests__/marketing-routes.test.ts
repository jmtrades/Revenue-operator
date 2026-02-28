/**
 * Contract: marketing routes /pricing and /example.
 * Factual copy only. Example uses DEMO_EXTERNAL_REF for demo public record.
 * Marketing pages are excluded from doctrine forbidden-language tests; see docs.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Marketing routes contract", () => {
  describe("Pricing page", () => {
    it("has factual tiers Solo, Growth, Team", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "pricing", "page.tsx"), "utf-8");
      expect(content).toContain("Solo");
      expect(content).toContain("Growth");
      expect(content).toContain("Team");
    });

    it("does not expose internal IDs", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "pricing", "page.tsx"), "utf-8");
      expect(content).not.toMatch(/workspace_id|lead_id|uuid/);
    });
  });

  describe("Example page", () => {
    it("uses DEMO_EXTERNAL_REF or NEXT_PUBLIC_DEMO_EXTERNAL_REF and redirects to public work", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "example", "page.tsx"), "utf-8");
      expect(content).toContain("DEMO_EXTERNAL_REF");
      expect(content).toContain("redirect");
      expect(content).toContain("/public/work/");
    });

    it("shows Demo not configured when ref not set", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "example", "page.tsx"), "utf-8");
      expect(content).toContain("Demo not configured");
    });
  });
});
