import { test, expect } from "@playwright/test";

test.describe("Foracle smoke", () => {
  test("landing page renders without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await expect(page).toHaveTitle(/Foracle/i);
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();

    expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  });

  test("protected route redirects unauthenticated user to sign-in", async ({ page }) => {
    await page.goto("/overview");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
