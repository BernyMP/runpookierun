import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const start = Date.parse("2026-09-21T12:00:00Z");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start);
  vi.stubEnv("POOKIE_ENVIRONMENT", "staging");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
it("reserves daily capacity for billing and never double counts retries", async () => {
  const t = convexTest(schema, modules);
  const reserve = (key: string, optional = true) =>
    t.mutation(internal.emailBudget.reserve, { key, optional });
  for (let i = 0; i < 8; i++) {
    vi.setSystemTime(start + i * 1000);
    expect((await reserve(`weekly/${i}`)).allowed).toBe(true);
  }
  vi.setSystemTime(start + 8000);
  expect((await reserve("weekly/overflow")).allowed).toBe(false);
  expect((await reserve("billing/first", false)).allowed).toBe(true);
  expect((await reserve("billing/first", false)).allowed).toBe(true);
  vi.setSystemTime(start + 9000);
  expect((await reserve("billing/second", false)).allowed).toBe(true);
  expect((await reserve("billing/overflow", false)).allowed).toBe(false);
  const counts = await t.run((ctx) => ctx.db.query("emailBudgets").collect());
  expect(counts.find((x) => x.key === "day/2026-09-21")?.count).toBe(10);
});
it("defers burst sends and resets the daily budget at UTC midnight", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.emailBudget.reserve, { key: "a", optional: false });
  const deferred = await t.mutation(internal.emailBudget.reserve, {
    key: "b",
    optional: false,
  });
  expect(deferred).toEqual({ allowed: false, retryAt: start + 1000 });
  vi.setSystemTime(Date.parse("2026-09-22T00:00:00Z"));
  expect(
    (
      await t.mutation(internal.emailBudget.reserve, {
        key: "c",
        optional: false,
      })
    ).allowed,
  ).toBe(true);
});
it("holds the monthly cap through day rollover", async () => {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("emailBudgets", { key: "month/2026-09", count: 300 }),
  );
  expect(
    await t.mutation(internal.emailBudget.reserve, {
      key: "x",
      optional: false,
    }),
  ).toEqual({ allowed: false, retryAt: Date.parse("2026-10-01T00:00:00Z") });
  vi.setSystemTime(Date.parse("2026-10-01T00:00:00Z"));
  expect(
    (
      await t.mutation(internal.emailBudget.reserve, {
        key: "x",
        optional: false,
      })
    ).allowed,
  ).toBe(true);
});
