import { defineConfig, devices } from "@playwright/test";

const testServerUrl = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./src/test/e2e",
  testMatch: "**/*.pw.ts",
  outputDir: "./src/test/results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: testServerUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: testServerUrl,
    reuseExistingServer: false,
  },
});
