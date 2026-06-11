import { defineConfig, devices } from "@playwright/test";

// Dedicated config for the onboarding wizard RECORDINGS (not part of CI).
// Records video, reuses the authenticated storageState bridged from the live
// browse session (.gstack/browse-states/pw-storage.json), and reuses the
// already-running dev server. Run via:
//   npx playwright test -c playwright.record.config.ts
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/recordings",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL,
    storageState: ".gstack/browse-states/pw-storage.json",
    video: "on",
    trace: "on",
    screenshot: "on",
    viewport: { width: 1366, height: 900 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
