import { Duration, Step, TimeGoal, WorkoutPlan } from "@bibixx/workoutkit";
import { encode } from "@bibixx/workoutkit/encode";
import { z } from "zod";
import type { SessionStep } from "./sessions";

export type WatchWorkout = {
  title: string;
  minutes: number;
  steps: readonly SessionStep[];
};
const workoutSchema = z.object({
  title: z.string().trim().min(1).max(160),
  minutes: z.number().int().min(10).max(30).multipleOf(5),
  steps: z
    .array(
      z.object({
        phase: z.enum(["warm-up", "main", "cool-down"]),
        action: z.enum(["walk", "jog"]),
        seconds: z.number().int().positive().max(1800),
      }),
    )
    .min(2)
    .max(100),
});
function validatedWorkout(input: WatchWorkout) {
  const workout = workoutSchema.parse(input);
  const { steps } = workout;
  if (
    steps[0].phase !== "warm-up" ||
    steps[0].action !== "walk" ||
    steps.at(-1)!.phase !== "cool-down" ||
    steps.at(-1)!.action !== "walk" ||
    steps.slice(1, -1).some((step) => step.phase !== "main") ||
    steps.reduce((total, step) => total + step.seconds, 0) !==
      workout.minutes * 60
  )
    throw new Error(
      "This workout’s steps do not match its duration. Refresh and try again.",
    );
  return workout;
}

export function buildAppleWorkout(input: WatchWorkout, referenceId: string) {
  const workout = validatedWorkout(input);
  const plan = new WorkoutPlan({ referenceId });
  const time = (seconds: number) =>
    new TimeGoal(new Duration(seconds, "seconds"));
  if (workout.steps.every((step) => step.action === "walk")) {
    // Apple single-goal workouts have no custom display name.
    plan.asGoal({
      activity: "walking",
      location: "outdoor",
      goal: time(workout.minutes * 60),
    });
    return plan;
  }
  const custom = plan.asCustom({
    activity: "running",
    location: "outdoor",
    displayName: `Pookie · ${workout.title} · ${workout.minutes} min`,
  });
  custom.warmup = new Step(time(workout.steps[0].seconds), "Warm-up walk");
  const block = custom.addBlock(1);
  for (const step of workout.steps.slice(1, -1)) {
    block.addStep(
      step.action === "jog" ? "work" : "recovery",
      time(step.seconds),
      step.action === "jog" ? "Easy jog" : "Walk",
    );
  }
  custom.cooldown = new Step(
    time(workout.steps.at(-1)!.seconds),
    "Cool-down walk",
  );
  return plan;
}

export async function exportAppleWorkout(input: WatchWorkout) {
  const workout = validatedWorkout(input);
  // Stable content-derived UUID: identical downloads keep their reference;
  // shortened/changed workouts get a new reference. No account identifiers.
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(workout)),
    ),
  );
  digest[6] = (digest[6] & 0x0f) | 0x80;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = Array.from(digest.slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const referenceId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const slug =
    workout.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "workout";
  return {
    bytes: encode(buildAppleWorkout(workout, referenceId)),
    filename: `pookie-${slug}-${workout.minutes}min.workout`,
  };
}
