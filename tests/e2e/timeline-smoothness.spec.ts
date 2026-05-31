import { test, expect } from "@playwright/test";

/**
 * Visual capture (video) of the Timeline Studio smoothness:
 *  - lateral scroll → bar labels stay put when a bar fills the view and glide
 *    when an edge enters; the river's vertical scale eases (no snap).
 *  - SCALE slider → the river morphs/recompresses smoothly.
 *
 * Auth via tests/e2e/.auth/state.json. Records video (see test.use below).
 */

test.use({
  storageState: "tests/e2e/.auth/state.json",
  viewport: { width: 1440, height: 900 },
  video: { mode: "on", size: { width: 1440, height: 900 } },
});

const TARGET = "/user?tab=incomes&view=beta";

test.describe("Timeline smoothness", () => {
  test.setTimeout(120000);

  test("scroll + scale are smooth", async ({ page }) => {
    await page.goto(TARGET, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    expect(page.url()).toContain("view=beta");

    await page.getByRole("button", { name: "Timeline Studio" }).click();
    await page.waitForTimeout(1200);

    // Park the cursor over the timeline card so wheel events hit the
    // horizontal-scroll handler.
    const box = await page
      .locator(".overscroll-x-contain")
      .first()
      .boundingBox();
    const cx = box ? box.x + box.width / 2 : 720;
    const cy = box ? box.y + box.height / 2 : 320;
    await page.mouse.move(cx, cy);

    // 1) Scroll forward in small increments (smooth), then back.
    for (let i = 0; i < 14; i++) {
      await page.mouse.wheel(70, 0);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(600);
    for (let i = 0; i < 14; i++) {
      await page.mouse.wheel(-70, 0);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(700);

    // 2) Drive the SCALE slider up (2y → ~8y) then back, to show the river
    //    morphing/recompressing smoothly. Radix slider responds to arrow keys.
    const slider = page.locator('span[role="slider"]').first();
    await slider.click();
    await page.waitForTimeout(300);
    for (let i = 0; i < 6; i++) {
      await slider.press("ArrowRight");
      await page.waitForTimeout(550);
    }
    await page.waitForTimeout(800);
    for (let i = 0; i < 6; i++) {
      await slider.press("ArrowLeft");
      await page.waitForTimeout(550);
    }
    await page.waitForTimeout(900);
  });
});
