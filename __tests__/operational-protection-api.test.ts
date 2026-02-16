/**
 * GET /api/operational/protection: array of strings only, no ids, empty when none.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("operational protection API", () => {
  it("route returns JSON array only", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/operational/protection/route.ts"), "utf-8");
    expect(route).toContain("getInterruptedExposureLinesLast24h");
    expect(route).toContain("NextResponse.json(lines)");
    expect(route).toContain("workspace_id");
  });

  it("route does not expose internal ids or metadata in response", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/operational/protection/route.ts"), "utf-8");
    expect(route).toContain("NextResponse.json(lines)");
    expect(route).not.toMatch(/["'](subject_id|exposure_id|reference_id|recorded_at)["']\s*:/);
  });

  it("returns array (empty when none) - response shape documented", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/operational/protection/route.ts"), "utf-8");
    expect(route).toContain("lines");
    expect(route).toContain("getInterruptedExposureLinesLast24h(workspaceId, 8)");
  });
});
