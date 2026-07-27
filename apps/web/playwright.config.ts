import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.OPENFRIEND_BROWSER_BASE_URL;

if (!baseURL) {
  throw new Error(
    "OPENFRIEND_BROWSER_BASE_URL is required; use pnpm test:browser",
  );
}

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.spec.ts",
  outputDir: "../../test-results/browser",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["line"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
