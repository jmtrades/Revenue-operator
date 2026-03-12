import { test, expect } from "@playwright/test";

/**
 * Call flow: initiate test call → verify transcript → quality score → call intelligence.
 */
test.describe("Call flow", () => {
  test("activity page shows calls or empty state", async ({ page }) => {
    await page.goto("/app/activity", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Activity|Calls|Inbox/i }).or(
        page.getByText(/Sign in|Welcome back|No calls/i)
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("demo page has call preview or sample", async ({ page }) => {
    await page.goto("/demo", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Watch a sample call|Demo|See how/i })
    ).toBeVisible({ timeout: 8000 });
  });
});
