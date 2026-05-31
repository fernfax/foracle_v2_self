import { test, expect } from "@playwright/test";

/**
 * Regression: interacting with an open income-bar popover (e.g. clicking the
 * carousel dots to reach the Bonuses page) must NOT punch a draw through to
 * the lane and spawn a phantom "New income" creator.
 */

test.use({
  storageState: "tests/e2e/.auth/state.json",
  viewport: { width: 1440, height: 900 },
});

const TARGET = "/user?tab=incomes&view=beta";
const INCOME = "Alex's Salary";

test.describe("Bar popover does not trigger phantom draws", () => {
  test.setTimeout(90000);

  test("clicking dots / lane while a popover is open never creates an income", async ({
    page,
  }) => {
    await page.goto(TARGET, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    expect(page.url()).toContain("view=beta");

    await page.getByRole("button", { name: "Timeline Studio" }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /enter edit mode/i }).click();
    await page.waitForTimeout(500);

    // Open the income's popover.
    await page
      .getByRole("button", { name: new RegExp(`Adjust ${INCOME} amount`) })
      .click();
    await page.waitForTimeout(600);
    await expect(page.locator("[data-bar-popup]")).toBeVisible();

    // Navigate the carousel dots to the Bonuses page (what the user was doing)
    // — this must not punch through to a draw, and the bonus editor is shown.
    await page.getByRole("button", { name: "Go to page 3" }).click();
    await page.waitForTimeout(500);
    await expect(
      page.getByRole("checkbox", { name: "Account for Bonus" })
    ).toBeVisible();
    await expect(page.getByText(/New income/i)).toHaveCount(0);

    // Now the harsher case: a pointer down+drag+up directly on the lane
    // background while the popover is open (the previous punch-through path).
    const lane = page.locator("[data-row-income-id]").first();
    const box = await lane.boundingBox();
    if (box) {
      const x = box.x + box.width * 0.2;
      const y = box.y + box.height * 0.7;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 90, y, { steps: 4 });
      await page.mouse.up();
    }
    await page.waitForTimeout(600);

    // Still no phantom income creator (the outside-click just closes the
    // popover, which is fine — it must never start a draw).
    await expect(page.getByText(/New income/i)).toHaveCount(0);
  });
});
