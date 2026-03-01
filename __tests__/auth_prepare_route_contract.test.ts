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

  it("activate page does not show indefinite Preparing; uses Verifying session or institutional error", () => {
    const content = readFileSync(ACTIVATE_PAGE, "utf-8");
    expect(content).not.toMatch(/Preparing\.\.\.?/);
    expect(content).toContain("Verifying session.");
    expect(content).toContain("Unable to proceed.");
    expect(content).toContain("Authorization could not be confirmed.");
  });

  it("activate page has bounded timeout (8 seconds) for session check", () => {
    const content = readFileSync(ACTIVATE_PAGE, "utf-8");
    expect(content).toMatch(/8_000|8000/);
    expect(content).toContain("setTransitionError");
  });

  it("sign-in page uses Verifying session and Back to home", () => {
    const content = readFileSync(SIGNIN_PAGE, "utf-8");
    expect(content).toContain("Verifying session.");
    expect(content).toContain("Back to home");
    expect(content).not.toMatch(/Preparing\.\.\.?/);
  });
});
