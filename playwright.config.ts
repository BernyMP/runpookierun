import { defineConfig, devices } from "@playwright/test";
const publicPort = Number(process.env.POOKIE_E2E_PORT || 4317);
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${publicPort}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      command: `npm run start -- --hostname localhost --port ${publicPort}`,
      url: `http://localhost:${publicPort}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npx vite --config tests/browser/vite.config.ts",
      url: "http://127.0.0.1:4318",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
