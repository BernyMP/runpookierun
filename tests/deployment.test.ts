import { describe, expect, it } from "vitest";
import checks from "../scripts/launch-config.cjs";
const staging = {
  POOKIE_ENVIRONMENT: "staging",
  POOKIE_STAGING_DEPLOYMENT: "example-staging-123",
  POOKIE_PRODUCTION_DEPLOYMENT: "example-production-456",
  VERCEL_ENV: "preview",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
  CLERK_SECRET_KEY: "sk_test_fixture",
  NEXT_PUBLIC_CONVEX_URL: "https://example-staging-123.convex.cloud",
  NEXT_PUBLIC_CLERK_PAID_PLAN_ID: "cplan_fixture",
  SITE_URL: "https://runpookierun.com",
};
describe("deployment separation", () => {
  it("accepts a complete web configuration without backend or worker credentials", () => {
    expect(checks.configurationErrors("web", staging)).toEqual([]);
  });
  it("blocks missing services, legacy backends, live preview keys, and misplaced secrets", () => {
    for (const change of [
      { NEXT_PUBLIC_CONVEX_URL: "" },
      { POOKIE_STAGING_DEPLOYMENT: "" },
      { POOKIE_PRODUCTION_DEPLOYMENT: "example-staging-123" },
      { NEXT_PUBLIC_CONVEX_URL: "https://unrelated-backend-789.convex.cloud" },
      { CLERK_SECRET_KEY: "sk_live_fixture" },
      { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_fixture" },
      { VERCEL_ENV: "production" },
      { RESEND_API_KEY: "fixture" },
      { POOKIE_EDITOR_WORKER_SECRET: "fixture" },
    ])
      expect(
        checks.configurationErrors("web", { ...staging, ...change }).length,
      ).toBeGreaterThan(0);
  });
  it("keeps subscription agents local and confined to the clean backends", () => {
    const worker = {
      POOKIE_STAGING_DEPLOYMENT: "example-staging-123",
      POOKIE_EDITOR_CONVEX_URL: "https://example-staging-123.convex.site",
      POOKIE_EDITOR_WORKER_SECRET: "x".repeat(40),
    };
    expect(checks.configurationErrors("editorial", worker)).toEqual([]);
    for (const change of [
      { OPENAI_API_KEY: "fixture" },
      { POOKIE_STAGING_DEPLOYMENT: "" },
      { VERCEL: "1" },
      { POOKIE_EDITOR_CONVEX_URL: "https://example.com" },
    ])
      expect(
        checks.configurationErrors("editorial", { ...worker, ...change })
          .length,
      ).toBeGreaterThan(0);
  });
});
