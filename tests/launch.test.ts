import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  buildWeek,
  applyWorkoutCommand,
  type Preferences,
} from "../domain/planner";
import { recentProgress } from "../domain/progress";
import { nextWeeklyReminder } from "../domain/reminders";
import { signUnsubscribe, verifyUnsubscribe } from "../domain/reminder-token";
import { acquisitionFromUrl, sanitizeAttribution } from "../domain/acquisition";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const start = Date.parse("2026-09-21T17:00:00Z");
const prefs: Preferences = {
  acceptedTerms: true,
  experience: "returning",
  motivation: "Time for me",
  days: [1, 4],
  minutes: 20,
  timezone: "America/Phoenix",
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
async function setup() {
  const t = convexTest(schema, modules);
  const runner = t.withIdentity({ subject: "runner" });
  const userId = await runner.mutation(api.users.ensure, {
    attribution: { source: "club", campaign: "launch-club" },
  });
  await runner.mutation(api.users.savePreferences, { preferences: prefs });
  await t.mutation(internal.billing.apply, {
    subscription: {
      clerkId: "runner",
      itemId: "item",
      planId: "paid",
      status: "active",
      isTrial: false,
      willRenew: true,
      periodEnd: start + 60 * 86400000,
      amountCents: 499,
      currency: "USD",
      syncedAt: start,
    },
  });
  return { t, runner, userId };
}
describe("approved weekly workload", () => {
  it("holds duration through missed weeks and one shortened run", () => {
    let week = buildWeek(prefs, "2026-09-21");
    week = applyWorkoutCommand(
      week,
      "2026-09-21",
      { type: "shorten" },
      prefs,
      start,
    );
    for (const date of ["2026-09-28", "2026-10-05", "2026-10-12"]) {
      week = buildWeek(prefs, date, week.workouts, {
        choice: { type: "keep" },
        approvedMinutes: week.approvedMinutes,
      });
      expect(week.approvedMinutes).toBe(20);
      expect(
        week.workouts.filter((w) => w.kind !== "rest").map((w) => w.minutes),
      ).toEqual([20, 20]);
    }
  });
  it("allows an easier week, holds it, and restores only an explicit choice", () => {
    const first = buildWeek(prefs, "2026-09-21");
    const easier = buildWeek(prefs, "2026-09-28", first.workouts, {
      choice: { type: "easier" },
      approvedMinutes: 20,
    });
    expect(easier.approvedMinutes).toBe(15);
    expect(
      buildWeek(prefs, "2026-10-05", easier.workouts, {
        choice: { type: "keep" },
        approvedMinutes: 15,
      }).approvedMinutes,
    ).toBe(15);
    expect(
      buildWeek(prefs, "2026-10-05", easier.workouts, {
        choice: { type: "choose", minutes: 20 },
        approvedMinutes: 15,
      }).approvedMinutes,
    ).toBe(20);
    for (const minutes of [9, 17, 25, 100])
      expect(() =>
        buildWeek(prefs, "2026-10-05", easier.workouts, {
          choice: { type: "choose", minutes },
        }),
      ).toThrow();
  });
  it("requires an ended owned week, paid access, and a valid duration", async () => {
    const { t, runner } = await setup();
    const weekId = await runner.mutation(api.weeks.ensure, {});
    await expect(
      runner.mutation(api.weeks.confirm, {
        previousWeekId: weekId,
        choice: { type: "keep" },
      }),
    ).rejects.toThrow(/underway/);
    vi.setSystemTime(start + 7 * 86400000);
    await expect(
      runner.mutation(api.weeks.confirm, {
        previousWeekId: weekId,
        choice: { type: "choose", minutes: 25 },
      }),
    ).rejects.toThrow();
    const nextId = await runner.mutation(api.weeks.confirm, {
      previousWeekId: weekId,
      choice: { type: "keep" },
    });
    expect((await t.run((ctx) => ctx.db.get(nextId)))?.approvedMinutes).toBe(
      20,
    );
    vi.setSystemTime(start + 14 * 86400000);
    await expect(
      runner.mutation(api.weeks.confirm, {
        previousWeekId: weekId,
        choice: { type: "keep" },
      }),
    ).rejects.toThrow(/latest/);
    vi.setSystemTime(start + 61 * 86400000);
    await expect(
      runner.mutation(api.weeks.confirm, {
        previousWeekId: nextId,
        choice: { type: "keep" },
      }),
    ).rejects.toThrow(/trial/);
  });
  it("does not overlap saved weeks when preferences cross timezones", async () => {
    const { runner, t } = await setup();
    const previousWeekId = await runner.mutation(api.weeks.ensure, {});
    vi.setSystemTime(Date.parse("2026-09-28T07:30:00Z"));
    await runner.mutation(api.users.savePreferences, {
      preferences: { ...prefs, timezone: "Pacific/Honolulu" },
    });
    const next = await runner.mutation(api.weeks.confirm, {
      previousWeekId,
      choice: { type: "keep" },
    });
    expect((await t.run((ctx) => ctx.db.get(next)))?.startDate).toBe(
      "2026-09-28",
    );
    expect((await t.run((ctx) => ctx.db.get(previousWeekId)))?.endDate).toBe(
      "2026-09-27",
    );
  });
  it("shows four windows, including empty weeks, without counting skipped or rest days", () => {
    const old = buildWeek(prefs, "2026-09-07");
    old.workouts[0].status = "done";
    old.workouts[1].status = "done";
    old.workouts[3].status = "skipped";
    const current = buildWeek(prefs, "2026-09-21");
    expect(
      recentProgress([current, old], "2026-09-23").map((w) => w.completed),
    ).toEqual([0, 0, 1, 0]);
    expect(recentProgress([old], "2026-11-01").map((w) => w.completed)).toEqual(
      [0, 0, 0, 0],
    );
  });
  it("keeps progress and attribution scoped to the account", async () => {
    const { t, runner } = await setup();
    const id = await runner.mutation(api.weeks.ensure, {});
    await runner.mutation(api.weeks.command, {
      weekId: id,
      workoutId: "2026-09-21",
      command: { type: "done" },
    });
    const other = t.withIdentity({ subject: "other" });
    await other.mutation(api.users.ensure, {});
    expect(
      (await other.query(api.weeks.recent, {})).map((w) => w.completed),
    ).toEqual([0, 0, 0, 0]);
    expect((await runner.query(api.weeks.recent, {}))[0].completed).toBe(1);
    await runner.mutation(api.users.ensure, {
      attribution: { source: "friend" },
    });
    expect(
      (await runner.query(api.users.current, {}))?.attribution?.source,
    ).toBe("club");
  });
});
describe("optional weekly reminders", () => {
  it.each([
    ["2026-03-07T18:00:00Z", "America/New_York", "2026-03-08T22:00:00.000Z"],
    ["2026-10-31T18:00:00Z", "America/New_York", "2026-11-01T23:00:00.000Z"],
    ["2026-09-28T01:00:00Z", "America/Phoenix", "2026-10-05T01:00:00.000Z"],
    ["2026-09-26T18:00:00Z", "Asia/Kolkata", "2026-09-27T12:30:00.000Z"],
  ])(
    "schedules Sunday 18:00 across timezone boundaries: %s %s",
    (now, timezone, expected) => {
      expect(
        new Date(nextWeeklyReminder(Date.parse(now), timezone)).toISOString(),
      ).toBe(expected);
    },
  );
  it("starts off, enqueues once, isolates leases, and cancels pending work on opt-out", async () => {
    const { t, runner } = await setup();
    expect(
      (await runner.query(api.users.current, {}))?.weeklyReminderEnabled ??
        false,
    ).toBe(false);
    await t.mutation(internal.weeklyReminders.enqueueDue, {});
    expect(
      await t.run((ctx) => ctx.db.query("weeklyReminders").collect()),
    ).toHaveLength(0);
    await runner.mutation(api.weeklyReminders.setEnabled, { enabled: true });
    vi.setSystemTime(
      (await runner.query(api.users.current, {}))!.weeklyReminderNextAt!,
    );
    await t.mutation(internal.weeklyReminders.enqueueDue, {});
    await t.mutation(internal.weeklyReminders.enqueueDue, {});
    const jobs = await t.run((ctx) =>
      ctx.db.query("weeklyReminders").collect(),
    );
    expect(jobs).toHaveLength(1);
    const reminderId = jobs[0]._id;
    const claim = (await t.mutation(internal.weeklyReminders.claim, {
      reminderId,
    }))!;
    expect(
      await t.mutation(internal.weeklyReminders.claim, { reminderId }),
    ).toBeNull();
    await t.mutation(internal.weeklyReminders.finish, {
      reminderId,
      leaseId: "stale",
    });
    expect((await t.run((ctx) => ctx.db.get(reminderId)))?.status).toBe(
      "sending",
    );
    await runner.mutation(api.weeklyReminders.setEnabled, { enabled: false });
    expect(
      await t.query(internal.weeklyReminders.stillAllowed, {
        reminderId,
        leaseId: claim.leaseId,
      }),
    ).toBe(false);
    expect((await t.run((ctx) => ctx.db.get(reminderId)))?.status).toBe(
      "canceled",
    );
  });
  it("rejects forged unsubscribe tokens, honors signed ones, and protects later opt-in", async () => {
    const { t, runner, userId } = await setup();
    const secret = "test-only-signing-secret-long-enough-12345";
    vi.stubEnv("WEEKLY_REMINDER_SECRET", secret);
    await runner.mutation(api.weeklyReminders.setEnabled, { enabled: true });
    const token = signUnsubscribe(userId, 1, secret);
    expect(verifyUnsubscribe(token, secret)?.userId).toBe(userId);
    expect(
      verifyUnsubscribe(token, "a-different-secret-longer-than-32-characters"),
    ).toBeNull();
    expect(
      await t.action(api.weeklyRemindersNode.unsubscribe, {
        token: token + "corrupt",
      }),
    ).toBe(false);
    expect(
      (await runner.query(api.users.current, {}))?.weeklyReminderEnabled,
    ).toBe(true);
    expect(await t.action(api.weeklyRemindersNode.unsubscribe, { token })).toBe(
      true,
    );
    expect(
      (await runner.query(api.users.current, {}))?.weeklyReminderEnabled,
    ).toBe(false);
    await runner.mutation(api.weeklyReminders.setEnabled, { enabled: true });
    await t.action(api.weeklyRemindersNode.unsubscribe, { token });
    expect(
      (await runner.query(api.users.current, {}))?.weeklyReminderEnabled,
    ).toBe(true);
  });
  it("drops old mail after an outage and removes jobs with account data", async () => {
    const { t, runner } = await setup();
    await runner.mutation(api.weeklyReminders.setEnabled, { enabled: true });
    const due = (await runner.query(api.users.current, {}))!
      .weeklyReminderNextAt!;
    vi.setSystemTime(due + 24 * 3600000);
    await t.mutation(internal.weeklyReminders.enqueueDue, {});
    expect(
      await t.run((ctx) => ctx.db.query("weeklyReminders").collect()),
    ).toHaveLength(0);
    vi.setSystemTime(
      (await runner.query(api.users.current, {}))!.weeklyReminderNextAt!,
    );
    await t.mutation(internal.weeklyReminders.enqueueDue, {});
    await t.mutation(internal.users.removeData, { clerkId: "runner" });
    expect(
      await t.run((ctx) => ctx.db.query("weeklyReminders").collect()),
    ).toHaveLength(0);
  });
});
describe("privacy-conscious acquisition", () => {
  it("stores only recognized sources and campaign codes", () => {
    expect(
      acquisitionFromUrl(
        "https://runpookierun.com/?utm_source=club&utm_campaign=club-phoenix",
      ),
    ).toEqual({ source: "club", campaign: "club-phoenix" });
    expect(
      acquisitionFromUrl(
        "https://runpookierun.com/",
        "https://chatgpt.com/c/private-conversation",
      ),
    ).toEqual({ source: "chatgpt" });
    expect(
      acquisitionFromUrl(
        "https://runpookierun.com/",
        "https://google.com.evil.test/path",
      ),
    ).toEqual({ source: "other" });
    expect(
      sanitizeAttribution({
        source: "user@example.com",
        campaign: "private data",
      }),
    ).toEqual({ source: "other" });
  });
});
