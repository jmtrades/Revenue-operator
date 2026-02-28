/**
 * Public record: copy action label is "Copy record" (not "Copy record link"). Link remains canonical.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_PAGE = path.join(ROOT, "src", "app", "public", "work", "[external_ref]", "page.tsx");

describe("Public record copy label", () => {
  it("button label is Copy record", () => {
    const content = readFileSync(PUBLIC_PAGE, "utf-8");
    expect(content).toContain("Copy record");
    expect(content).not.toContain("Copy record link");
  });

  it("copy still uses canonical URL (origin + path, no query)", () => {
    const content = readFileSync(PUBLIC_PAGE, "utf-8");
    expect(content).toContain("window.location.origin");
    expect(content).toContain("/public/work/");
    const urlBuild = content.match(/`\$\{window\.location\.origin\}\/public\/work\/[^`]+`/);
    expect(urlBuild).toBeTruthy();
    expect(urlBuild![0]).not.toContain("?");
  });
});
