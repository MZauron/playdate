import { defineConfig, devices } from "@playwright/test";

// Smoke tests (T01, T11): a production build against the local Supabase, at iPhone size. Run them with `npm run test:smoke`
// (scripts/test-smoke.sh brings the local Supabase's address and keys).
const port = 3100;

export default defineConfig({
  testDir: "tests/smoke",
  // One organizer account for the whole run: the tests run one at a time.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${port}`, ...devices["iPhone 13"], trace: "retain-on-failure" },
  webServer: {
    command: `npm run build && npm run start -- --port ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
