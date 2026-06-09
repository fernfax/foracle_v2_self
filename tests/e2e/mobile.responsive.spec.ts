import { test, expect } from "@playwright/test";

/**
 * Mobile responsive checks — run under the iPhone 13 + Pixel 5 projects
 * (see playwright.config.ts). PUBLIC pages only (no auth).
 *
 * Currently `test.fixme` because the live run surfaced real gaps on the public
 * pages (see PWA_MOBILE_AUDIT_REPORT.md, gaps G11–G12). Un-`fixme` each as it is
 * fixed:
 *   G11 — landing sign-in CTA is 32px tall (< 44px WCAG 2.5.5 / Apple HIG).
 *   G12 — landing + sign-in report horizontal overflow under iPhone 13 (WebKit)
 *         emulation (Pixel 5 / Chromium passed) — verify on a real device.
 *
 * Authed-surface responsive coverage (Budget daily logging, Overview, User
 * Homepage) is GAP G9 — blocked on e2e auth (storageState) wiring.
 */

async function overflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const d = document.documentElement;
    return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
  });
}

test.fixme("G12 — landing page: no horizontal overflow at mobile width", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const { scrollWidth, clientWidth } = await overflow(page);
  expect(
    scrollWidth,
    `horizontal overflow: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`,
  ).toBeLessThanOrEqual(clientWidth + 1);
});

test.fixme("G12 — sign-in page: no horizontal overflow at mobile width", async ({ page }) => {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800); // Clerk widget mounts
  const { scrollWidth, clientWidth } = await overflow(page);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
});

test.fixme("G11 — landing primary CTA is a comfortable tap target (>= 44px tall)", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const cta = page.getByRole("link", { name: /sign in|get started|sign up/i }).first();
  await expect(cta).toBeVisible();
  const box = await cta.boundingBox();
  expect(box, "CTA has no bounding box").not.toBeNull();
  // Apple HIG / WCAG 2.5.5 Target Size — 44x44 CSS px. Live run measured 32px.
  expect(box!.height, `CTA height ${Math.round(box!.height)}px < 44`).toBeGreaterThanOrEqual(44);
});
