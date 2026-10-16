"use client";
import { Sparkle } from "./mascot";
import { useState } from "react";
import { formatDay } from "@/domain/planner";
import config from "@/config";
export function RecentProgress({
  weeks,
}: {
  weeks: { startDate: string; endDate: string; completed: number }[];
}) {
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState(false);
  const freePlanUrl = `https://${config.domainName}/try?utm_source=friend`;
  return (
    <section className="panel space-y-5" aria-labelledby="recent-progress">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 id="recent-progress" className="text-xl font-bold">
            Every run counts.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your last four weeks. A quiet week doesn’t erase the others.
          </p>
        </div>
        <Sparkle className="h-12 w-12 shrink-0 text-primary" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {weeks.map((week, index) => (
          <div key={week.startDate} className="progress-tile">
            <p className="text-xs text-muted-foreground">
              {index === 0
                ? "This week"
                : formatDay(week.startDate, { month: "short", day: "numeric" })}
            </p>
            <p className="mt-2 font-display text-4xl font-bold">
              {week.completed}{" "}
              <span className="text-sm font-normal">
                {week.completed === 1 ? "run" : "runs"}
              </span>
            </p>
          </div>
        ))}
      </div>
      {weeks.reduce((sum, week) => sum + week.completed, 0) >= 3 && (
        <p className="text-sm leading-7">
          You’ve shown up at least three times.{" "}
          <a
            className="text-primary underline"
            href={`mailto:${config.supportEmail}?subject=My%20first%20runs%20with%20Pookie`}
          >
            Tell us how it’s going
          </a>
          , or{" "}
          <button
            className="text-primary underline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(freePlanUrl);
                setShared(true);
                setShareError(false);
              } catch {
                setShareError(true);
              }
            }}
          >
            {shared
              ? "Free plan link copied"
              : "share the free plan with a friend"}
          </button>
          .
        </p>
      )}
      {shared && (
        <p role="status" className="text-xs text-muted-foreground">
          Ready to paste into a message to your friend.
        </p>
      )}
      {shareError && (
        <label className="block text-sm">
          Copy this link to share
          <input
            aria-label="Free plan link"
            className="mt-2 w-full rounded-xl border p-3"
            readOnly
            value={freePlanUrl}
            onFocus={(event) => event.target.select()}
          />
        </label>
      )}
    </section>
  );
}
