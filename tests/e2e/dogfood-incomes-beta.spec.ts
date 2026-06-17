import fs from "fs"
import path from "path"
import { setupClerkTestingToken } from "@clerk/testing/playwright"
import { expect, test } from "@playwright/test"

const TARGET = "/user?tab=incomes&view=beta"
const ARTIFACTS_DIR = path.join(
  process.cwd(),
  "test-results",
  "dogfood-incomes-beta"
)

test.describe("Dogfood: incomes beta view", () => {
  test.beforeAll(() => {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
  })

  test.setTimeout(90000)

  test("walk the page, capture state and any errors", async ({ page }) => {
    const consoleMessages: { type: string; text: string }[] = []
    const networkFailures: { url: string; failure: string }[] = []
    const pageErrors: string[] = []

    page.on("console", (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() })
    })
    page.on("pageerror", (err) => {
      pageErrors.push(err.message)
    })
    page.on("requestfailed", (req) => {
      networkFailures.push({
        url: req.url(),
        failure: req.failure()?.errorText ?? "unknown"
      })
    })
    page.on("response", (res) => {
      if (res.status() >= 400) {
        networkFailures.push({
          url: res.url(),
          failure: `HTTP ${res.status()}`
        })
      }
    })

    // Apply the Clerk testing token so the dev-instance handshake accepts the
    // saved session instead of bouncing to sign-in.
    await setupClerkTestingToken({ page })

    // 1) Navigate
    const response = await page.goto(TARGET, { waitUntil: "domcontentloaded" })
    // Don't wait for networkidle — Clerk's session polling means it never settles.
    await page.waitForTimeout(1500)

    const finalUrl = page.url()
    const title = await page.title()

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "01-initial-load.png"),
      fullPage: true
    })

    // 2) Detect auth redirect vs landed on the actual feature
    const isOnSignIn = /\/sign-in/.test(finalUrl)
    const isOnOnboarding = /\/onboarding/.test(finalUrl)
    const landedOnTarget =
      /\/user/.test(finalUrl) && finalUrl.includes("view=beta")

    // 3) If we made it past auth, poke at the beta view
    if (landedOnTarget) {
      // Visible headings
      const headings = await page.locator("h1, h2, h3").allTextContents()

      // Look for incomes-beta-specific UI signals
      const hasBetaBadge = (await page.getByText(/beta/i).count()) > 0
      const incomeRows = await page
        .locator('[data-testid="income-row"], [role="row"]')
        .count()
      const addIncomeButton = page.getByRole("button", {
        name: /add income|new income/i
      })
      const addIncomeVisible =
        (await addIncomeButton.count()) > 0
          ? await addIncomeButton.first().isVisible()
          : false

      // Try opening the creator drawer if present
      if (addIncomeVisible) {
        await addIncomeButton
          .first()
          .click()
          .catch(() => {})
        await page.waitForTimeout(400)
        await page.screenshot({
          path: path.join(ARTIFACTS_DIR, "02-after-add-income-click.png"),
          fullPage: true
        })
        // Close it again with Escape
        await page.keyboard.press("Escape").catch(() => {})
      }

      console.log("\n=== FEATURE OBSERVED ===")
      console.log("URL:", finalUrl)
      console.log("Title:", title)
      console.log("Headings:", headings)
      console.log("Beta badge visible:", hasBetaBadge)
      console.log("Income rows:", incomeRows)
      console.log("Add income button visible:", addIncomeVisible)
    } else {
      console.log("\n=== AUTH GATE HIT ===")
      console.log("Initial target:", TARGET)
      console.log("Final URL:", finalUrl)
      console.log("On sign-in:", isOnSignIn)
      console.log("On onboarding:", isOnOnboarding)
    }

    // 4) Always-collected diagnostics
    console.log("\n=== CONSOLE (errors/warnings only) ===")
    const noisy = consoleMessages.filter(
      (m) => m.type === "error" || m.type === "warning"
    )
    if (noisy.length === 0) console.log("(clean)")
    noisy.forEach((m) => console.log(`[${m.type}] ${m.text}`))

    console.log("\n=== NETWORK FAILURES ===")
    if (networkFailures.length === 0) console.log("(none)")
    networkFailures.forEach((f) => console.log(`${f.failure}  ${f.url}`))

    console.log("\n=== UNCAUGHT PAGE ERRORS ===")
    if (pageErrors.length === 0) console.log("(none)")
    pageErrors.forEach((e) => console.log(e))

    console.log("\n=== HTTP STATUS ===")
    console.log(response?.status())

    // Persist a JSON report for follow-up
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "report.json"),
      JSON.stringify(
        {
          target: TARGET,
          finalUrl,
          title,
          httpStatus: response?.status(),
          authGate: { isOnSignIn, isOnOnboarding, landedOnTarget },
          consoleMessages,
          networkFailures,
          pageErrors
        },
        null,
        2
      )
    )

    // We don't fail the run on auth gate — it's a dogfood, not a regression.
    expect(response?.status()).toBeLessThan(500)
  })
})
