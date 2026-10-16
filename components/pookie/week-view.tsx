"use client";
import { useState } from "react";
import {
  Check,
  ChevronRight,
  Coffee,
  Footprints,
  ArrowRight,
  Minus,
  CalendarDays,
} from "lucide-react";
import { Pookie } from "./mascot";
import { SessionSteps } from "./session-steps";
import { AppleWatchExport } from "./apple-watch-export";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDay,
  validMoveDates,
  workoutTitle,
  type Preferences,
  type Week,
  type Workout,
  type WorkoutCommand,
} from "@/domain/planner";
export function WeekView({
  week,
  preferences,
  today,
  readOnly = false,
  onCommand,
  headingLevel = 1,
}: {
  headingLevel?: 1 | 2;
  week: Week;
  preferences: Preferences;
  today: string;
  readOnly?: boolean;
  onCommand: (id: string, command: WorkoutCommand) => Promise<void>;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const completed = week.workouts.filter(
    (w) => w.kind !== "rest" && w.status === "done",
  ).length;
  const total = week.workouts.filter((w) => w.kind !== "rest").length;
  const todaysWorkout = week.workouts.find((w) => w.date === today);
  const selected = week.workouts.find((w) => w.id === selectedId);
  const expired = today > week.endDate;
  const locked = readOnly || expired;
  async function act(workout: Workout, command: WorkoutCommand) {
    setBusy(true);
    setError("");
    try {
      await onCommand(workout.id, command);
      setMoving(false);
      if (command.type !== "done") setSelectedId(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn’t update this run. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-7">
      <div className="week-heading">
        <div>
          <p className="eyebrow">
            {expired ? "Your last week" : "Your week, your pace"}
          </p>
          <Heading className="mt-3 text-4xl font-bold tracking-tight">
            Your little running era.
          </Heading>
          <p className="mt-3 text-sm text-muted-foreground">
            {formatDay(week.startDate, { month: "short", day: "numeric" })} –{" "}
            {formatDay(week.endDate, { month: "short", day: "numeric" })}
          </p>
        </div>
        <span className="run-count">
          {completed} of {total} runs done
        </span>
      </div>
      <section
        className={`today-card ${todaysWorkout?.status === "done" ? "is-done" : todaysWorkout?.kind === "rest" ? "is-rest" : ""}`}
      >
        <div className="today-main">
          <div className="today-copy">
            <p className="eyebrow">
              {expired
                ? "A FRESH CHAPTER AWAITS"
                : todaysWorkout?.status === "done"
                  ? "HEY, LOOK AT YOU GO!"
                  : todaysWorkout?.kind === "rest"
                    ? "TODAY’S BIG PLAN: RECHARGE"
                    : "TODAY’S LITTLE ADVENTURE"}
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight">
              {todaysWorkout
                ? todaysWorkout.status === "done"
                  ? "You showed up. That counts."
                  : todaysWorkout.kind === "rest"
                    ? "Feet up, Pookie."
                    : workoutTitle(todaysWorkout)
                : "Ready when you are."}
            </h2>
            <p className="mt-3 text-sm leading-7">
              {todaysWorkout?.status === "done"
                ? "One run in the books. Take a breath, enjoy that little win, and let Pookie do the cheering."
                : todaysWorkout?.kind === "rest"
                  ? "Even Pookie puts their feet up. Today is for recharging. Your next little adventure can wait."
                  : (todaysWorkout?.description ??
                    "Your last week is safely tucked away. Pick what feels good for your next one.")}
            </p>
          </div>
          <div className="today-portrait">
            <Pookie
              pose={
                expired
                  ? "calendar"
                  : todaysWorkout?.status === "done"
                    ? "check"
                    : todaysWorkout?.kind === "rest"
                      ? "rest"
                      : todaysWorkout?.status === "skipped"
                        ? "relief"
                        : "run"
              }
              sizes="(max-width: 640px) 80px, 160px"
            />
          </div>
        </div>
        {todaysWorkout && todaysWorkout.kind !== "rest" && (
          <div className="today-actions">
            <span className="text-sm font-bold">
              {todaysWorkout.minutes} minutes · Easy effort
            </span>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setSelectedId(todaysWorkout.id);
                setError("");
              }}
            >
              View run <ArrowRight />
            </Button>
          </div>
        )}
      </section>
      <section aria-label="Your seven-day plan" className="week-list">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Your week, with wiggle room.</h2>
          <span aria-hidden="true" className="text-xl">
            ✳
          </span>
        </div>
        {week.workouts.map((workout) => (
          <button
            key={workout.id}
            onClick={() => {
              setSelectedId(workout.id);
              setMoving(false);
              setError("");
            }}
            className={`flex min-h-20 w-full items-center gap-4 border-b px-5 py-4 text-left last:border-b-0 hover:bg-muted/50 sm:px-6 ${workout.date === today ? "is-today" : ""}`}
            aria-label={`${formatDay(workout.date)}, ${workoutTitle(workout)}, ${workout.status}`}
          >
            <span className="w-12 shrink-0 text-xs text-muted-foreground">
              <span className="block font-bold uppercase">
                {formatDay(workout.date, { weekday: "short" })}
              </span>
              <span className="mt-1 block">
                {formatDay(workout.date, { month: "short", day: "numeric" })}
              </span>
            </span>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${workout.status === "done" ? "bg-[#e8eee2] text-[#49633a]" : "bg-muted text-muted-foreground"}`}
            >
              {workout.status === "done" ? (
                <Check className="h-4 w-4" />
              ) : workout.kind === "rest" ? (
                <Coffee className="h-4 w-4" />
              ) : workout.status === "skipped" ? (
                <Minus className="h-4 w-4" />
              ) : (
                <Footprints className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {workoutTitle(workout)}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {workout.status === "skipped"
                  ? "Skipped. Onward, without catching up."
                  : workout.status === "done"
                    ? "Done. A little win!"
                    : workout.kind === "rest"
                      ? "Rest day"
                      : `${workout.minutes} minutes · Easy effort`}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </section>
      <p className="px-2 text-center text-sm leading-6 text-muted-foreground">
        {week.summary}
      </p>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !busy) setSelectedId(null);
        }}
      >
        <DialogContent className="pookie-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selected && workoutTitle(selected)}
            </DialogTitle>
            <DialogDescription>
              {selected &&
                formatDay(selected.date, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              {selected.status === "done" && (
                <div className="completion-note" role="status">
                  <Pookie
                    pose={selected.effort === "hard" ? "relief" : "check"}
                    sizes="72px"
                  />
                  <div>
                    <p className="font-display text-xl font-bold">
                      A little run. A big high-five.
                    </p>
                    <p className="mt-1 text-xs leading-5">
                      You made some room for yourself today.
                    </p>
                  </div>
                </div>
              )}
              {selected.kind === "rest" && (
                <Pookie
                  pose="rest"
                  className="mx-auto max-w-40 rounded-full border-2"
                  sizes="160px"
                />
              )}
              <p className="text-sm leading-7 text-muted-foreground">
                {selected.description}
              </p>
              <SessionSteps
                steps={selected.steps}
                prompt={selected.playfulPrompt}
              />
              {!locked &&
                selected.kind !== "rest" &&
                selected.status === "planned" &&
                selected.steps && (
                  <AppleWatchExport
                    key={`${selected.id}-${selected.minutes}`}
                    workout={{
                      title: workoutTitle(selected),
                      minutes: selected.minutes,
                      steps: selected.steps,
                    }}
                  />
                )}
              {selected.kind !== "rest" && (
                <p className="font-semibold">
                  {selected.minutes} minutes · Easy effort
                </p>
              )}
              {error && (
                <p role="alert" className="text-sm text-red-800">
                  {error}
                </p>
              )}
              {locked && (
                <p className="rounded-xl bg-muted p-3 text-sm">
                  {readOnly
                    ? "Your week is saved. Renew your subscription to make changes."
                    : "This week is saved in your history."}
                </p>
              )}
              {!locked &&
                selected.kind !== "rest" &&
                selected.status === "planned" && (
                  <div className="space-y-3">
                    <Button
                      disabled={busy || selected.date > today}
                      className="h-12 w-full rounded-xl"
                      onClick={() => act(selected, { type: "done" })}
                    >
                      <Check />I did it
                    </Button>
                    {selected.date > today && (
                      <p className="text-center text-xs text-muted-foreground">
                        Come back after your run to mark it done.
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        disabled={
                          busy ||
                          selected.minutes <= 10 ||
                          selected.date < today
                        }
                        onClick={() => act(selected, { type: "shorten" })}
                        className="h-11 rounded-xl"
                      >
                        <Minus />
                        Shorten
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy || selected.date < today}
                        onClick={() => setMoving(!moving)}
                        className="h-11 rounded-xl"
                      >
                        <CalendarDays />
                        Move
                      </Button>
                    </div>
                    {moving && (
                      <div className="rounded-xl bg-muted p-4">
                        <p className="mb-3 text-sm font-semibold">
                          Choose a day you can run
                        </p>
                        {validMoveDates(week, selected.id, today, preferences)
                          .length ? (
                          <div className="flex flex-wrap gap-2">
                            {validMoveDates(
                              week,
                              selected.id,
                              today,
                              preferences,
                            ).map((date) => (
                              <Button
                                variant="outline"
                                key={date}
                                disabled={busy}
                                onClick={() =>
                                  act(selected, {
                                    type: "move",
                                    targetDate: date,
                                  })
                                }
                              >
                                {formatDay(date)}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            There isn’t another day with enough recovery room
                            this week. Shortening or skipping is okay.
                          </p>
                        )}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      className="h-11 w-full"
                      disabled={busy}
                      onClick={() => act(selected, { type: "skip" })}
                    >
                      Skip this run — no catching up
                    </Button>
                  </div>
                )}
              {!locked && selected.status === "done" && (
                <div className="rounded-2xl bg-[#eef2e9] p-4">
                  <p className="font-semibold">How did it feel?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optional. A little note for your next-week check-in.
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {(["easy", "okay", "hard"] as const).map((effort) => (
                      <button
                        key={effort}
                        className="choice bg-white capitalize"
                        aria-pressed={selected.effort === effort}
                        disabled={busy}
                        onClick={() =>
                          act(selected, { type: "effort", effort })
                        }
                      >
                        {effort[0].toUpperCase() + effort.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selected.status === "skipped" && (
                <p className="text-sm text-muted-foreground">
                  No catching up needed. Your next run is a fresh start.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
