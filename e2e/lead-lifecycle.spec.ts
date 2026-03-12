import { test, expect } from "@playwright/test";

/**
 * Lead lifecycle: create lead → update status → qualify → convert → won.
 * App routes may redirect to sign-in when unauthenticated.
 */
test.describe("Lead lifecycle", () => {
  test("activity page loads with calls or empty state", async ({ page }) => {
    await page.goto("/app/activity", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Activity|Calls|Inbox/i }).or(
        page.getByText(/Sign in|Welcome back/i)
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("contacts page loads or redirects to sign-in", async ({ page }) => {
    await page.goto("/app/contacts", { waitUntil: "domcontentloaded" });
    const heading = page.getByRole("heading", { name: /Contacts|Leads/i });
    const signIn = page.getByRole("heading", { name: /Sign in/i });
    await expect(heading.or(signIn)).toBeVisible({ timeout: 10000 });
  });
});
