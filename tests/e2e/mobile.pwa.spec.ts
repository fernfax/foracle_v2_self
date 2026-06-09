import { test, expect } from "@playwright/test";

/**
 * PWA foundation + mobile-ergonomics coverage. Scaffolded as test.fixme()
 * because the app currently has NO PWA foundation. Each test encodes the
 * DESIRED state; delete `.fixme` on a test as its gap (G1–G10) is fixed.
 * See PWA_MOBILE_AUDIT_REPORT.md for the matching fix per gap.
 *
 * Runs under the iPhone 13 + Pixel 5 projects (mobile.*.spec.ts match).
 */

test.fixme("G1 — a web app manifest is linked", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
});

test.fixme("G2 — viewport opts into viewport-fit=cover (iOS safe areas resolve)", async ({ page }) => {
  await page.goto("/");
  const content = (await page.locator('meta[name="viewport"]').getAttribute("content")) ?? "";
  expect(content).toContain("viewport-fit=cover");
});

test.fixme("G3 — theme-color meta is set", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
});

test.fixme("G4 — iOS standalone enabled (apple-mobile-web-app-capable)", async ({ page }) => {
  await page.goto("/");
  const cap = page
    .locator('meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]')
    .first();
  await expect(cap).toHaveAttribute("content", /yes/);
});

test.fixme("G5 — 192 and 512 PWA icons are reachable", async ({ request }) => {
  for (const size of ["192", "512"]) {
    const res = await request.get(`/icons/icon-${size}.png`);
    expect(res.ok(), `icon-${size}.png missing`).toBeTruthy();
  }
});

test.fixme("G6 — a service worker registers and controls the page", async ({ page }) => {
  await page.goto("/");
  const controlled = await page.evaluate(
    () => "serviceWorker" in navigator && !!navigator.serviceWorker.controller,
  );
  expect(controlled).toBeTruthy();
});

test.fixme("G7 — bottom-nav tap targets are >= 44px (needs e2e auth wiring)", async ({ page }) => {
  await page.goto("/budget");
  const link = page.locator("nav.bottom-nav a").first();
  const box = await link.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
});

test.fixme("G8 — offline cold-load serves a cached app shell (needs SW)", async ({ page, context }) => {
  await page.goto("/");
  await context.setOffline(true);
  const res = await page.reload();
  expect(res?.ok(), "no offline fallback — web app is online-only").toBeTruthy();
  await context.setOffline(false);
});

test.fixme("G9 — Budget logs an expense offline and syncs on reconnect (needs SW + queue)", async ({ page, context }) => {
  // The web app has no offline write path today; offline mutations fail-loud.
  // This documents the desired parity with the native offline queue.
  await page.goto("/budget");
  await context.setOffline(true);
  // ...attempt to add a daily expense, assert it is queued and visible...
  await context.setOffline(false);
  // ...assert it syncs to the server (idempotent — see lib/api-schemas/daily-expenses.ts:46).
  expect(true).toBeTruthy();
});

test.fixme("G10 — inputs use >=16px font so iOS Safari does not zoom on focus", async ({ page }) => {
  await page.goto("/sign-in");
  const input = page.locator("input").first();
  const fontPx = await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontPx, `input font-size ${fontPx}px < 16 triggers iOS zoom`).toBeGreaterThanOrEqual(16);
});
