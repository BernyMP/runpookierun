import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import type { Preferences } from "../domain/planner";
import type { Subscription } from "../domain/billing";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const date = Date.parse("2026-09-21T17:00:00Z");
const preferences: Preferences = {
  acceptedTerms: true,
  experience: "new",
  motivation: "More energy",
  days: [1, 3, 5],
  minutes: 20,
  timezone: "America/Phoenix",
};
const subscription: Subscription = {
  clerkId: "runner",
  itemId: "item",
  planId: "plan_paid",
  status: "active",
  isTrial: false,
  willRenew: true,
  periodEnd: date + 30 * 86400000,
  amountCents: 499,
  currency: "USD",
  syncedAt: date,
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(date);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
async function setup() {
  const t = convexTest(schema, modules);
  const runner = t.withIdentity({
    subject: "runner",
    email: "runner@example.test",
  });
  await runner.mutation(api.users.ensure, {});
  await runner.mutation(api.users.savePreferences, { preferences });
  return { t, runner };
}
describe("account and access boundaries", () => {
  it("requires authentication and recovers idempotent registration", async () => {
    const { t, runner } = await setup();
    await expect(t.mutation(api.users.ensure, {})).rejects.toThrow(/sign in/);
    const a = await runner.mutation(api.users.ensure, {});
    const b = await runner.mutation(api.users.ensure, {});
    expect(a).toBe(b);
    await expect(runner.mutation(api.weeks.ensure, {})).rejects.toThrow(
      /trial/,
    );
    await t.mutation(internal.billing.apply, { subscription });
    expect(await runner.mutation(api.weeks.ensure, {})).toBeTruthy();
  });
  it("saves incomplete onboarding without granting paid access", async () => {
    const { runner } = await setup();
    await runner.mutation(api.users.saveDraft, {
      draft: { motivation: "A saved thought", days: [1] },
    });
    expect((await runner.query(api.users.current, {}))?.draft?.motivation).toBe(
      "A saved thought",
    );
    await expect(
      runner.mutation(api.users.savePreferences, {
        preferences: { ...preferences, days: [1, 2] },
      }),
    ).rejects.toThrow(/rest/);
    await expect(runner.mutation(api.weeks.ensure, {})).rejects.toThrow(
      /trial/,
    );
  });
  it("prevents cross-account changes and access without a paid entitlement", async () => {
    const { t, runner } = await setup();
    await t.mutation(internal.billing.apply, { subscription });
    const weekId = await runner.mutation(api.weeks.ensure, {});
    const other = t.withIdentity({ subject: "other" });
    await other.mutation(api.users.ensure, {});
    await other.mutation(api.users.savePreferences, { preferences });
    await t.mutation(internal.billing.apply, {
      subscription: { ...subscription, clerkId: "other", itemId: "other-item" },
    });
    await expect(
      other.mutation(api.weeks.command, {
        weekId,
        workoutId: "2026-09-21",
        command: { type: "done" },
      }),
    ).rejects.toThrow(/not found/);
    await t.mutation(internal.billing.apply, {
      subscription: { ...subscription, status: "past_due", syncedAt: date + 1 },
    });
    await expect(
      runner.mutation(api.weeks.command, {
        weekId,
        workoutId: "2026-09-21",
        command: { type: "done" },
      }),
    ).rejects.toThrow(/trial/);
    expect(await runner.query(api.weeks.current, {})).not.toBeNull();
  });
});
describe("weekly persistence", () => {
  it("creates one week for concurrent requests and preserves a completed history", async () => {
    const { t, runner } = await setup();
    await t.mutation(internal.billing.apply, { subscription });
    const ids = await Promise.all([
      runner.mutation(api.weeks.ensure, {}),
      runner.mutation(api.weeks.ensure, {}),
    ]);
    expect(ids[0]).toBe(ids[1]);
    await runner.mutation(api.weeks.command, {
      weekId: ids[0],
      workoutId: "2026-09-21",
      command: { type: "done", effort: "hard" },
    });
    vi.setSystemTime(date + 7 * 86400000);
    await expect(runner.mutation(api.weeks.ensure, {})).rejects.toThrow(
      /Confirm/,
    );
    const next = await runner.mutation(api.weeks.confirm, {
      previousWeekId: ids[0],
      choice: { type: "easier" },
    });
    expect(
      await runner.mutation(api.weeks.confirm, {
        previousWeekId: ids[0],
        choice: { type: "easier" },
      }),
    ).toBe(next);
    expect(next).not.toBe(ids[0]);
    const old = await t.run((ctx) => ctx.db.get(ids[0]));
    expect(old?.workouts[0].status).toBe("done");
    expect(
      (await runner.query(api.weeks.current, {}))?.workouts[0].minutes,
    ).toBe(15);
  });
  it("a delayed AI result cannot overwrite a user's changes", async () => {
    const { t, runner } = await setup();
    await t.mutation(internal.billing.apply, { subscription });
    const id = await runner.mutation(api.weeks.ensure, {});
    await runner.mutation(api.weeks.command, {
      weekId: id,
      workoutId: "2026-09-21",
      command: { type: "done" },
    });
    const week = (await runner.query(api.weeks.current, {}))!;
    await t.mutation(internal.weeks.finishPersonalization, {
      weekId: id,
      revision: 0,
      result: {
        encouragement: "New copy",
        sessions: week.workouts
          .filter((w) => w.kind !== "rest")
          .map((w) => ({ id: w.id, template: "run-walk" })),
      },
    });
    const actual = (await runner.query(api.weeks.current, {}))!;
    expect(actual.workouts[0].status).toBe("done");
    expect(actual.personalizationState).toBe("disabled");
  });
  it("planning works without an AI provider", async () => {
    vi.stubEnv("GEMINI_KEY", "");
    const { t, runner } = await setup();
    await t.mutation(internal.billing.apply, { subscription });
    const id = await runner.mutation(api.weeks.ensure, {});
    await t.action(internal.coach.personalize, { weekId: id });
    const week = (await runner.query(api.weeks.current, {}))!;
    expect(week.personalizationState).toBe("disabled");
    expect(week.workouts).toHaveLength(7);
  });
});
describe("billing synchronization and reminders", () => {
  it("ignores older reconciliation responses and deduplicates webhook delivery", async () => {
    const { t, runner } = await setup();
    await t.mutation(internal.billing.apply, { subscription });
    await t.mutation(internal.billing.apply, {
      subscription: { ...subscription, status: "ended", syncedAt: date - 1 },
    });
    expect((await runner.query(api.billing.current, {}))?.status).toBe(
      "active",
    );
    await t.mutation(internal.billing.enqueueEvent, {
      eventId: "evt_1",
      clerkId: "runner",
    });
    await t.mutation(internal.billing.enqueueEvent, {
      eventId: "evt_1",
      clerkId: "runner",
    });
    expect(
      await t.run((ctx) => ctx.db.query("billingEvents").collect()),
    ).toHaveLength(1);
  });
  it("schedules day six, claims only once, and records delivery only once", async () => {
    const { t } = await setup();
    const trial = {
      ...subscription,
      isTrial: true,
      periodEnd: date + 7 * 86400000,
    };
    await t.mutation(internal.billing.apply, { subscription: trial });
    await t.mutation(internal.billing.apply, { subscription: trial });
    const reminders = await t.run((ctx) => ctx.db.query("reminders").collect());
    expect(reminders).toHaveLength(1);
    const reminder = reminders[0];
    expect(reminder.dueAt).toBe(date + 6 * 86400000);
    expect(
      await t.mutation(internal.billing.claimReminder, {
        reminderId: reminder._id,
      }),
    ).toBeNull();
    vi.setSystemTime(reminder.dueAt);
    expect(
      await t.mutation(internal.billing.claimReminder, {
        reminderId: reminder._id,
      }),
    ).not.toBeNull();
    expect(
      await t.mutation(internal.billing.claimReminder, {
        reminderId: reminder._id,
      }),
    ).toBeNull();
    await t.mutation(internal.billing.finishReminder, {
      reminderId: reminder._id,
      providerId: "mail_1",
    });
    expect(
      await t.mutation(internal.billing.claimReminder, {
        reminderId: reminder._id,
      }),
    ).toBeNull();
  });
  it("a duplicate job cannot release another sender's lease or bypass retry timing", async () => {
    const { t } = await setup();
    await t.mutation(internal.billing.apply, {
      subscription: {
        ...subscription,
        isTrial: true,
        periodEnd: date + 7 * 86400000,
      },
    });
    const reminder = (
      await t.run((ctx) => ctx.db.query("reminders").collect())
    )[0];
    vi.setSystemTime(reminder.dueAt);
    const claimed = (await t.mutation(internal.billing.claimReminder, {
      reminderId: reminder._id,
    }))!;
    await t.mutation(internal.billing.finishReminder, {
      reminderId: reminder._id,
      error: "Duplicate reconciliation failed",
    });
    expect((await t.run((ctx) => ctx.db.get(reminder._id)))?.status).toBe(
      "sending",
    );
    await t.mutation(internal.billing.finishReminder, {
      reminderId: reminder._id,
      leaseId: claimed.leaseId,
      error: "Provider unavailable",
    });
    expect((await t.run((ctx) => ctx.db.get(reminder._id)))?.status).toBe(
      "pending",
    );
    expect(
      await t.mutation(internal.billing.claimReminder, {
        reminderId: reminder._id,
      }),
    ).toBeNull();
    vi.setSystemTime(reminder.dueAt + 300000);
    expect(
      await t.mutation(internal.billing.claimReminder, {
        reminderId: reminder._id,
      }),
    ).not.toBeNull();
  });
  it("cancellation suppresses email, extension creates a new due date", async () => {
    const { t } = await setup();
    const trial = {
      ...subscription,
      isTrial: true,
      periodEnd: date + 7 * 86400000,
    };
    await t.mutation(internal.billing.apply, { subscription: trial });
    await t.mutation(internal.billing.apply, {
      subscription: {
        ...trial,
        status: "canceled",
        willRenew: false,
        syncedAt: date + 1,
      },
    });
    expect(
      (await t.run((ctx) => ctx.db.query("reminders").collect()))[0].status,
    ).toBe("canceled");
    await t.mutation(internal.billing.apply, {
      subscription: {
        ...trial,
        periodEnd: trial.periodEnd + 86400000,
        syncedAt: date + 2,
      },
    });
    const reminders = await t.run((ctx) => ctx.db.query("reminders").collect());
    expect(reminders.filter((r) => r.status === "pending")).toHaveLength(1);
    expect(reminders.find((r) => r.status === "pending")?.dueAt).toBe(
      date + 7 * 86400000,
    );
  });
  it("retries failed email delivery and surfaces exhaustion", async () => {
    const { t } = await setup();
    const trial = {
      ...subscription,
      isTrial: true,
      periodEnd: date + 7 * 86400000,
    };
    await t.mutation(internal.billing.apply, { subscription: trial });
    const reminder = (
      await t.run((ctx) => ctx.db.query("reminders").collect())
    )[0];
    vi.setSystemTime(reminder.dueAt);
    for (let i = 0; i < 6; i++)
      await t.mutation(internal.billing.finishReminder, {
        reminderId: reminder._id,
        error: "Provider down",
      });
    const actual = await t.run((ctx) => ctx.db.get(reminder._id));
    expect(actual?.status).toBe("failed");
    expect(actual?.attempts).toBe(6);
  });
  it("rejects unsigned webhook requests", async () => {
    const { t } = await setup();
    vi.stubEnv(
      "CLERK_WEBHOOK_SECRET",
      `whsec_${Buffer.from("test").toString("base64")}`,
    );
    const response = await t.fetch("/webhooks/clerk", {
      method: "POST",
      body: "{}",
    });
    expect(response.status).toBe(400);
    expect(
      await t.run((ctx) => ctx.db.query("billingEvents").collect()),
    ).toHaveLength(0);
  });
  it("deletes app records and cancels queued reminders for deleted accounts", async () => {
    const { t, runner } = await setup();
    await t.mutation(internal.billing.apply, {
      subscription: { ...subscription, isTrial: true },
    });
    await runner.mutation(api.weeks.ensure, {});
    await t.mutation(internal.users.removeData, { clerkId: "runner" });
    expect(await runner.query(api.users.current, {})).toBeNull();
    expect(await t.run((ctx) => ctx.db.query("weeks").collect())).toHaveLength(
      0,
    );
    expect(
      await t.run((ctx) => ctx.db.query("reminders").collect()),
    ).toHaveLength(0);
  });
});
