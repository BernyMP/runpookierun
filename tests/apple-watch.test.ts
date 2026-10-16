import { describe, expect, it } from "vitest";
import { decode } from "@bibixx/workoutkit/decode";
import type { GoalJson } from "@bibixx/workoutkit";
import { buildAppleWorkout, exportAppleWorkout } from "../domain/apple-watch";
import { appleWatchMode } from "../domain/apple-watch-feature";
import { buildSession, sessionTemplates } from "../domain/sessions";
import {
  applyWorkoutCommand,
  buildWeek,
  type Preferences,
} from "../domain/planner";
import { editionSessions } from "../domain/editorial";
import { starterEdition } from "../content/free-program";

const seconds = (goal: GoalJson) => {
  if (goal.type !== "time") throw new Error("Expected a time goal");
  expect(goal.time.unit).toBe("seconds");
  return goal.time.value;
};
describe("Apple Watch workout files", () => {
  for (const template of sessionTemplates)
    for (const minutes of [10, 15, 20, 25, 30]) {
      it(`${template.id}: ${minutes} minutes survives binary encoding without losing intervals`, async () => {
        const source = { ...buildSession(template.id, minutes), minutes };
        const before = JSON.stringify(source);
        const { bytes, filename } = await exportAppleWorkout(source);
        expect(filename).toMatch(/^pookie-[a-z0-9-]+\.workout$/);
        const result = decode(bytes).toJSON();
        if (minutes === 10) {
          expect(result.custom).toBeUndefined();
          expect(result.goal!.activity).toBe("walking");
          expect(seconds(result.goal!.goal)).toBe(600);
        } else {
          const custom = result.custom!;
          expect(custom.displayName).toBe(
            `Pookie · ${source.title} · ${minutes} min`,
          );
          expect(custom.activity).toBe("running");
          expect(custom.location).toBe("outdoor");
          const main = custom.blocks.flatMap((block) => {
            expect(block.iterations).toBe(1);
            return block.steps.map(({ purpose, step }) => ({
              action: purpose === "work" ? "jog" : "walk",
              seconds: seconds(step.goal),
            }));
          });
          expect(main).toEqual(
            source.steps
              .slice(1, -1)
              .map(({ action, seconds }) => ({ action, seconds })),
          );
          const duration =
            seconds(custom.warmup!.goal) +
            main.reduce((sum, step) => sum + step.seconds, 0) +
            seconds(custom.cooldown!.goal);
          expect(duration).toBe(minutes * 60);
          expect(seconds(custom.warmup!.goal)).toBe(300);
          expect(seconds(custom.cooldown!.goal)).toBe(300);
        }
        expect(JSON.stringify(source)).toBe(before);
      });
    }
  it("preserves a partial final interval", async () => {
    const source = { ...buildSession("fresh-air", 15), minutes: 15 };
    expect(source.steps.at(-2)!.seconds).toBe(120);
    const decoded = decode((await exportAppleWorkout(source)).bytes).toJSON()
      .custom!;
    expect(decoded.blocks[0].steps.at(-1)!.purpose).toBe("recovery");
    expect(seconds(decoded.blocks[0].steps.at(-1)!.step.goal)).toBe(120);
  });
  it("uses current shortened instructions and stable references without personal data", async () => {
    const preferences: Preferences = {
      acceptedTerms: true,
      experience: "new",
      motivation: "PRIVATE NOTE",
      days: [1, 4],
      minutes: 20,
      timezone: "America/Phoenix",
    };
    const week = buildWeek(preferences, "2026-09-21");
    const run = week.workouts[0];
    const shorter = applyWorkoutCommand(
      week,
      run.id,
      { type: "shorten" },
      preferences,
      Date.parse("2026-09-21T17:00Z"),
    ).workouts[0];
    const first = await exportAppleWorkout({
      title: "My run",
      minutes: run.minutes,
      steps: run.steps!,
    });
    const repeat = await exportAppleWorkout({
      title: "My run",
      minutes: run.minutes,
      steps: run.steps!,
    });
    expect(first.bytes).toEqual(repeat.bytes);
    const updated = decode(
      (
        await exportAppleWorkout({
          title: "My run",
          minutes: shorter.minutes,
          steps: shorter.steps!,
        })
      ).bytes,
    ).toJSON();
    expect(updated.referenceId).not.toBe(decode(first.bytes).referenceId);
    expect(updated.custom!.displayName).toContain("15 min");
    expect(JSON.stringify(updated)).not.toContain("PRIVATE NOTE");
  });
  it("exports all free sessions", async () => {
    for (const session of editionSessions(starterEdition)) {
      expect(
        decode((await exportAppleWorkout(session)).bytes).custom,
      ).toBeDefined();
    }
  });
  it("rejects mismatched duration, nonpositive times, missing steps, and misplaced phases", () => {
    const source = { ...buildSession("tiny-victory", 20), minutes: 20 };
    for (const invalid of [
      { ...source, minutes: 25 },
      { ...source, steps: [] },
      {
        ...source,
        steps: source.steps.map((step, index) =>
          index === 1 ? { ...step, seconds: 0 } : step,
        ),
      },
      { ...source, steps: [...source.steps].reverse() },
      {
        ...source,
        steps: source.steps.map((step, index) =>
          index === 1 ? { ...step, phase: "warm-up" as const } : step,
        ),
      },
    ])
      expect(() =>
        buildAppleWorkout(invalid, "00000000-0000-4000-8000-000000000001"),
      ).toThrow();
  });
  it("fails closed for absent or mistyped release settings", () => {
    for (const value of [undefined, "", "true", "ENABLED", "off"])
      expect(appleWatchMode(value)).toBe("off");
    expect(appleWatchMode("prototype")).toBe("prototype");
    expect(appleWatchMode("enabled")).toBe("enabled");
  });
});
