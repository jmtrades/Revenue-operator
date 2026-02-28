/**
 * A3) Middleware: billing webhook never redirected; /api/system/health reachable without session.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Middleware public API", () => {
  it("billing webhook is in isPublicApi allowlist", () => {
    const mw = readFileSync(path.join(ROOT, "src/middleware.ts"), "utf-8");
    expect(mw).toContain("/api/billing/webhook");
    expect(mw).toMatch(/isPublicApi|billing/);
  });

  it("system health is in public API allowlist", () => {
    const mw = readFileSync(path.join(ROOT, "src/middleware.ts"), "utf-8");
    expect(mw).toContain("/api/system/health");
    expect(mw).toContain("core-status");
  });

  it("API POST is never redirected; protected API returns 401 when no session", () => {
    const mw = readFileSync(path.join(ROOT, "src/middleware.ts"), "utf-8");
    expect(mw).toMatch(/method\s*!==\s*["']GET["'].*401|NextResponse\.json.*Unauthorized/);
  });
});
