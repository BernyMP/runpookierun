import { z } from "zod";
import { buildSession, pickSession, type SessionStep } from "./sessions";

export const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const timezoneSchema = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}, "Choose a valid timezone.");
export const preferencesSchema = z
  .object({
    acceptedTerms: z.literal(true, {
      errorMap: () => ({
        message: "Please confirm you are 18 or over and accept the terms.",
      }),
    }),
    experience: z.enum(["new", "returning", "regular"]),
    motivation: z
      .string()
      .trim()
      .min(1, "Tell Pookie your reason for running.")
      .max(160),
    days: z.array(z.number().int().min(0).max(6)).min(2).max(3),
    minutes: z.union([z.literal(15), z.literal(20), z.literal(30)]),
    timezone: timezoneSchema,
    discovery: z
      .enum([
        "search",
        "ai-search",
        "community",
        "club",
        "friend",
        "waitlist",
        "other",
      ])
      .optional(),
  })
  .superRefine(({ days }, ctx) => {
    if (new Set(days).size !== days.length)
      ctx.addIssue({
        code: "custom",
        path: ["days"],
        message: "Choose different days.",
      });
    if (days.some((day) => days.includes((day + 1) % 7)))
      ctx.addIssue({
        code: "custom",
        path: ["days"],
        message: "Leave a rest day between runs, including Sunday and Monday.",
      });
  });
export type Preferences = z.infer<typeof preferencesSchema>;
export type PreferenceDraft = Partial<Preferences>;
export type Effort = "easy" | "okay" | "hard";
export type Workout = {
  id: string;
  date: string;
  kind: "run" | "run-walk" | "rest";
  minutes: number;
  description: string;
  status: "planned" | "done" | "skipped";
  effort?: Effort;
  completedAt?: number;
  templateId?: string;
  title?: string;
  steps?: SessionStep[];
  playfulPrompt?: string;
};
export type Week = {
  startDate: string;
  endDate: string;
  timezone: string;
  previousRunDate?: string;
  workouts: Workout[];
  summary: string;
  approvedMinutes?: number;
};

export const weeklyChoiceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("keep") }).strict(),
  z.object({ type: z.literal("easier") }).strict(),
  z
    .object({
      type: z.literal("choose"),
      minutes: z.number().int().min(10).max(30).multipleOf(5),
    })
    .strict(),
]);
export type WeeklyChoice = z.infer<typeof weeklyChoiceSchema>;

export function approvedDuration(
  preferences: Preferences,
  previous?: Pick<Week, "workouts" | "approvedMinutes">,
) {
  const runs = previous?.workouts.filter((w) => w.kind !== "rest") ?? [];
  const baseline =
    previous?.approvedMinutes ??
    (runs.length
      ? Math.min(...runs.map((w) => w.minutes))
      : preferences.minutes);
  return Math.max(10, Math.min(preferences.minutes, baseline));
}

export function nextWeekDuration(
  preferences: Preferences,
  previous: Pick<Week, "workouts" | "approvedMinutes"> | undefined,
  choice: WeeklyChoice = { type: "keep" },
) {
  const parsed = weeklyChoiceSchema.parse(choice);
  const baseline = approvedDuration(preferences, previous);
  if (parsed.type === "choose") {
    if (parsed.minutes > preferences.minutes)
      throw new Error("Choose a duration within your saved time limit.");
    return parsed.minutes;
  }
  return parsed.type === "easier" ? Math.max(10, baseline - 5) : baseline;
}

export function localDate(now: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new Error("Invalid date.");
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
export function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}
export function formatDay(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  },
) {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
export function workoutTitle(workout: Workout) {
  if (workout.title) return workout.title;
  return workout.kind === "rest"
    ? "Room to recharge"
    : workout.kind === "run-walk"
      ? "Easy run / walk"
      : "An easy run";
}
export function sessionDescription(
  kind: Workout["kind"],
  minutes: number,
): string {
  if (kind === "rest")
    return "Take the day off. A gentle walk is optional, never homework.";
  const middle = Math.max(0, minutes - 6);
  return kind === "run-walk"
    ? `Walk for 3 minutes to warm up. For ${middle} minutes, alternate 1 minute of gentle jogging with 2 minutes of walking. Walk for 3 minutes to finish. Keep it comfortable; walking the whole session is okay.`
    : `Walk for 3 minutes to warm up, jog at a conversational effort for ${middle} minutes, then walk for 3 minutes to finish. Walk sooner whenever you need to.`;
}

export function buildWeek(
  preferences: Preferences,
  startDate: string,
  previous?: Workout[],
  confirmation?: { choice: WeeklyChoice; approvedMinutes?: number },
): Week {
  const p = preferencesSchema.parse(preferences);
  const previousRuns = previous?.filter((w) => w.kind !== "rest") ?? [];
  const completed = previousRuns.filter((w) => w.status === "done");
  const needsEasier = confirmation?.choice.type === "easier";
  const minutes = nextWeekDuration(
    p,
    previous
      ? { workouts: previous, approvedMinutes: confirmation?.approvedMinutes }
      : undefined,
    confirmation?.choice,
  );
  const previousRunDate = completed
    .map((w) => w.date)
    .sort()
    .at(-1);
  const kind =
    p.experience === "regular" &&
    !needsEasier &&
    !previousRuns.some((w) => w.kind === "run-walk")
      ? "run"
      : "run-walk";
  let sessionOrdinal = 0;
  const workouts: Workout[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startDate, index);
    // A changed schedule must also respect the preceding week's actual last run.
    const previousDayRun = previous?.some(
      (w) =>
        w.date === addDays(date, -1) &&
        w.kind !== "rest" &&
        w.status === "done",
    );
    const isRun = p.days.includes(dayOfWeek(date)) && !previousDayRun;
    return {
      id: date,
      date,
      kind: isRun ? kind : "rest",
      minutes: isRun ? minutes : 0,
      description: sessionDescription(isRun ? kind : "rest", minutes),
      status: "planned",
      ...(isRun
        ? buildSession(pickSession(kind, sessionOrdinal++), minutes)
        : {}),
    };
  });
  return {
    startDate,
    endDate: addDays(startDate, 6),
    timezone: p.timezone,
    approvedMinutes: minutes,
    ...(previousRunDate ? { previousRunDate } : {}),
    workouts,
    summary: needsEasier
      ? "A gentler week. Pick up where you are, without catching up."
      : "A little movement, plenty of breathing room. One run at a time.",
  };
}

