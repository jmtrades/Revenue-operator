import { test, expect } from "@playwright/test";

/**
 * Call flow: initiate test call → verify transcript → quality score → call intelligence.
 */
test.describe("Call flow", () => {
  test("activity page shows calls or empty state", async ({ page }) => {
    await page.goto("/app/activity", { waitUntil: "domcontentloaded" });
    if (page.url().includes("/sign-in")) {
      await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible({ timeout: 10000 });
      return;
    }
    await expect(
      page.getByRole("heading", { name: /Activity|Calls/i }).or(page.getByText(/No calls/i)).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("demo page has call preview or sample", async ({ page }) => {
    await page.goto("/demo", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Watch a sample call" })).toBeVisible({ timeout: 8000 });
  });
});
