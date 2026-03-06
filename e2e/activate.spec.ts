import { test, expect } from "@playwright/test";

test.describe("Activate flow", () => {
  test("activate page loads and shows activation wizard", async ({ page }) => {
    await page.goto("/activate", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Let's get your phone agent ready|Activation/i })).toBeVisible({ timeout: 10000 });
  });

  test("activate page does not show Select account", async ({ page }) => {
    await page.goto("/activate");
    await expect(page.getByText("Select an account")).not.toBeVisible();
    await expect(page.getByText("Select where we maintain")).not.toBeVisible();
  });

  test("activate page shows step progress", async ({ page }) => {
    await page.goto("/activate");
    await expect(page.getByText(/Step \d+ of \d+|Business|Agent|Customize/i)).toBeVisible({ timeout: 8000 });
  });
});