// The model selects from an allowlist. It never supplies durations, dates, or workout instructions.
export const personalizationSchema = z
  .object({
    encouragement: z.string().trim().min(1).max(220),
    sessions: z
      .array(
        z
          .object({ id: z.string(), template: z.enum(["run", "run-walk"]) })
          .strict(),
      )
      .max(3),
  })
  .strict();
export function personalizeWeek(week: Week, raw: unknown): Week {
  const result = personalizationSchema.parse(raw);
  const runs = week.workouts.filter((w) => w.kind !== "rest");
  if (
    result.sessions.length !== runs.length ||
    new Set(result.sessions.map((s) => s.id)).size !== runs.length
  )
    throw new Error("Incomplete personalization.");
  for (const choice of result.sessions) {
    const workout = runs.find((w) => w.id === choice.id);
    if (!workout || (workout.kind === "run-walk" && choice.template === "run"))
      throw new Error("Invalid workout choice.");
  }
  return {
    ...week,
    summary: result.encouragement,
    workouts: week.workouts.map((workout) => {
      const choice = result.sessions.find((s) => s.id === workout.id);
      return choice
        ? {
            ...workout,
            kind: choice.template,
            description: sessionDescription(choice.template, workout.minutes),
          }
        : workout;
    }),
  };
}

export type WorkoutCommand =
  | { type: "done"; effort?: Effort }
  | { type: "effort"; effort: Effort }
  | { type: "shorten" }
  | { type: "move"; targetDate: string }
  | { type: "skip" };
export function validMoveDates(
  week: Week,
  workoutId: string,
  today: string,
  _preferences: Preferences,
): string[] {
  const workout = week.workouts.find((w) => w.id === workoutId);
  if (
    !workout ||
    workout.kind === "rest" ||
    workout.status !== "planned" ||
    workout.date < today
  )
    return [];
  // Selecting a new day explicitly changes availability for this run only.
  return week.workouts
    .filter(
      (target) =>
        target.kind === "rest" &&
        target.date >= today &&
        (!week.previousRunDate ||
          target.date > addDays(week.previousRunDate, 1)) &&
        !week.workouts.some(
          (other) =>
            other.id !== workoutId &&
            other.kind !== "rest" &&
            other.status !== "skipped" &&
            (other.date === addDays(target.date, -1) ||
              other.date === addDays(target.date, 1)),
        ),
    )
    .map((w) => w.date);
}
export function applyWorkoutCommand(
  week: Week,
  workoutId: string,
  command: WorkoutCommand,
  preferences: Preferences,
  now: number,
): Week {
  const today = localDate(now, week.timezone);
  const found = week.workouts.find((w) => w.id === workoutId);
  if (!found || found.kind === "rest") throw new Error("Run not found.");
  if (today > week.endDate)
    throw new Error("This week has ended. Your history is saved.");
  if (command.type === "effort") {
    if (found.status !== "done")
      throw new Error("Complete the run before adding feedback.");
    return {
      ...week,
      workouts: week.workouts.map((w) =>
        w.id === workoutId ? { ...w, effort: command.effort } : w,
      ),
    };
  }
  if (found.status !== "planned") {
    if (
      (command.type === "done" && found.status === "done") ||
      (command.type === "skip" && found.status === "skipped")
    )
      return week;
    throw new Error("This run is already recorded.");
  }
  if (command.type === "done") {
    if (found.date > today)
      throw new Error("Future runs cannot be marked done.");
    return {
      ...week,
      workouts: week.workouts.map((w) =>
        w.id === workoutId
          ? {
              ...w,
              status: "done",
              completedAt: now,
              ...(command.effort ? { effort: command.effort } : {}),
            }
          : w,
      ),
    };
  }
  if (command.type === "skip")
    return {
      ...week,
      workouts: week.workouts.map((w) =>
        w.id === workoutId ? { ...w, status: "skipped" } : w,
      ),
    };
  if (found.date < today)
    throw new Error("Past runs cannot be moved or shortened.");
  if (command.type === "shorten") {
    if (found.minutes <= 10)
      throw new Error("Already at the shortest session. You can skip instead.");
    return {
      ...week,
      workouts: week.workouts.map((w) =>
        w.id === workoutId
          ? {
              ...w,
              minutes: Math.max(10, w.minutes - 5),
              ...(w.templateId
                ? buildSession(w.templateId, Math.max(10, w.minutes - 5))
                : {
                    description: sessionDescription(
                      w.kind,
                      Math.max(10, w.minutes - 5),
                    ),
                  }),
            }
          : w,
      ),
    };
  }
  if (
    !validMoveDates(week, workoutId, today, preferences).includes(
      command.targetDate,
    )
  )
    throw new Error("Choose an available day with room to recover.");
  // Keep identifiers attached to the workout, not its calendar slot.
  return {
    ...week,
    workouts: week.workouts
      .map((w) =>
        w.id === workoutId
          ? { ...w, date: command.targetDate }
          : w.date === command.targetDate
            ? { ...w, date: found.date }
            : w,
      )
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
