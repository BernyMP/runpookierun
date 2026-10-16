"use client";

import { useState } from "react";
import { Check, ArrowUpRight } from "lucide-react";
import dynamic from "next/dynamic";
const WeekView = dynamic(
  () => import("./week-view").then((module) => module.WeekView),
  {
    loading: () => <p role="status">Opening your little preview…</p>,
  },
);
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  applyWorkoutCommand,
  buildWeek,
  formatDay,
  workoutTitle,
  type Preferences,
} from "@/domain/planner";

// This isolated example shares the planner's rules; it never saves or emits conversions.
const preferences: Preferences = {
  acceptedTerms: true,
  experience: "new",
  motivation: "A clearer head",
  days: [1, 4],
  minutes: 20,
  timezone: "America/Phoenix",
};
const sampleDate = "2026-09-21";
const sampleNow = Date.parse("2026-09-21T17:00:00Z");
const makeSample = () => buildWeek(preferences, sampleDate);

export function WeekPeek() {
  const [week, setWeek] = useState(makeSample);
  const firstRun = week.workouts[0];
  return (
    <div className="week-ticket" data-testid="week-peek">
      <div className="ticket-heading">
        <div>
          <p className="eyebrow">THE DOABLE WEEK · SAMPLE</p>
          <h3>You’ve got this, Pookie.</h3>
        </div>
        <span className="ticket-stamp" aria-hidden="true">
          ☺
        </span>
      </div>
      {week.workouts
        .filter(
          (workout, index) =>
            workout.kind !== "rest" || [0, 1, 3, 4].includes(index),
        )
        .map((workout) => {
          return (
            <div className="ticket-row" key={workout.id}>
              <span>
                {formatDay(workout.date, { weekday: "short" }).toUpperCase()}
              </span>
              <span
                className={`ticket-check ${workout.status === "done" ? "is-done" : ""}`}
                aria-hidden="true"
              >
                {workout.status === "done" ? <Check size={18} /> : ""}
              </span>
              <div>
                <strong>
                  {workout.kind === "rest"
                    ? "Room for the rest of life"
                    : workoutTitle(workout)}
                </strong>
                <p>
                  {workout.kind === "rest"
                    ? "Rest day"
                    : workout.status === "done"
                      ? "Done. A little win!"
                      : workout.status === "skipped"
                        ? "Skipped. Onward, without catching up."
                        : `${workout.minutes} min · Easy effort`}
                </p>
              </div>
            </div>
          );
        })}
      <div className="px-5 pt-5 text-sm">
        <p className="font-bold">Busy Monday? Try making a little room.</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            className="min-h-11 font-bold underline underline-offset-4 disabled:opacity-60"
            disabled={firstRun.minutes <= 15 || firstRun.status !== "planned"}
            onClick={() =>
              setWeek(
                applyWorkoutCommand(
                  week,
                  firstRun.id,
                  { type: "shorten" },
                  preferences,
                  sampleNow,
                ),
              )
            }
          >
            Shorten Monday’s run
          </button>
          <button
            className="min-h-11 text-xs underline underline-offset-4"
            onClick={() => setWeek(makeSample())}
          >
            Reset sample
          </button>
        </div>
        <p className="mt-2 text-xs leading-6" role="status">
          {firstRun.kind === "rest"
            ? "Monday is free. Your run has a new spot in the sample week."
            : firstRun.status === "done"
              ? "A little win in your sample week."
              : firstRun.status === "skipped"
                ? "Skipped. No catching up needed."
                : firstRun.minutes < 20
                  ? `20 → ${firstRun.minutes} minutes. A little still counts.`
                  : "Two 20-minute runs, with rest days in between."}
        </p>
      </div>
      <div className="ticket-footer">
        <Dialog>
          <DialogTrigger asChild>
            <button className="text-link min-h-11">
              Peek inside the actual planner <ArrowUpRight />
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto [&>div]:min-w-0 max-sm:[&_.today-main]:grid-cols-1">
            <DialogHeader>
              <DialogTitle>A little look inside Pookie</DialogTitle>
              <DialogDescription>
                Actual planner, sample week. Try moving or shortening a run.
                Nothing here is saved.
              </DialogDescription>
            </DialogHeader>
            <WeekView
              week={week}
              preferences={preferences}
              today={sampleDate}
              headingLevel={2}
              onCommand={async (id, command) =>
                setWeek((previous) =>
                  applyWorkoutCommand(
                    previous,
                    id,
                    command,
                    preferences,
                    sampleNow,
                  ),
                )
              }
            />
          </DialogContent>
        </Dialog>
        <p className="mt-2 font-normal">
          Simplified sample above. Your days, your time, your pace.
        </p>
      </div>
    </div>
  );
}
