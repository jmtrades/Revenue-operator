import { test, expect } from "@playwright/test";

test.describe("Dashboard workspace selection", () => {
  test("dashboard with workspace_id param does not show Select an account", async ({ page }) => {
    await page.goto("/dashboard?workspace_id=00000000-0000-0000-0000-000000000001", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Select an account")).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Select where we maintain conversations")).not.toBeVisible();
  });

  test("dashboard never shows Select an account dead state", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Select an account")).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Select where we maintain conversations")).not.toBeVisible();
  });
});
