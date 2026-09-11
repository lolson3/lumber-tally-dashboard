import { defineConfig, devices } from "@playwright/test";

const testServerPort = Number(process.env.PLAYWRIGHT_PORT || "4173");
if (!Number.isInteger(testServerPort) || testServerPort < 1 || testServerPort > 65_535) {
  throw new Error("PLAYWRIGHT_PORT must be an integer between 1 and 65535.");
}
const testServerUrl = `http://127.0.0.1:${testServerPort}`;

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
    command: `npm run preview -- --host 127.0.0.1 --port ${testServerPort} --strictPort`,
    url: testServerUrl,
    reuseExistingServer: false,
  },
});
