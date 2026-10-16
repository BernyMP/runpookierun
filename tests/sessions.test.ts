import { describe, expect, it } from "vitest";
import { buildSession, sessionTemplates } from "../domain/sessions";
import {
  applyWorkoutCommand,
  buildWeek,
  type Preferences,
} from "../domain/planner";
import {
  editionSessions,
  upcomingEditions,
  publicationTime,
} from "../domain/editorial";
import { starterEdition } from "../content/free-program";
const preferences: Preferences = {
  acceptedTerms: true,
  experience: "returning",
  motivation: "Outside time",
  days: [1, 3, 6],
  minutes: 20,
  timezone: "America/Phoenix",
};
describe("varied, bounded sessions", () => {
  it("every template totals its advertised duration, including warm-up and cool-down", () => {
    for (const template of sessionTemplates)
      for (const minutes of [10, 15, 20, 25, 30]) {
        const session = buildSession(template.id, minutes);
        expect(session.steps.reduce((sum, step) => sum + step.seconds, 0)).toBe(
          minutes * 60,
        );
        expect(session.steps[0]).toEqual({
          phase: "warm-up",
          action: "walk",
          seconds: 300,
        });
        expect(session.steps.at(-1)).toEqual({
          phase: "cool-down",
          action: "walk",
          seconds: 300,
        });
        expect(session.steps.every((step) => step.seconds > 0)).toBe(true);
        if (minutes === 10)
          expect(session.steps.every((step) => step.action === "walk")).toBe(
            true,
          );
      }
    expect(() => buildSession("unknown", 20)).toThrow();
    expect(() => buildSession("fresh-air", 45)).toThrow();
  });
  it("returning runners get three different gentle templates, without continuous-running prescriptions", () => {
    const week = buildWeek(preferences, "2026-09-21");
    const runs = week.workouts.filter((workout) => workout.kind !== "rest");
    expect(new Set(runs.map((run) => run.templateId)).size).toBe(3);
    expect(runs.every((run) => run.kind === "run-walk")).toBe(true);
    for (const run of runs) {
      expect(
        run
          .steps!.filter((step) => step.action === "jog")
          .every((step) => step.seconds <= 60),
      ).toBe(true);
      expect(
        run
          .steps!.filter((step) => step.action === "jog")
          .reduce((sum, step) => sum + step.seconds, 0),
      ).toBeLessThanOrEqual((run.minutes - 10) * 20);
    }
  });
  it("a confirmed next week keeps the same jogging doses without automatic progression", () => {
    const first = buildWeek(preferences, "2026-09-21");
    const next = buildWeek(preferences, "2026-09-28", first.workouts);
    const dose = (week: typeof first) =>
      week.workouts
        .filter((workout) => workout.kind !== "rest")
        .map((workout) => ({
          minutes: workout.minutes,
          template: workout.templateId,
          jogging: workout
            .steps!.filter((step) => step.action === "jog")
            .reduce((sum, step) => sum + step.seconds, 0),
        }));
    expect(dose(next)).toEqual(dose(first));
  });
  it("shortening preserves identity and template while recalculating every step", () => {
    const week = buildWeek(preferences, "2026-09-21");
    const run = week.workouts[0];
    const shorter = applyWorkoutCommand(
      week,
      run.id,
      { type: "shorten" },
      preferences,
      Date.parse("2026-09-21T17:00Z"),
    ).workouts[0];
    expect(shorter.id).toBe(run.id);
    expect(shorter.templateId).toBe(run.templateId);
    expect(shorter.minutes).toBe(15);
    expect(shorter.steps!.reduce((sum, step) => sum + step.seconds, 0)).toBe(
      900,
    );
    expect(run.minutes).toBe(20);
    expect(run.steps!.reduce((sum, step) => sum + step.seconds, 0)).toBe(1200);
  });
  it("free sessions are two core outings and an optional third with rest gaps", () => {
    const sessions = editionSessions(starterEdition);
    expect(sessions.map((session) => session.minutes)).toEqual([20, 20, 15]);
    expect(sessions.map((session) => session.day)).toEqual([1, 3, 6]);
    expect(sessions.map((session) => session.optional)).toEqual([
      false,
      false,
      true,
    ]);
  });
  it("Phoenix publication dates work at the Monday boundary", () => {
    expect(upcomingEditions(Date.parse("2026-09-21T12:59Z"))).toEqual([
      "2026-09-21",
      "2026-09-28",
    ]);
    expect(upcomingEditions(Date.parse("2026-09-21T13:00Z"))).toEqual([
      "2026-09-28",
      "2026-10-05",
    ]);
    expect(publicationTime("2026-09-21")).toBe(Date.parse("2026-09-21T13:00Z"));
    expect(() => publicationTime("2026-09-22")).toThrow();
    expect(() => publicationTime("2026-02-30")).toThrow();
  });
});
