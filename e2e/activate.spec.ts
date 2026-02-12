import { test, expect } from "@playwright/test";

test.describe("Activate flow", () => {
  test("activate page loads and shows start protection", async ({ page }) => {
    await page.goto("/activate", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Start protection/i })).toBeVisible({ timeout: 10000 });
  });

  test("activate page does not show Select account", async ({ page }) => {
    await page.goto("/activate");
    await expect(page.getByText("Select an account")).not.toBeVisible();
    await expect(page.getByText("Select where we maintain")).not.toBeVisible();
  });

  test("activate page shows card-required copy", async ({ page }) => {
    await page.goto("/activate");
    await expect(page.getByText(/Card required|day 14|Cancel anytime/i)).toBeVisible();
  });
});
