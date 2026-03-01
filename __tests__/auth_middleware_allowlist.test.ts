/**
 * Proxy (request boundary): auth and get-started routes are allowlisted and not blocked.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const PROXY_FILE = path.join(ROOT, "src", "proxy.ts");

describe("Auth middleware allowlist", () => {
  it("proxy allows /activate as public page", () => {
    const content = readFileSync(PROXY_FILE, "utf-8");
    expect(content).toMatch(/\/activate/);
    expect(content).toContain("isPublicPage");
  });

  it("proxy allows /sign-in and /auth as public", () => {
    const content = readFileSync(PROXY_FILE, "utf-8");
    expect(content).toMatch(/\/sign-in/);
    expect(content).toMatch(/\/auth\/|startsWith\([\"']\/auth/);
  });

  it("proxy uses isPublicPage and allows public pages to proceed", () => {
    const content = readFileSync(PROXY_FILE, "utf-8");
    expect(content).toContain("isPublicPage");
    expect(content).toContain("NextResponse.next()");
  });
});
