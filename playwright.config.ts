import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for E2E tests.
 * Set BASE_URL to test a deployed preview (e.g. the Lovable preview URL).
 * Otherwise, Playwright will start `vite dev` locally.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
