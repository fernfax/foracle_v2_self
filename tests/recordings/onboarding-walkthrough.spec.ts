import { expect, test, type Page } from "@playwright/test"

// Drives the REAL onboarding wizard end to end, then clicks through the /user
// tabs to show the entered data landed correctly. Parameterized by SCENARIO so
// the same spec records two different user types (run with a DB reset between).
//
//   SCENARIO=1 npx playwright test -c playwright.record.config.ts onboarding-walkthrough
//
// Requires onboarding_completed=false for the test account (run
// db/manual-migrations/qa/_reset_onboarding.sql first).

type Scenario = {
  name: string
  dob: { year: number; monthShort: string; day: number }
  incomeName: string
  incomeAmount: string
  bank: string
  holdingAmount: string
  expensePct: string
}

const SCENARIOS: Record<string, Scenario> = {
  "1": {
    name: "Aaron Tan",
    dob: { year: 1999, monthShort: "Jun", day: 15 },
    incomeName: "Salary",
    incomeAmount: "4000",
    bank: "DBS",
    holdingAmount: "8000",
    expensePct: "50"
  },
  "2": {
    name: "Marcus Lim",
    dob: { year: 1985, monthShort: "Mar", day: 20 },
    incomeName: "Salary",
    incomeAmount: "14000",
    bank: "OCBC",
    holdingAmount: "120000",
    expensePct: "40"
  }
}

const KEY = process.env.SCENARIO ?? "1"
const S = SCENARIOS[KEY]

// Pick a date of birth using the calendar's own grid navigation (header toggles
// days -> months -> years; the native dropdowns are display:none so we can't
// use selectOption). Future dates are disabled, which is irrelevant for DOBs.
async function pickDob(
  page: Page,
  year: number,
  monthShort: string,
  day: number
) {
  await page.getByRole("button", { name: /pick a date/i }).click()
  const cal = page.locator("[data-radix-popper-content-wrapper]")
  await expect(cal).toBeVisible()

  // days view header "Month YYYY" -> months view
  await cal
    .locator("button")
    .filter({ hasText: /^[A-Za-z]{3,9} \d{4}$/ })
    .first()
    .click()
  // months view header "YYYY" -> years view
  await cal
    .locator("button")
    .filter({ hasText: /^\d{4}$/ })
    .first()
    .click()

  // step back 12-year pages until the target year is shown, then click it
  const yearBtn = cal.getByRole("button", { name: String(year), exact: true })
  for (let i = 0; i < 12; i++) {
    if (await yearBtn.count()) break
    await cal.locator("button:has(svg.lucide-chevron-left)").first().click()
  }
  await yearBtn.first().click()
  await cal.getByRole("button", { name: monthShort, exact: true }).click()
  // Day cells carry an aria-label ("June 15th, 1999"), so match by visible text,
  // not accessible name. Only the in-month day has this exact text.
  await cal.getByText(String(day), { exact: true }).first().click()
}

async function continueBtn(page: Page) {
  return page.getByRole("button", { name: /^continue$/i })
}

test(`onboarding walkthrough — scenario ${KEY} (${S.name})`, async ({
  page
}) => {
  test.setTimeout(120_000)

  // Step 1 — Welcome
  await page.goto("/onboarding")
  await expect(page).toHaveURL(/\/onboarding/)
  await page.getByRole("button", { name: /start your journey/i }).click()

  // Step 2 — Tell us about yourself
  await expect(page.getByText(/tell us about yourself/i)).toBeVisible()
  await page.getByLabel(/full name/i).fill(S.name)
  await pickDob(page, S.dob.year, S.dob.monthShort, S.dob.day)
  await (await continueBtn(page)).click()

  // Step 3 — Your Income (category=Salary, frequency=Monthly are pre-selected;
  // CPF checkbox is pre-checked)
  await expect(page.getByText(/your income/i)).toBeVisible()
  await page.getByPlaceholder(/primary salary|freelance/i).fill(S.incomeName)
  await page.locator('input[type="number"]').first().fill(S.incomeAmount)
  await (await continueBtn(page)).click()

  // Step 4 — CPF Allocation (auto from income) → Continue
  await expect(page.getByText(/cpf allocation/i)).toBeVisible()
  await (await continueBtn(page)).click()

  // Step 5 — Current Holdings → add one bank account, then Continue
  await expect(page.getByText(/current holdings/i)).toBeVisible()
  await page.getByPlaceholder(/DBS, OCBC, UOB/i).fill(S.bank)
  await page.locator('input[type="number"]').first().fill(S.holdingAmount)
  await page.getByRole("button", { name: /add account/i }).click()
  await expect(page.getByText(new RegExp(S.bank, "i")).first()).toBeVisible()
  await (await continueBtn(page)).click()

  // Step 6 — Your Expenses → set a % of income, pick a few categories, Continue
  await expect(page.getByText(/your expenses/i)).toBeVisible()
  const pct = page.locator('input[type="number"]').first()
  if (await pct.count()) await pct.fill(S.expensePct)
  for (const cat of ["Housing", "Food", "Transportation"]) {
    await page.getByText(cat, { exact: true }).first().click()
  }
  await (await continueBtn(page)).click()

  // Step 7 — Confirmation → Complete Setup
  await expect(
    page.getByText(/you'?re all set|complete setup/i).first()
  ).toBeVisible()
  await page.getByRole("button", { name: /complete setup/i }).click()

  // Lands on the overview
  await page.waitForURL(/\/overview/, { timeout: 30_000 })
  await page.waitForLoadState("networkidle")
  await page.screenshot({
    path: `test-results/s${KEY}-overview.png`,
    fullPage: true
  })

  // ── Click through the tabs and show the data is correct ──
  const incomeWhole = S.incomeAmount.replace(/(\d)(?=(\d{3})+$)/g, "$1,") // 4000 -> 4,000

  // Incomes
  await page.goto("/user?tab=incomes")
  await page.waitForLoadState("networkidle")
  await expect(page.getByText(new RegExp(incomeWhole)).first()).toBeVisible({
    timeout: 15_000
  })
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `test-results/s${KEY}-incomes.png`,
    fullPage: true
  })

  // Family — the Self member shows the name we entered
  await page.goto("/user?tab=family")
  await page.waitForLoadState("networkidle")
  await expect(page.getByText(new RegExp(S.name, "i")).first()).toBeVisible({
    timeout: 15_000
  })
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `test-results/s${KEY}-family.png`,
    fullPage: true
  })

  // CPF
  await page.goto("/user?tab=cpf")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `test-results/s${KEY}-cpf.png`,
    fullPage: true
  })

  // Holdings — the bank + amount we added
  await page.goto("/user?tab=holdings")
  await page.waitForLoadState("networkidle")
  await expect(page.getByText(new RegExp(S.bank, "i")).first()).toBeVisible({
    timeout: 15_000
  })
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `test-results/s${KEY}-holdings.png`,
    fullPage: true
  })

  // Expenses
  await page.goto("/user?tab=expenses")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `test-results/s${KEY}-expenses.png`,
    fullPage: true
  })
})
