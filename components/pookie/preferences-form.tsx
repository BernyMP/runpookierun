"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dayNames,
  preferencesSchema,
  type PreferenceDraft,
  type Preferences,
} from "@/domain/planner";
export function PreferencesForm({
  initial = {},
  onDraft,
  onComplete,
  editing = false,
}: {
  initial?: PreferenceDraft;
  onDraft: (draft: PreferenceDraft) => Promise<unknown>;
  onComplete: (preferences: Preferences) => Promise<unknown>;
  editing?: boolean;
}) {
  const [draft, setDraft] = useState<PreferenceDraft>(() => ({
    days: [],
    ...initial,
  }));
  const [saveState, setSaveState] = useState(
    "Your progress saves automatically",
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [changed, setChanged] = useState(false);
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const draftHandler = useRef(onDraft);
  draftHandler.current = onDraft;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draft.timezone)
      setDraft((d) => ({
        ...d,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }));
  }, [draft.timezone]);
  useEffect(() => {
    if (!changed || submitting) return;
    setSaveState("Saving…");
    timer.current = setTimeout(() => {
      pending.current = pending.current
        .catch(() => undefined)
        .then(() => draftHandler.current(draft));
      pending.current.then(
        () => setSaveState("Progress saved"),
        () =>
          setSaveState("Couldn’t save yet. Keep this page open and try again."),
      );
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, changed, submitting]);
  function update(values: PreferenceDraft) {
    setDraft((d) => ({ ...d, ...values }));
    setChanged(true);
    setError("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = preferencesSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setSubmitting(true);
    setError("");
    try {
      await pending.current.catch(() => undefined);
      await onComplete(parsed.data);
      setChanged(false);
      setSaveState(
        editing
          ? "Preferences saved. Changes apply to your next week."
          : "All set!",
      );
    } catch {
      setError("We couldn’t save your setup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="space-y-8"
      aria-label="Running preferences"
    >
      <fieldset disabled={submitting}>
        <legend className="field-label">Where are you starting?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: "new", label: "I’m new to running" },
            { value: "returning", label: "Finding my way back" },
            { value: "regular", label: "I run comfortably" },
          ].map(({ value, label }) => (
            <button
              type="button"
              key={value}
              aria-pressed={draft.experience === value}
              className="choice justify-start"
              onClick={() =>
                update({ experience: value as Preferences["experience"] })
              }
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="field-label" htmlFor="motivation">
          What would you like running to bring you?
        </label>
        <input
          id="motivation"
          value={draft.motivation ?? ""}
          maxLength={160}
          disabled={submitting}
          onChange={(e) => update({ motivation: e.target.value })}
          placeholder="A clearer head, more energy, a little time for me…"
          className="min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-sm"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          A short reason is plenty. Please leave out medical information.
        </p>
      </div>
      <fieldset disabled={submitting}>
        <legend className="field-label">
          Which two or three days work for you?
        </legend>
        <p className="mb-3 text-sm text-muted-foreground">
          Leave a day between runs to recharge.
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <button
              type="button"
              key={day}
              aria-label={dayNames[day]}
              aria-pressed={draft.days?.includes(day) ?? false}
              className="choice px-2"
              onClick={() => {
                const days = draft.days ?? [];
                if (!days.includes(day) && days.length >= 3) {
                  setError("Choose up to three running days.");
                  return;
                }
                update({
                  days: days.includes(day)
                    ? days.filter((d) => d !== day)
                    : [...days, day],
                });
              }}
            >
              {dayNames[day].slice(0, 3)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={submitting}>
        <legend className="field-label">
          How much time do you have for each run?
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {([15, 20, 30] as const).map((minutes) => (
            <button
              type="button"
              key={minutes}
              aria-pressed={draft.minutes === minutes}
              className="choice"
              onClick={() => update({ minutes })}
            >
              {minutes} minutes
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Warm-up and cool-down are included.
        </p>
      </fieldset>
      <div>
        <label htmlFor="timezone" className="field-label">
          Your timezone
        </label>
        <select
          id="timezone"
          value={draft.timezone ?? "UTC"}
          disabled={submitting}
          onChange={(e) => update({ timezone: e.target.value })}
          className="min-h-12 w-full rounded-xl border bg-white px-3 text-sm"
        >
          {Array.from(
            new Set([
              draft.timezone || "UTC",
              "UTC",
              ...Intl.supportedValuesOf("timeZone"),
            ]),
          ).map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="discovery">
          How did you find Pookie?{" "}
          <span className="font-normal">(optional)</span>
        </label>
        <select
          id="discovery"
          className="min-h-12 w-full rounded-xl border bg-white px-3 text-sm"
          disabled={submitting}
          value={draft.discovery ?? ""}
          onChange={(event) =>
            update({
              discovery: (event.target.value ||
                undefined) as Preferences["discovery"],
            })
          }
        >
          <option value="">Prefer not to say</option>
          <option value="search">Google or another search engine</option>
          <option value="ai-search">An AI assistant</option>
          <option value="community">An online community</option>
          <option value="club">A running club</option>
          <option value="friend">A friend</option>
          <option value="waitlist">The waitlist</option>
          <option value="other">Somewhere else</option>
        </select>
      </div>
      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          checked={draft.acceptedTerms === true}
          disabled={submitting}
          onChange={(e) =>
            update({ acceptedTerms: e.target.checked ? true : undefined })
          }
          className="mt-1 h-5 w-5 accent-[#c74c19]"
        />
        <span>
          I’m 18 or over and agree to the{" "}
          <a href="/tos" target="_blank" className="text-primary underline">
            terms
          </a>
          . I’ve read the{" "}
          <a
            href="/privacy-policy"
            target="_blank"
            className="text-primary underline"
          >
            privacy policy
          </a>
          .
        </span>
      </label>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          role="status"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Check className="h-4 w-4" />
          {saveState}
        </p>
        <Button
          type="submit"
          disabled={submitting}
          className="h-12 rounded-xl px-6"
        >
          {submitting
            ? "Saving…"
            : editing
              ? "Save preferences"
              : "Continue to my free trial"}
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}
