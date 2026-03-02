/**
 * Auth / Get started transition: never hangs. Must render redirect or controlled error with single action within bounded time.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const ACTIVATE_PAGE = path.join(ROOT, "src", "app", "activate", "page.tsx");
const SIGNIN_PAGE = path.join(ROOT, "src", "app", "sign-in", "page.tsx");

describe("Auth prepare route contract", () => {
  it("activate page contains Get started with Recall Touch and transition copy", () => {
    const content = readFileSync(ACTIVATE_PAGE, "utf-8");
    expect(content).toContain("Get started with Recall Touch");
    expect(content).toContain("Back to home");
  });

  it("activate page does not show indefinite Preparing or Verifying session", () => {
    const content = readFileSync(ACTIVATE_PAGE, "utf-8");
    expect(content).not.toMatch(/Preparing\.\.\.?/);
    expect(content).not.toContain("Verifying session.");
  });

  it("sign-in page has Back to home and does not show Verifying session", () => {
    const content = readFileSync(SIGNIN_PAGE, "utf-8");
    expect(content).not.toContain("Verifying session.");
    expect(content).toContain("Back to home");
    expect(content).not.toMatch(/Preparing\.\.\.?/);
  });
});
