import { test, expect } from "@playwright/test";

/**
 * App routes and hydration: ensure /app/* is reachable and that key pages
 * do not emit React hydration errors (which would break interactivity).
 * Run after deploy to catch regressions.
 */
test.describe("App routes and hydration", () => {
  test("unauthenticated /app/onboarding redirects to sign-in", async ({ page }) => {
    await page.goto("/app/onboarding", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible({ timeout: 5000 });
  });

  test("unauthenticated /app/activity redirects to sign-in", async ({ page }) => {
    await page.goto("/app/activity", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10000 });
  });

  test("sign-in page loads without hydration errors in console", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" && (text.includes("418") || text.includes("Hydration"))) {
        consoleErrors.push(text);
      }
    });
    await page.goto("/sign-in", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible({ timeout: 8000 });
    expect(
      consoleErrors,
      `Expected no React hydration errors on sign-in page. Got: ${consoleErrors.join("; ")}`
    ).toHaveLength(0);
  });

  test("activate page loads without hydration errors in console", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" && (text.includes("418") || text.includes("Hydration"))) {
        consoleErrors.push(text);
      }
    });
    await page.goto("/activate", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: /Let's get your phone agent ready|Activate|Activation/i })
    ).toBeVisible({ timeout: 10000 });
    expect(
      consoleErrors,
      `Expected no React hydration errors on activate page. Got: ${consoleErrors.join("; ")}`
    ).toHaveLength(0);
  });
});
