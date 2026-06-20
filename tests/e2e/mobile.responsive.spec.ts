import { expect, test, type Page } from "@playwright/test"

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
          const d = document.documentElement
          return d.scrollWidth - d.clientWidth
        }),
      { timeout: 4000 }
    )
    .toBeLessThanOrEqual(1)
}

test("landing page: no horizontal overflow at mobile width", async ({
  page
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await expectNoSettledHorizontalOverflow(page)
})

test("sign-in page: no horizontal overflow at mobile width", async ({
  page
}) => {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" })
  await expectNoSettledHorizontalOverflow(page)
})

// Apple HIG / WCAG 2.5.5 Target Size — interactive controls should be at least
// 44x44 CSS px so they're comfortable under a thumb.
const MIN_TAP_TARGET = 44

test("landing primary CTA is a comfortable tap target (>= 44px tall)", async ({
  page
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" })
  const cta = page
    .getByRole("link", { name: /sign in|get started|sign up/i })
    .first()
  await expect(cta).toBeVisible()
  const box = await cta.boundingBox()
  expect(box, "CTA has no bounding box").not.toBeNull()
  expect(
    box!.height,
    `CTA height ${Math.round(box!.height)}px < ${MIN_TAP_TARGET}`
  ).toBeGreaterThanOrEqual(MIN_TAP_TARGET)
})

test("landing mobile nav controls are comfortable tap targets (>= 44px)", async ({
  page
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" })

  // The hamburger that opens the mobile nav sheet.
  const menu = page.getByRole("button", { name: /open menu/i })
  await expect(menu).toBeVisible()
  const menuBox = await menu.boundingBox()
  expect(menuBox, "Menu button has no bounding box").not.toBeNull()
  expect(
    Math.min(menuBox!.width, menuBox!.height),
    `Menu button ${Math.round(menuBox!.width)}x${Math.round(menuBox!.height)}px < ${MIN_TAP_TARGET}`
  ).toBeGreaterThanOrEqual(MIN_TAP_TARGET)

  // The auth/dashboard actions inside the slide-out sheet.
  await menu.click()
  const sheetCta = page
    .getByRole("link", { name: /sign in|go to dashboard/i })
    .last()
  await expect(sheetCta).toBeVisible()
  const sheetBox = await sheetCta.boundingBox()
  expect(sheetBox, "Sheet CTA has no bounding box").not.toBeNull()
  expect(
    sheetBox!.height,
    `Sheet CTA height ${Math.round(sheetBox!.height)}px < ${MIN_TAP_TARGET}`
  ).toBeGreaterThanOrEqual(MIN_TAP_TARGET)
})
