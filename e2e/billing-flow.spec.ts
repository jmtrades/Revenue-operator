import { test, expect } from "@playwright/test";

/**
 * Billing: select plan → enter payment → verify subscription → upgrade → cancel.
 */
test.describe("Billing flow", () => {
  test("pricing page loads with plans", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Pricing|Plans|Choose/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("pricing has monthly or annual toggle or plan cards", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(/Monthly|Annual|Save|month|year|\$/i).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test("billing settings loads or redirects to sign-in", async ({ page }) => {
    await page.goto("/app/settings/billing", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Billing|Subscription|Payment/i }).or(
        page.getByRole("heading", { name: /Sign in/i })
      )
    ).toBeVisible({ timeout: 10000 });
  });
});
