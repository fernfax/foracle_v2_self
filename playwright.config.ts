import { defineConfig, devices } from "@playwright/test"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000"
const isCI = Boolean(process.env.CI)

// Saved Clerk session for authenticated specs (gitignored).
const authFile = "tests/e2e/.auth/user.json"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [
    // 1) Fetch a Clerk Testing Token (bypasses bot detection in test instances).
    { name: "global setup", testMatch: /global\.setup\.ts/ },
    // 2) Sign in once and persist the session to authFile.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      dependencies: ["global setup"]
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // Desktop, unauthenticated. Skips mobile-emulation specs and the
      // authenticated specs (those run in the "authenticated" project).
      testIgnore: [
        /mobile\..*\.spec\.ts/,
        /dogfood-.*\.spec\.ts/,
        /\.authed\.spec\.ts/
      ]
    },
    // Mobile-emulation projects — real device viewports, touch, DPR, mobile UA.
    // They run ONLY the mobile.*.spec.ts files. Added by the PWA/mobile audit.
    {
      name: "Mobile Safari (iPhone 13)",
      use: { ...devices["iPhone 13"] },
      testMatch: /mobile\..*\.spec\.ts/
    },
    {
      name: "Mobile Chrome (Pixel 5)",
      use: { ...devices["Pixel 5"] },
      testMatch: /mobile\..*\.spec\.ts/
    },
    // Authenticated desktop — reuses the saved Clerk session. Runs the dogfood
    // walk-throughs and any *.authed.spec.ts.
    {
      name: "authenticated",
      use: { ...devices["Desktop Chrome"], storageState: authFile },
      dependencies: ["setup"],
      testMatch: [/dogfood-.*\.spec\.ts/, /\.authed\.spec\.ts/]
    }
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !isCI,
        timeout: 120000
      }
})
