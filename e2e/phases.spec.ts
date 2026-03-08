import { test, expect } from "@playwright/test";

test.describe("v7 phases — key routes load", () => {
  test.skip("dashboard activity route loads", async ({ page }) => {
    await page.goto("/dashboard/activity?workspace_id=00000000-0000-0000-0000-000000000001");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /activity/i })).toBeVisible();
  });

  test.skip("dashboard campaigns route loads", async ({ page }) => {
    await page.goto("/dashboard/campaigns?workspace_id=00000000-0000-0000-0000-000000000001", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /campaigns/i })).toBeVisible({ timeout: 15000 });
  });

  test.skip("dashboard contacts route loads", async ({ page }) => {
    await page.goto("/dashboard/contacts?workspace_id=00000000-0000-0000-0000-000000000001");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();
  });

  test.skip("dashboard analytics route loads", async ({ page }) => {
    await page.goto("/dashboard/analytics?workspace_id=00000000-0000-0000-0000-000000000001");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible();
  });
});
