import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.test" });

const PORT = 3101;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Specs share one seeded test database (reset once in globalSetup, not
  // per-file) — running them concurrently would race each other's data.
  // Each spec is written to create its own uniquely-named test data rather
  // than relying on isolation between runs.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./tests/setup/playwright-global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:e2e",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL!,
      SHADOW_DATABASE_URL: process.env.SHADOW_DATABASE_URL ?? "",
      SESSION_SECRET: process.env.SESSION_SECRET!,
      APP_URL: BASE_URL,
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
