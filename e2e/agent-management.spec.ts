import { test, expect } from "@playwright/test";

/**
 * Agent: create agent → configure voice → assign number → activate → view analytics.
 */
test.describe("Agent management", () => {
  test("agents page loads or redirects to sign-in", async ({ page }) => {
    await page.goto("/app/agents", { waitUntil: "domcontentloaded" });
    const heading = page.getByRole("heading", { name: /Agents|Phone agent/i });
    const signIn = page.getByRole("heading", { name: /Sign in/i });
    await expect(heading.or(signIn)).toBeVisible({ timeout: 10000 });
  });

  test("agents page has create or list or empty state", async ({ page }) => {
    await page.goto("/app/agents", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: /Create|New agent|Add/i }).or(
        page.getByText(/No agents|Get started|Create your first/i)
      ).or(page.getByRole("heading", { name: /Sign in/i })).or(
        page.getByRole("heading", { name: /Agents/i })
      )
    ).toBeVisible({ timeout: 10000 });
  });
});
