/**
 * Phase 73 — /changelog contract test.
 *
 * Guards the shape and integrity of the in-file release list because it's
 * both a customer-facing surface (SEO-indexed) AND a marketing-facing one
 * (release notes). Shape regressions are easy to introduce via merge
 * conflicts on dates / kinds, and we don't want "2026-0-01" or
 * "impproved" slipping through.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const PAGE_PATH = path.resolve(__dirname, "..", "src", "app", "changelog", "page.tsx");

function loadSource(): string {
  return fs.readFileSync(PAGE_PATH, "utf8");
}

/**
 * Extract the RELEASES array by a regex, then pull out each `date:` and
 * `kind:` literal. We parse via regex rather than dynamic-importing the
 * .tsx because the file depends on `next/link` and CSS, which would need
 * a full Next runtime to import.
 */
function extractDates(src: string): string[] {
  const matches = Array.from(src.matchAll(/date:\s*"(\d{4}-\d{2}-\d{2})"/g));
  return matches.map((m) => m[1]).filter((d): d is string => typeof d === "string");
}

function extractKinds(src: string): string[] {
  const matches = Array.from(src.matchAll(/kind:\s*"([a-z_]+)"/g));
  return matches.map((m) => m[1]).filter((d): d is string => typeof d === "string");
}

describe("/changelog — release list contract", () => {
  const src = loadSource();

  it("exports a default Next page component", () => {
    expect(src).toMatch(/export\s+default\s+function\s+ChangelogPage/);
  });

  it("contains at least 3 release entries", () => {
    const dates = extractDates(src);
    expect(dates.length).toBeGreaterThanOrEqual(3);
  });

  it("all dates parse as valid YYYY-MM-DD", () => {
    const dates = extractDates(src);
    for (const d of dates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const t = new Date(d + "T00:00:00Z").getTime();
      expect(Number.isFinite(t)).toBe(true);
      // Date is non-future (changelog is for shipped work).
      expect(t).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000);
    }
  });

  it("releases are listed in strictly descending date order", () => {
    const dates = extractDates(src);
    const times = dates.map((d) => new Date(d + "T00:00:00Z").getTime());
    for (let i = 1; i < times.length; i++) {
      // Allow equal (multiple releases same day) but never older before newer.
      expect(times[i - 1]).toBeGreaterThanOrEqual(times[i] ?? 0);
    }
  });

  it("every entry kind is from the allowed set", () => {
    const allowed = new Set(["added", "improved", "fixed", "security"]);
    const kinds = extractKinds(src);
    expect(kinds.length).toBeGreaterThan(0);
    for (const k of kinds) {
      expect(allowed.has(k)).toBe(true);
    }
  });

  it("emits JSON-LD (schema.org Blog) for search engines", () => {
    expect(src).toContain("application/ld+json");
    expect(src).toContain("\"@type\": \"Blog\"");
  });

  it("links to /docs and /status for cross-navigation", () => {
    expect(src).toMatch(/href="\/docs"/);
    expect(src).toMatch(/href="\/status"/);
  });
});

describe("/changelog — sitemap integration", () => {
  it("sitemap.ts includes the /changelog URL", () => {
    const sitemapSrc = fs.readFileSync(
      path.resolve(__dirname, "..", "src", "app", "sitemap.ts"),
      "utf8",
    );
    expect(sitemapSrc).toContain("/changelog");
  });
});
