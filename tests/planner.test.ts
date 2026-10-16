import { describe, expect, it } from "vitest";
import {
  addDays,
  applyWorkoutCommand,
  buildWeek,
  dayOfWeek,
  localDate,
  personalizeWeek,
  preferencesSchema,
  validMoveDates,
  type Preferences,
} from "../domain/planner";
const preferences: Preferences = {
  acceptedTerms: true,
  experience: "new",
  motivation: "A clearer head",
  days: [1, 3, 5],
  minutes: 20,
  timezone: "America/Phoenix",
};
const now = Date.parse("2026-09-21T17:00:00Z");
describe("calendar and preferences", () => {
  it("uses the runner's date instead of the server date", () => {
    expect(
      localDate(Date.parse("2026-09-21T01:00:00Z"), "America/Phoenix"),
    ).toBe("2026-09-20");
  });
  it("keeps seven local dates across DST and leap days", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    const week = buildWeek(
      { ...preferences, timezone: "America/New_York" },
      "2026-10-30",
    );
    expect(week.endDate).toBe("2026-11-05");
    expect(new Set(week.workouts.map((w) => w.date)).size).toBe(7);
    expect(
      localDate(Date.parse("2026-11-01T05:30:00Z"), "America/New_York"),
    ).toBe(localDate(Date.parse("2026-11-01T06:30:00Z"), "America/New_York"));
  });
  it.each([[1, 2], [0, 1], [6, 0], [1, 1], [1], [0, 2, 4, 6]])(
    "rejects invalid day selections %j",
    (...days) => {
      expect(
        preferencesSchema.safeParse({ ...preferences, days }).success,
      ).toBe(false);
    },
  );
  it("rejects invalid timezones and durations", () => {
    expect(
      preferencesSchema.safeParse({ ...preferences, timezone: "Moon" }).success,
    ).toBe(false);
    expect(
      preferencesSchema.safeParse({ ...preferences, minutes: 60 }).success,
    ).toBe(false);
  });
});
describe("rule based weeks", () => {
  it("respects every valid combination of days, session cap, and start weekday", () => {
    for (let mask = 0; mask < 128; mask++) {
      const days = Array.from({ length: 7 }, (_, i) => i).filter(
        (day) => mask & (1 << day),
      );
      for (const minutes of [15, 20, 30] as const) {
        const p = { ...preferences, days, minutes };
        if (!preferencesSchema.safeParse(p).success) continue;
        for (let offset = 0; offset < 7; offset++) {
          const week = buildWeek(p, addDays("2026-09-21", offset));
          const runs = week.workouts.filter((w) => w.kind !== "rest");
          expect(runs).toHaveLength(days.length);
          expect(
            runs.every(
              (w) =>
                days.includes(dayOfWeek(w.date)) &&
                w.minutes <= minutes &&
                w.kind === "run-walk",
            ),
          ).toBe(true);
          expect(week.workouts).toHaveLength(7);
        }
      }
    }
  });
  it("keeps incomplete weeks at their approved duration, with no catch-up runs", () => {
    const first = buildWeek(preferences, "2026-09-21");
    const next = buildWeek(preferences, "2026-09-28", first.workouts);
    expect(
      next.workouts.filter((w) => w.kind !== "rest").map((w) => w.minutes),
    ).toEqual([20, 20, 20]);
  });
  it("does not increase completed easy weeks", () => {
    const previous = buildWeek(preferences, "2026-09-21").workouts.map((w) => ({
      ...w,
      status: "done" as const,
      effort: "easy" as const,
    }));
    expect(
      buildWeek({ ...preferences, minutes: 30 }, "2026-09-28", previous)
        .workouts.filter((w) => w.kind !== "rest")
        .every((w) => w.minutes === 20),
    ).toBe(true);
  });
  it("holds a gentler template chosen in the previous week", () => {
    const previous = buildWeek(preferences, "2026-09-21").workouts.map((w) => ({
      ...w,
      status: "done" as const,
    }));
    const next = buildWeek(
      { ...preferences, experience: "regular" },
      "2026-09-28",
      previous,
    );
    expect(
      next.workouts
        .filter((w) => w.kind !== "rest")
        .every((w) => w.kind === "run-walk"),
    ).toBe(true);
  });
  it("cannot move onto a recovery day after the previous week's run", () => {
    const p = { ...preferences, days: [2, 4] };
    const previous = buildWeek({ ...preferences, days: [0, 3] }, "2026-09-21");
    previous.workouts[6].status = "done";
    const next = buildWeek(p, "2026-09-28", previous.workouts);
    expect(next.previousRunDate).toBe("2026-09-27");
    expect(validMoveDates(next, "2026-09-29", "2026-09-28", p)).not.toContain(
      "2026-09-28",
    );
  });
  it("respects recovery from the previous week's final completed run", () => {
    const previous = buildWeek({ ...preferences, days: [0, 3] }, "2026-09-20");
    previous.workouts[6] = {
      ...previous.workouts[6],
      kind: "run-walk",
      status: "done",
      minutes: 20,
    };
    const next = buildWeek(
      { ...preferences, days: [0, 3] },
      "2026-09-27",
      previous.workouts,
    );
    expect(next.workouts[0].kind).toBe("rest");
  });
});
describe("workout commands", () => {
  it("marks actual completion and repeats safely", () => {
    const week = buildWeek(preferences, "2026-09-21");
    const done = applyWorkoutCommand(
      week,
      "2026-09-21",
      { type: "done" },
      preferences,
      now,
    );
    expect(done.workouts[0].status).toBe("done");
    expect(
      applyWorkoutCommand(
        done,
        "2026-09-21",
        { type: "done" },
        preferences,
        now,
      ),
    ).toEqual(done);
    expect(() =>
      applyWorkoutCommand(
        week,
        "2026-09-23",
        { type: "done" },
        preferences,
        now,
      ),
    ).toThrow(/Future/);
  });
  it("shortens to a minimum without changing completion", () => {
    let week = buildWeek(preferences, "2026-09-21");
    week = applyWorkoutCommand(
      week,
      "2026-09-21",
      { type: "shorten" },
      preferences,
      now,
    );
    expect(week.workouts[0].minutes).toBe(15);
    week = applyWorkoutCommand(
      week,
      "2026-09-21",
      { type: "shorten" },
      preferences,
      now,
    );
    expect(week.workouts[0].minutes).toBe(10);
    expect(() =>
      applyWorkoutCommand(
        week,
        "2026-09-21",
        { type: "shorten" },
        preferences,
        now,
      ),
    ).toThrow(/shortest/);
  });
  it("moves only to a future rest date with recovery room, keeping identity", () => {
    const p = { ...preferences, days: [1, 4] };
    const week = buildWeek(p, "2026-09-21");
    expect(validMoveDates(week, "2026-09-21", "2026-09-21", p)).toContain(
      "2026-09-22",
    );
    const moved = applyWorkoutCommand(
      week,
      "2026-09-21",
      { type: "move", targetDate: "2026-09-22" },
      p,
      now,
    );
    expect(moved.workouts.find((w) => w.id === "2026-09-21")?.date).toBe(
      "2026-09-22",
    );
    expect(new Set(moved.workouts.map((w) => w.date)).size).toBe(7);
    expect(() =>
      applyWorkoutCommand(
        week,
        "2026-09-21",
        { type: "move", targetDate: "2026-09-23" },
        p,
        now,
      ),
    ).toThrow(/recover/);
  });
  it("preserves skipped runs without creating replacements", () => {
    const week = buildWeek(preferences, "2026-09-21");
    const skipped = applyWorkoutCommand(
      week,
      "2026-09-21",
      { type: "skip" },
      preferences,
      now,
    );
    expect(skipped.workouts[0].status).toBe("skipped");
    expect(skipped.workouts.slice(1)).toEqual(week.workouts.slice(1));
  });
  it("blocks changes to history and completed workouts", () => {
    const week = buildWeek(preferences, "2026-09-21");
    expect(() =>
      applyWorkoutCommand(
        week,
        "2026-09-21",
        { type: "shorten" },
        preferences,
        now + 86400000,
      ),
    ).toThrow(/Past/);
    expect(() =>
      applyWorkoutCommand(
        week,
        "2026-09-21",
        { type: "done" },
        preferences,
        now + 7 * 86400000,
      ),
    ).toThrow(/ended/);
  });
});
describe("AI boundary", () => {
  const week = buildWeek(preferences, "2026-09-21");
  const valid = {
    encouragement: "One little win at a time.",
    sessions: week.workouts
      .filter((w) => w.kind !== "rest")
      .map((w) => ({ id: w.id, template: w.kind })),
  };
  it("accepts only complete allowlisted choices", () => {
    expect(personalizeWeek(week, valid).summary).toBe(valid.encouragement);
  });
  it("rejects malformed, duplicate, missing, invented, and harder sessions", () => {
    for (const bad of [
      null,
      {},
      { ...valid, duration: 100 },
      { ...valid, sessions: [] },
      {
        ...valid,
        sessions: [valid.sessions[0], valid.sessions[0], valid.sessions[0]],
      },
      {
        ...valid,
        sessions: valid.sessions.map((s) => ({ ...s, template: "run" })),
      },
      {
        ...valid,
        sessions: valid.sessions.map((s) => ({ ...s, id: "invalid" })),
      },
    ])
      expect(() => personalizeWeek(week, bad)).toThrow();
  });
});
