"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Check, Printer } from "lucide-react";
import { editionSessions, type PublicEdition } from "@/domain/editorial";
import { SessionSteps } from "./session-steps";
import { Button } from "@/components/ui/button";
import { trackPublicEvent } from "./public-analytics";
import { markFirstCompletion } from "@/domain/public-analytics";
import { Pookie } from "./mascot";
import { AppleWatchExport } from "./apple-watch-export";
const progressKey = (id: string) => `pookie:free-week:${id}`;
export function FreeProgram({
  edition,
  archived = false,
}: {
  edition: PublicEdition;
  archived?: boolean;
}) {
  const [done, setDone] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageWorks, setStorageWorks] = useState(true);
  const [previous, setPrevious] = useState<string | null>(null);
  const viewedEdition = useRef<string | null>(null);
  useEffect(() => {
    if (viewedEdition.current !== edition.id) {
      trackPublicEvent("free_plan_viewed", edition.id);
      viewedEdition.current = edition.id;
    }
    try {
      const saved = JSON.parse(
        localStorage.getItem(progressKey(edition.id)) ?? "[]",
      );
      setDone(
        Array.isArray(saved)
          ? saved.filter((id) =>
              ["session-1", "session-2", "session-3"].includes(id),
            )
          : [],
      );
      const last = localStorage.getItem("pookie:free-week:last");
      if (last && /^\d{4}-\d{2}-\d{2}$/.test(last) && last !== edition.id)
        setPrevious(last);
    } catch {
      setStorageWorks(false);
    }
    setReady(true);
  }, [edition.id]);
  function toggle(id: string) {
    if (!done.includes(id)) {
      try {
        if (markFirstCompletion(edition.id, localStorage))
          trackPublicEvent("free_plan_first_completion", edition.id);
      } catch {
        /* Storage is optional. */
      }
    }
    const next = done.includes(id)
      ? done.filter((item) => item !== id)
      : [...done, id];
    setDone(next);
    try {
      localStorage.setItem(progressKey(edition.id), JSON.stringify(next));
      localStorage.setItem("pookie:free-week:last", edition.id);
    } catch {
      setStorageWorks(false);
    }
  }
  return (
    <div className="space-y-7 free-program">
      <div className="panel bg-accent">
        <p className="font-bold">
          Start any day. Leave a rest day between outings.
        </p>
        <p className="mt-2 text-sm leading-7">
          Day 1 and Day 3 are your two little adventures. Day 6 is optional.
          Repeating a week or walking every jogging part is welcome. Use a watch
          or phone timer to follow the steps.
        </p>
        <p className="mt-3 text-xs" role="status">
          {storageWorks
            ? "Checkmarks stay on this browser, without an account. Clearing browser data removes them."
            : "This browser can't save checkmarks. You can still follow the plan and tick them off while this page stays open."}
        </p>
        {previous && !archived && (
          <Link className="text-link mt-3" href={`/try/${previous}`}>
            Finish your previous week →
          </Link>
        )}
        <div className="mt-4 flex flex-wrap gap-4 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={16} /> Print this week
          </Button>
          <Link className="text-link" href={`/try/${edition.id}`}>
            Keep this week’s link →
          </Link>
        </div>
      </div>
      {editionSessions(edition).map((session, index) => (
        <article
          key={session.id}
          className={`program-session panel ${done.includes(session.id) ? "is-complete" : ""}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">
                Day {session.day} ·{" "}
                {session.optional
                  ? "A bonus, if you fancy it"
                  : "Your little outing"}
              </p>
              <h2 className="mt-3 text-3xl">{session.title}</h2>
              <p className="my-4 font-bold">
                {session.minutes} minutes · Easy effort
              </p>
            </div>
            <Pookie
              pose={
                done.includes(session.id)
                  ? "check"
                  : index === 1
                    ? "relief"
                    : "run"
              }
              sizes="100px"
              className="program-mascot"
            />
          </div>
          <p className="mb-5 text-sm leading-7">{session.description}</p>
          <SessionSteps steps={session.steps} prompt={session.playfulPrompt} />
          <AppleWatchExport workout={session} />
          <button
            disabled={!ready}
            aria-pressed={done.includes(session.id)}
            onClick={() => toggle(session.id)}
            className="choice mt-5 gap-2 print:hidden"
          >
            <Check size={18} />
            {done.includes(session.id)
              ? "Done. A little win!"
              : `Mark Day ${session.day} complete`}
          </button>
          <p className="mt-5 text-sm font-bold">
            {index === 2
              ? "And now? Put your feet up, Pookie."
              : "Next: a rest day. Feet up is part of the plan."}
          </p>
        </article>
      ))}
    </div>
  );
}
