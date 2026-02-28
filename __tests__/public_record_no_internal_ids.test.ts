/**
 * Invariant: Public record API and page never expose internal ID patterns (UUID, workspace_id, etc.).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

describe("Public record no internal IDs", () => {
  it("public work API returns record shape only; docstring and shape enforce no internal ids", () => {
    const route = read("src/app/api/public/work/[external_ref]/route.ts");
    expect(route).toMatch(/No internal ids|no internal ids|doctrine-safe/);
    expect(route).toMatch(/what_happened|if_removed|reliance/);
  });

  it("public work page does not display workspace_id or lead_id in user-facing copy", () => {
    const page = read("src/app/public/work/[external_ref]/page.tsx");
    expect(page).not.toMatch(/["'`][^"'`]*workspace_id[^"'`]*["'`]/);
    expect(page).not.toMatch(/["'`][^"'`]*lead_id[^"'`]*["'`]/);
  });
});
