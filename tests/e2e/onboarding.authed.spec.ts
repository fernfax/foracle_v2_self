import { expect, test } from "@playwright/test"
import postgres from "postgres"

/**
 * Locks in the Phase 4 fix (refactor: hydrate wizard from DB, make it
 * single-source). The wizard used to mount empty, so refreshing mid-onboarding
 * lost the income row's id and the next "Continue" INSERTED a duplicate. Now
 * the wizard hydrates from the DB on mount, so the income step reuses the
 * existing row and UPDATES it in place.
 *
 * This spec drives the real browser flow and asserts at the database row level:
 * create an income, hard-refresh back to the income step, Continue again, and
 * verify there is still exactly ONE row with the SAME id.
 *
 * It mutates the shared e2e user's `onboarding_completed` flag (the only way to
 * reach the wizard, which the app layout otherwise redirects away from once
 * onboarded). So it runs LAST in the authed chain via project dependencies (see
 * playwright.config.ts) and restores the flag + removes its test row in
 * afterAll — leaving the user exactly as it found them for the read-only
 * dogfood specs.
 */

const TEST_INCOME_NAME = "E2E Resume Income"
const DATABASE_URL = process.env.DATABASE_URL
const E2E_EMAIL = process.env.E2E_CLERK_USER_EMAIL

test.describe("Onboarding wizard — resume hydration (no duplicate income)", () => {
  // `prepare: false` — the Supabase transaction pooler (port 6543) doesn't
  // support prepared statements.
  let sql: ReturnType<typeof postgres> | undefined
  let userId = ""
  let familyId = ""

  const testIncomeCount = async () =>
    Number(
      (
        await sql!`
          select count(*)::int as c from incomes
          where family_id = ${familyId} and name = ${TEST_INCOME_NAME}
        `
      )[0].c
    )

  const testIncomeId = async () =>
    (
      await sql!`
        select id from incomes
        where family_id = ${familyId} and name = ${TEST_INCOME_NAME}
      `
    )[0]?.id as string | undefined

  test.beforeAll(async () => {
    if (!DATABASE_URL || !E2E_EMAIL) return
    sql = postgres(DATABASE_URL, { prepare: false })
    const rows = await sql`
      select id, family_id from users where email = ${E2E_EMAIL}
    `
    if (!rows[0]) throw new Error(`No user row for ${E2E_EMAIL}`)
    userId = rows[0].id
    familyId = rows[0].family_id
    // Clean slate + make /onboarding reachable for this user.
    await sql`delete from incomes where family_id = ${familyId} and name = ${TEST_INCOME_NAME}`
    await sql`update users set onboarding_completed = false where id = ${userId}`
  })

  test.afterAll(async () => {
    if (!sql) return
    // Restore the user to its pre-test state for the rest of the suite.
    await sql`delete from incomes where family_id = ${familyId} and name = ${TEST_INCOME_NAME}`
    await sql`update users set onboarding_completed = true where id = ${userId}`
    await sql.end()
  })

  test("refresh mid-flow updates the income in place, never duplicates", async ({
    page
  }) => {
    test.skip(
      !DATABASE_URL || !E2E_EMAIL,
      "DATABASE_URL and E2E_CLERK_USER_EMAIL must be set"
    )

    // 1) First pass through the income step creates the row.
    await page.goto("/onboarding?step=3")
    // The form only renders once hydration settles (the wizard shows a brief
    // "Loading…" first), so waiting for #name also asserts the gate clears.
    await expect(page.locator("#name")).toBeVisible()
    await page.fill("#name", TEST_INCOME_NAME)
    await page.fill("#amount", "5000")
    await page.getByRole("button", { name: "Continue" }).click()
    // Continue advances to the CPF step; that confirms the save finished.
    await page.waitForURL(/[?&]step=4/)
    expect(await testIncomeCount()).toBe(1)
    const firstId = await testIncomeId()
    expect(firstId).toBeTruthy()

    // 2) Hard-refresh straight back to the income step — the bug's trigger.
    await page.goto("/onboarding?step=3")
    // Hydration must repopulate the form from the saved row (the old code
    // showed an empty form here and lost the id).
    await expect(page.locator("#name")).toHaveValue(TEST_INCOME_NAME)
    await expect(page.locator("#amount")).toHaveValue("5000.00")

    // 3) Continue again. Pre-fix this inserted a second row; now it updates.
    await page.getByRole("button", { name: "Continue" }).click()
    await page.waitForURL(/[?&]step=4/)
    expect(await testIncomeCount()).toBe(1)
    expect(await testIncomeId()).toBe(firstId) // same row id = updated, not re-created
  })
})
