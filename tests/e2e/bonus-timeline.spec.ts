import { test, expect } from "@playwright/test";

/**
 * E2E: add a bonus to a recurring income in the Timeline Studio (beta) and
 * verify the bonus bar renders on the timeline.
 *
 * Auth: reuses a real Clerk session captured into tests/e2e/.auth/state.json.
 * Records a video of the full flow (see test.use video config below).
 *
 * Run: npx playwright test bonus-timeline --headed   (or default headless)
 */

test.use({
  storageState: "tests/e2e/.auth/state.json",
  viewport: { width: 1440, height: 900 },
  video: { mode: "on", size: { width: 1440, height: 900 } },
  // Clerk polls its session endpoint forever, so never wait for networkidle.
  actionTimeout: 15000,
});

const TARGET = "/user?tab=incomes&view=beta";
const INCOME = "Alex's Salary";

// Slow each step a touch so the recorded video is watchable.
const beat = async (page: import("@playwright/test").Page, ms = 700) =>
  page.waitForTimeout(ms);

test.describe("Bonus on the income timeline", () => {
  test.setTimeout(120000);

  test("add a bonus to a recurring income and see the bonus bar", async ({
    page,
  }) => {
    // 1) Open the beta timeline view
    await page.goto(TARGET, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    expect(page.url()).toContain("view=beta");

    // 2) Switch to the Timeline Studio sub-view
    await page.getByRole("button", { name: "Timeline Studio" }).click();
    await beat(page);

    // 3) Enter edit mode (popovers + bonus editor only open while editing)
    await page
      .getByRole("button", { name: /enter edit mode/i })
      .click();
    await beat(page);

    // 4) Click the recurring income's bar to open its editor popover
    await page
      .getByRole("button", { name: new RegExp(`Adjust ${INCOME} amount`) })
      .click();
    await beat(page);

    // 5) Reveal the bonus editor — the checkbox lives on the "Bonuses"
    //    carousel page; scroll it into view inside the popover.
    const accountForBonus = page.getByRole("checkbox", {
      name: "Account for Bonus",
    });
    await accountForBonus.scrollIntoViewIfNeeded();
    await beat(page);
    if (!(await accountForBonus.isChecked())) {
      await accountForBonus.click();
      await beat(page);
    }

    // 6) Reset to a clean slate so the test is deterministic on re-runs:
    //    remove any existing bonus rows, then add a fresh one.
    let removeBtns = page.getByRole("button", { name: "Remove bonus" });
    while ((await removeBtns.count()) > 0) {
      await removeBtns.first().click();
      await page.waitForTimeout(150);
    }

    await page.getByRole("button", { name: /add bonus/i }).click();
    await beat(page);

    // 7) Configure: a 2-month bonus paid in December (a "13th/14th-month" style)
    await page
      .getByRole("combobox", { name: "Bonus month" })
      .selectOption({ label: "Dec" });
    const monthsInput = page.getByRole("spinbutton", {
      name: "Bonus number of months",
    });
    await monthsInput.fill("2");
    await beat(page);

    // 8) Confirm — persists accountForBonus + bonusGroups via updateIncomeBeta
    await page.getByRole("button", { name: "Confirm Changes" }).click();
    await beat(page, 1200);

    // 9) The bonus bar should now appear on the timeline. $9,000/mo × 2 = $18,000.
    const bonusBar = page
      .getByRole("button", { name: new RegExp(`${INCOME} bonus, \\$18,000`) })
      .first();
    await expect(bonusBar).toBeVisible({ timeout: 10000 });
    await bonusBar.scrollIntoViewIfNeeded();
    await beat(page, 1000);

    // 10) Persistence check — reload and confirm the bonus bar survives.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Timeline Studio" }).click();
    await beat(page);
    await expect(
      page
        .getByRole("button", {
          name: new RegExp(`${INCOME} bonus, \\$18,000`),
        })
        .first()
    ).toBeVisible({ timeout: 10000 });
    await beat(page, 1200);
  });
});
