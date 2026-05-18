import { defineConfig } from "vitest/config";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Resolve the URL tests should connect to.
//
// Preference order:
//   1. TEST_DATABASE_URL (explicit override, e.g. for CI)
//   2. Derive from DATABASE_URL by swapping the db-name segment to
//      "foracle_test" — matches what scripts/setup-test-db.sh sets up
//   3. Fallback fake URL — keeps the mocked-only tests passing on a machine
//      with no local Postgres (the real-DB suite will skip with a clear error)
//
// Safety: the resolved URL must contain "test" before we hand it over.
// db-helpers.ts re-validates this before any TRUNCATE.
function resolveTestDbUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const dev = process.env.DATABASE_URL;
  if (!dev) return "postgresql://test:test@127.0.0.1:1/test_fake";
  const swapped = dev.replace(/\/([^/?]+)(\?|$)/, "/foracle_test$2");
  if (swapped === dev || !swapped.includes("foracle_test")) {
    return "postgresql://test:test@127.0.0.1:1/test_fake";
  }
  return swapped;
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    env: {
      DATABASE_URL: resolveTestDbUrl(),
    },
    // Run test files serially so the real-DB suite never races on shared
    // schema state. The whole suite still completes in <2s at current size.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
