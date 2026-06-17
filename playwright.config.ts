import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000"
const isCI = Boolean(process.env.CI)

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
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // Desktop project skips the mobile-emulation specs (see mobile.*.spec.ts).
      testIgnore: /mobile\..*\.spec\.ts/
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
