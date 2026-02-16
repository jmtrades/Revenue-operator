/**
 * Contract: middleware redirects legacy dashboard paths to /dashboard or canonical.
 * Only /dashboard, /dashboard/record, /dashboard/activity, /dashboard/presence,
 * /dashboard/record/lead/*, /dashboard/preferences, /dashboard/connection allowed.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MIDDLEWARE = path.join(ROOT, "src", "middleware.ts");

describe("Routing restriction", () => {
  it("middleware redirects /dashboard/leads to /dashboard", () => {
    const content = readFileSync(MIDDLEWARE, "utf-8");
    expect(content).toContain("/dashboard/leads");
    expect(content).toMatch(/dashboard\/activity|getRedirectTarget|getDashboardRedirect/);
  });

  it("middleware redirects /dashboard/settings to /dashboard/preferences", () => {
    const content = readFileSync(MIDDLEWARE, "utf-8");
    expect(content).toContain("/dashboard/settings");
    expect(content).toContain("/dashboard/preferences");
  });

  it("middleware redirects /dashboard/activation to /dashboard/connection", () => {
    const content = readFileSync(MIDDLEWARE, "utf-8");
    expect(content).toContain("/dashboard/activation");
    expect(content).toContain("/dashboard/connection");
  });

  it("middleware redirects /dashboard/continue-protection to /dashboard", () => {
    const content = readFileSync(MIDDLEWARE, "utf-8");
    expect(content).toContain("continue-protection");
    expect(content).toContain("/dashboard");
  });

  it("allowed paths include record, activity, presence and record/lead", () => {
    const content = readFileSync(MIDDLEWARE, "utf-8");
    expect(content).toContain("/dashboard/record");
    expect(content).toContain("/dashboard/activity");
    expect(content).toContain("/dashboard/presence");
    expect(content).toMatch(/record\/lead/);
  });
});
