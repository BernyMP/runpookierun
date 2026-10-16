import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (
  process.env.POOKIE_CONNECTED_TESTS !== "1" ||
  process.env.POOKIE_ENVIRONMENT !== "staging" ||
  !process.env.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
  !process.env.POOKIE_STAGING_DEPLOYMENT ||
  process.env.NEXT_PUBLIC_CONVEX_URL !==
    `https://${process.env.POOKIE_STAGING_DEPLOYMENT}.convex.cloud`
)
  throw new Error("Connected tests require explicit opt-in and clean staging.");
process.env.CLERK_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default defineConfig({
  testDir: "./tests/connected",
  workers: 1,
  retries: 0,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: "list",
  outputDir: "artifacts/connected-results",
  use: {
    baseURL: "http://localhost:4317",
    trace: "off",
    screenshot: "only-on-failure",
  },
});
