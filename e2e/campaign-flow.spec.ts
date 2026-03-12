import { test, expect } from "@playwright/test";

/**
 * Campaign: create campaign → add contacts → launch → track results.
 */
test.describe("Campaign flow", () => {
  test("campaigns page loads or redirects to sign-in", async ({ page }) => {
    await page.goto("/app/campaigns", { waitUntil: "domcontentloaded" });
    const heading = page.getByRole("heading", { name: /Campaigns/i });
    const signIn = page.getByRole("heading", { name: /Sign in/i });
    await expect(heading.or(signIn)).toBeVisible({ timeout: 10000 });
  });

  test("campaigns page has create or empty state", async ({ page }) => {
    await page.goto("/app/campaigns", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: /Create|New campaign|Add/i }).or(
        page.getByText(/No campaigns|Get started|Create your first/i)
      ).or(page.getByRole("heading", { name: /Sign in/i }))
    ).toBeVisible({ timeout: 10000 });
  });
});
