import { test, expect } from "@playwright/test";

/**
 * Marketing shell: navbar reflects auth affordance (Sign in vs Open app) without errors.
 */
test.describe("Marketing navbar", () => {
  test("homepage shows Sign in or Open app link in header", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const signIn = page.getByRole("link", { name: /^Sign in$/i });
    const openApp = page.getByRole("link", { name: /Open app/i });
    await expect(signIn.or(openApp).first()).toBeVisible({ timeout: 15_000 });
  });

  test("pricing page shows Sign in or Open app link", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    const signIn = page.getByRole("link", { name: /^Sign in$/i });
    const openApp = page.getByRole("link", { name: /Open app/i });
    await expect(signIn.or(openApp).first()).toBeVisible({ timeout: 15_000 });
  });
});
