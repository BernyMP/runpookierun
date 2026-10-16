import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
afterEach(() => vi.unstubAllEnvs());
it.each([
  ["production", "https://example-staging-123.convex.cloud", "fixture"],
  ["staging", "https://legacy.convex.cloud", "fixture"],
  ["staging", "https://example-staging-123.convex.cloud", ""],
])(
  "refuses mail rehearsal outside an explicitly isolated fixture",
  async (tier, url, fixture) => {
    vi.stubEnv("POOKIE_STAGING_DEPLOYMENT", "example-staging-123");
    vi.stubEnv("POOKIE_ENVIRONMENT", tier);
    vi.stubEnv("CONVEX_CLOUD_URL", url);
    vi.stubEnv("POOKIE_MAIL_TEST_CLERK_ID", fixture);
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.stagingChecks.scheduleWeeklyReminder, {}),
    ).rejects.toThrow(/isolated staging/);
  },
);
it("does not bypass reminder opt-in or subscription requirements", async () => {
  vi.stubEnv("POOKIE_STAGING_DEPLOYMENT", "example-staging-123");
  vi.stubEnv("POOKIE_ENVIRONMENT", "staging");
  vi.stubEnv("CONVEX_CLOUD_URL", "https://example-staging-123.convex.cloud");
  vi.stubEnv("POOKIE_MAIL_TEST_CLERK_ID", "fixture");
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(internal.stagingChecks.scheduleWeeklyReminder, {}),
  ).rejects.toThrow(/opt in/);
  expect(
    await t.run((ctx) => ctx.db.query("weeklyReminders").collect()),
  ).toHaveLength(0);
});

it("refuses a rehearsal without a configured staging deployment", async () => {
  vi.stubEnv("POOKIE_ENVIRONMENT", "staging");
  vi.stubEnv("POOKIE_STAGING_DEPLOYMENT", "");
  vi.stubEnv("CONVEX_CLOUD_URL", "https://undefined.convex.cloud");
  vi.stubEnv("POOKIE_MAIL_TEST_CLERK_ID", "fixture");
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(internal.stagingChecks.scheduleWeeklyReminder, {}),
  ).rejects.toThrow(/isolated staging/);
});
