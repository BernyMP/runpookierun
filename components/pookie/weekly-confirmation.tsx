"use client";
import { Pookie } from "./mascot";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  approvedDuration,
  type Preferences,
  type Week,
  type WeeklyChoice,
  dayNames,
} from "@/domain/planner";

export function WeeklyConfirmation({
  preferences,
  previous,
  onConfirm,
}: {
  preferences: Preferences;
  previous: Week;
  onConfirm: (choice: WeeklyChoice) => Promise<unknown>;
}) {
  const baseline = approvedDuration(preferences, previous);
  const [choice, setChoice] = useState<WeeklyChoice>({ type: "keep" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hard = previous.workouts.some((run) => run.effort === "hard");
  return (
    <section className="panel space-y-5" aria-labelledby="next-week-heading">
      <div className="flex items-center justify-between gap-5">
        <div>
          <p className="eyebrow">NEW WEEK. SAME BIG HEART.</p>
          <h2 id="next-week-heading" className="mt-3 text-3xl font-bold">
            What fits this week?
          </h2>
        </div>
        <Pookie
          pose={hard ? "tired" : "calendar"}
          className="w-24 shrink-0 rounded-full border-2"
          sizes="96px"
        />
      </div>
      <p className="text-sm leading-7 text-muted-foreground">
        Your previous runs are saved. Missed sessions don’t become homework.
        Choose what feels manageable now.
      </p>
      {hard && (
        <p className="rounded-xl bg-accent p-3 text-sm">
          You marked a run as hard last week. An easier week is available if you
          want it.
        </p>
      )}
      <div className="space-y-2" role="group" aria-label="Next week’s duration">
        <button
          disabled={busy}
          className="choice w-full justify-start"
          aria-pressed={choice.type === "keep"}
          onClick={() => setChoice({ type: "keep" })}
        >
          Keep my routine · {baseline} minutes
        </button>
        <button
          disabled={busy || baseline === 10}
          className="choice w-full justify-start disabled:opacity-50"
          aria-pressed={choice.type === "easier"}
          onClick={() => setChoice({ type: "easier" })}
        >
          An easier week · {Math.max(10, baseline - 5)} minutes
        </button>
        <button
          disabled={busy}
          className="choice w-full justify-start"
          aria-pressed={choice.type === "choose"}
          onClick={() => setChoice({ type: "choose", minutes: baseline })}
        >
          Choose my session length
        </button>
      </div>
      {choice.type === "choose" && (
        <div>
          <label className="field-label" htmlFor="next-week-minutes">
            Minutes per session, including walking
          </label>
          <select
            id="next-week-minutes"
            disabled={busy}
            className="min-h-12 w-full rounded-xl border bg-white px-3"
            value={choice.minutes}
            onChange={(event) =>
              setChoice({ type: "choose", minutes: Number(event.target.value) })
            }
          >
            {[10, 15, 20, 25, 30]
              .filter((minutes) => minutes <= preferences.minutes)
              .map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            Your saved limit is {preferences.minutes} minutes. Pookie only
            increases session length when you explicitly choose it.
          </p>
        </div>
      )}
      <p className="text-sm">
        Running days: {preferences.days.map((day) => dayNames[day]).join(", ")}.{" "}
        <Link href="/pookie/account" className="text-primary underline">
          Change my days
        </Link>
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      <Button
        disabled={busy}
        className="h-12 w-full rounded-xl"
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await onConfirm(choice);
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Couldn’t start your week. Please try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving your week…" : "Confirm my next week"}
      </Button>
    </section>
  );
}
