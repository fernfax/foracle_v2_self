import { test, expect } from "@playwright/test";

test("auth bridge works — /overview does not redirect to sign-in", async ({ page }) => {
  await page.goto("/overview");
  await page.waitForLoadState("networkidle");
  expect(page.url()).not.toContain("/sign-in");
  // Some authed chrome should be present.
  await expect(page.locator('[data-tour="help-button"]').first()).toBeVisible({ timeout: 15000 });
});
