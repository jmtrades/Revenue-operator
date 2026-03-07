import { test, expect } from "@playwright/test";

/**
 * Critical path: Homepage → Start free → /activate → (wizard visible).
 * Ensures the main CTA and flow are wired for real users.
 */
test.describe("Critical path", () => {
  test("homepage loads and Start free goes to /activate", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const startFree = page.getByRole("link", { name: /Start free|Dashboard/ }).first();
    await expect(startFree).toBeVisible({ timeout: 10000 });
    await startFree.click();
    await expect(page).toHaveURL(/\/(activate|app\/activity)/, { timeout: 8000 });
  });

  test("activate page loads with wizard", async ({ page }) => {
    await page.goto("/activate", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Let's get your phone agent ready|Activate|Activation/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible({ timeout: 8000 });
  });

  test("demo page has demo section", async ({ page }) => {
    await page.goto("/demo", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Watch a sample call/i })).toBeVisible({
      timeout: 8000,
    });
  });
});
