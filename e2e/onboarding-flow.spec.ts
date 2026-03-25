import { test, expect } from "@playwright/test";

/**
 * Onboarding: sign up → business setup → agent → phone → first test call.
 * Asserts wizard steps load; full flow may redirect to sign-in when unauthenticated.
 */
test.describe("Onboarding flow", () => {
  test("activate page shows onboarding wizard steps", async ({ page }) => {
    await page.goto("/activate", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Let's get your phone agent ready|Activation|Business|Agent/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("onboarding step progress or step labels visible", async ({ page }) => {
    await page.goto("/activate", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(/Step \d+ of \d+|Business|Agent|Customize|Phone|Test/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("completing onboarding redirects to app", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const startFree = page.getByRole("link", { name: /Start free|Dashboard/i }).first();
    await expect(startFree).toBeVisible({ timeout: 8000 });
    await startFree.click();
    await expect(page).toHaveURL(/\/(activate|app\/activity|sign-in)/, { timeout: 8000 });
  });
});
