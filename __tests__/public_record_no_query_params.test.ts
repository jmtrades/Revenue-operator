/**
 * Public record: copy record link must be canonical URL only. No query params, no tracking, no internal IDs.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_PAGE = path.join(ROOT, "src", "app", "public", "work", "[external_ref]", "page.tsx");
const NEXT_ACTION_ROUTE = path.join(ROOT, "src", "app", "api", "operational", "next-action", "route.ts");

describe("Public record no query params", () => {
  it("public record copy uses origin + path only, no search or hash", () => {
    const content = readFileSync(PUBLIC_PAGE, "utf-8");
    expect(content).toContain("window.location.origin");
    expect(content).toContain("/public/work/");
    expect(content).not.toMatch(/window\.location\.(search|href)/);
    const copyBuilder = content.match(/`\$\{window\.location\.origin\}.*?`/s);
    expect(copyBuilder).toBeTruthy();
    const urlBuilt = copyBuilder![0];
    expect(urlBuilt).not.toContain("?");
    expect(urlBuilt).not.toContain("&");
    expect(urlBuilt).not.toContain("utm_");
    expect(urlBuilt).not.toContain("ref=");
  });

  it("next-action record_path has no query string concatenation", () => {
    const content = readFileSync(NEXT_ACTION_ROUTE, "utf-8");
    expect(content).toContain("recordPath");
    expect(content).toMatch(/record_path:\s*recordPath/);
    const recordPathAssign = content.match(/recordPath\s*=\s*`\/public\/work\/[^`]+`/);
    expect(recordPathAssign).toBeTruthy();
    expect(recordPathAssign![0]).not.toContain("?");
  });

  it("public record page shows forwarded line", () => {
    const content = readFileSync(PUBLIC_PAGE, "utf-8");
    expect(content).toMatch(/Forwardable without modification|may be forwarded without modification/i);
  });
});
