import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 300000,
  // Local Next.js routes compile on first visit; allow that before asserting UI.
  expect: { timeout: 60000 },
  webServer: {
    env: { APP_ORIGIN: `http://127.0.0.1:${process.env.TEST_PORT || "3000"}` },
    command: `npm run dev -- --port ${process.env.TEST_PORT || "3000"}`,
    url: `http://127.0.0.1:${process.env.TEST_PORT || "3000"}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  use: {
    baseURL: `http://127.0.0.1:${process.env.TEST_PORT || "3000"}`,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  reporter: "list",
});
