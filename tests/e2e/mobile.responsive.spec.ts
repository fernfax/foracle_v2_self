import { test, expect, type Page } from "@playwright/test";

/**
 * Mobile responsive checks — run under the iPhone 13 + Pixel 5 projects
 * (see playwright.config.ts). PUBLIC pages only (no auth).
 *
 * Authed-surface responsive coverage (Budget daily logging, Overview, User
 * Homepage) is GAP G9 in PWA_MOBILE_AUDIT_REPORT.md — blocked on e2e auth
 * (storageState) wiring.
 */

// The landing's LifeStages timeline lays out asynchronously (a 1790px-wide
// horizontal track inside an overflow-hidden section, plus an entrance
// animation), so the page can briefly report overflow before that section's
// clip settles. Poll the SETTLED layout rather than a single mid-load frame —
// this still fails fast on a genuine, persistent overflow.
async function expectNoSettledHorizontalOverflow(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const d = document.documentElement;
          return d.scrollWidth - d.clientWidth;
        }),
      { timeout: 4000 }
    )
    .toBeLessThanOrEqual(1);
}

test("landing page: no horizontal overflow at mobile width", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expectNoSettledHorizontalOverflow(page);
});

test("sign-in page: no horizontal overflow at mobile width", async ({ page }) => {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await expectNoSettledHorizontalOverflow(page);
});

test("landing primary CTA is a comfortable tap target (>= 44px tall)", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const cta = page.getByRole("link", { name: /sign in|get started|sign up/i }).first();
  await expect(cta).toBeVisible();
  const box = await cta.boundingBox();
  expect(box, "CTA has no bounding box").not.toBeNull();
  // Apple HIG / WCAG 2.5.5 Target Size — 44x44 CSS px.
  expect(box!.height, `CTA height ${Math.round(box!.height)}px < 44`).toBeGreaterThanOrEqual(44);
});
