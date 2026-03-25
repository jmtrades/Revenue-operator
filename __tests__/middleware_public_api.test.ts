/**
 * A3) Proxy (request boundary): billing webhook never redirected; /api/system/health reachable without session.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const PROXY_FILE = path.join(ROOT, "src/proxy.ts");

describe("Proxy public API", () => {
  it("billing webhook is in isPublicApi allowlist", () => {
    const proxy = readFileSync(PROXY_FILE, "utf-8");
    expect(proxy).toContain("/api/billing/webhook");
    expect(proxy).toMatch(/isPublicApi|billing/);
  });

  it("system health is in public API allowlist", () => {
    const proxy = readFileSync(PROXY_FILE, "utf-8");
    expect(proxy).toContain("/api/system/health");
    expect(proxy).toContain("core-status");
  });

  it("API POST is never redirected; protected API returns 401 when no session", () => {
    const proxy = readFileSync(PROXY_FILE, "utf-8");
    expect(proxy).toMatch(/method\s*!==\s*["']GET["'].*401|NextResponse\.json.*Unauthorized/);
  });
});
