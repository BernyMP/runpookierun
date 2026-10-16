"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  editionSessions,
  type EditionDraft,
  type ArticleDraft,
} from "@/domain/editorial";
import { SessionSteps } from "@/components/pookie/session-steps";
import { Button } from "@/components/ui/button";
export default function EditorialPage() {
  const dashboard = useQuery(api.editorial.dashboard);
  const control = useMutation(api.editorial.control);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(
    action: "pause" | "resume" | "enable" | "queue" | "retry" | "rollback",
    values: { runId?: Id<"editorialRuns">; editionId?: string } = {},
  ) {
    setBusy(true);
    setError("");
    try {
      await control({ action, ...values });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "That action failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!dashboard) return <p role="status">Loading Pookie’s editorial desk…</p>;
  return (
    <div className="space-y-7">
      <div className="page-intro">
        <p className="eyebrow">OWNER ONLY</p>
        <h1 className="mt-3">Pookie’s editorial desk</h1>
        <p>
          Weekly programs and The Pookie Post. Drafts need an independent review
          before they can go live.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-accent p-4">
          {error}
        </p>
      )}
      <section className="panel space-y-4">
        <h2 className="text-2xl">
          {dashboard.settings.paused
            ? "Publishing is paused"
            : dashboard.settings.enabled
              ? "Automatic publishing is on"
              : "Preparing the first two editions"}
        </h2>
        <p className="text-sm leading-6">
          Eve writes on your Mac using your ChatGPT membership. Approved
          editions publish Monday at 6 a.m. Phoenix time. An offline Mac pauses
          new writing; it does not stop already approved releases. Queued work
          is picked up by the Friday morning worker.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy} onClick={() => act("queue")}>
            Queue the next two weeks
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => act(dashboard.settings.paused ? "resume" : "pause")}
          >
            {dashboard.settings.paused ? "Resume" : "Pause"}
          </Button>
          {!dashboard.settings.enabled && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => act("enable")}
            >
              Enable reviewed releases
            </Button>
          )}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl">Upcoming and recent work</h2>
        {!dashboard.runs.length && (
          <p>Queue the next two editions to get started.</p>
        )}
        {dashboard.runs.map((run) => (
          <article className="panel space-y-3" key={run.id}>
            <p className="eyebrow">
              {run.editionId} ·{" "}
              {run.kind === "program" ? "Free program" : "Pookie Post"}
            </p>
            <h3 className="text-xl">
              {run.status.replaceAll("-", " ")} · Version {run.version}
            </h3>
            {run.error && <p className="text-sm">{run.error}</p>}
            {run.draft && (
              <details>
                <summary className="font-bold">Read saved draft</summary>
                <DraftPreview kind={run.kind} body={run.draft} />
              </details>
            )}
            {run.reviews.map((review, index) => (
              <p className="text-sm" key={index}>
                Version {review.version}:{" "}
                {review.approved ? "Approved" : "Needs revision"} —{" "}
                {JSON.parse(review.body).notes}
              </p>
            ))}
            {run.status === "failed" && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => act("retry", { runId: run.id })}
              >
                Retry this draft
              </Button>
            )}
          </article>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl">Published editions</h2>
        {dashboard.publications.map((publication) => (
          <article
            key={publication.editionId}
            className="panel flex flex-wrap items-center justify-between gap-4"
          >
            <p>
              {publication.editionId}{" "}
              {publication.withdrawn ? "· withdrawn" : "· published"}
            </p>
            {!publication.withdrawn && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  act("rollback", { editionId: publication.editionId })
                }
              >
                Withdraw this edition
              </Button>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

function DraftPreview({
  kind,
  body,
}: {
  kind: "program" | "article";
  body: string;
}) {
  if (kind === "program") {
    const draft = JSON.parse(body) as EditionDraft;
    return (
      <div className="mt-5 space-y-5">
        <h4 className="text-2xl">{draft.theme}</h4>
        <p>{draft.introduction}</p>
        {editionSessions(draft).map((session) => (
          <section key={session.id} className="rounded-xl border-2 p-4">
            <h5 className="mb-3 text-xl">
              Day {session.day}: {session.title} · {session.minutes} minutes
              {session.optional ? " · optional" : ""}
            </h5>
            <SessionSteps
              steps={session.steps}
              prompt={session.playfulPrompt}
            />
          </section>
        ))}
      </div>
    );
  }
  const draft = JSON.parse(body) as ArticleDraft;
  return (
    <div className="mt-5 space-y-5 text-sm leading-7">
      <h4 className="text-2xl">{draft.title}</h4>
      <p className="font-bold">{draft.summary}</p>
      {draft.sections.map((section) => (
        <section key={section.heading}>
          <h5 className="mb-3 text-xl">{section.heading}</h5>
          {section.paragraphs.map((paragraph, index) => (
            <p className="mb-3" key={index}>
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <ul>
        {draft.sources.map((source) => (
          <li key={source.url}>
            <a
              className="underline"
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
