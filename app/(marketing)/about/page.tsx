import Link from "next/link";
import { MarketingShell } from "@/components/pookie/marketing-shell";
import { pageMetadata } from "@/libs/metadata";
import config, { priceLabel } from "@/config";
export const metadata = pageMetadata(
  "About Pookie and our running guides",
  "Meet Run Pookie Run: a flexible running planner for returning adults, built by Web Shinobi, with sourced guides and a free weekly plan.",
  "/about",
);
export default function About() {
  return (
    <MarketingShell>
      <main id="main" className="app-width space-y-9 pb-20 pt-10">
        <header className="page-intro">
          <p className="eyebrow">A LITTLE RUNNING. A LOT OF REAL LIFE.</p>
          <h1 className="mt-4 text-4xl">About Run Pookie Run</h1>
          <p className="mt-6 leading-8">
            Pookie is a browser-based running planner for busy adults getting
            back into a casual routine. Pick a manageable week, make room for
            changes, and keep showing up in your own way.
          </p>
        </header>
        <section className="space-y-4">
          <h2 className="text-2xl">Made by Web Shinobi</h2>
          <p className="leading-8">
            Run Pookie Run is made by Web Shinobi, LLC. Questions, corrections,
            and feedback go directly to{" "}
            <a className="underline" href={`mailto:${config.supportEmail}`}>
              {config.supportEmail}
            </a>
            .
          </p>
        </section>
        <section className="space-y-4">
          <h2 className="text-2xl">Start with a free week</h2>
          <p className="leading-8">
            The{" "}
            <Link className="underline" href="/try">
              free weekly running plan
            </Link>{" "}
            has two core outings and an optional third. Start any day, leave
            rest days between outings, and use the walking alternatives.
            Checkmarks stay in your browser. No account or card is needed.
          </p>
          <p className="leading-8">
            A personal plan saves your available days, time limit, and history,
            with controls to move, shorten, or skip sessions. It costs{" "}
            {priceLabel} USD/month after an eligible seven-day, card-required
            trial. Read the{" "}
            <Link className="underline" href="/pricing">
              pricing and cancellation details
            </Link>
            .
          </p>
        </section>
        <section className="space-y-4">
          <h2 className="text-2xl">How our guides are made</h2>
          <p className="leading-8">
            Our guides answer practical questions about returning to running and
            fitting a routine around life. Weekly articles are prepared with AI
            assistance and checked by a separate automated reviewer before
            publication. That review is not a medical or coaching qualification.
          </p>
          <p className="leading-8">
            The weekly workflow checks cited primary sources, accuracy, useful
            examples, and whether the topic adds something distinct. Session
            timings come from validated templates. Sources appear with the
            article; corrections change the content rather than simply
            refreshing a date. Contact us if something needs a closer look.
          </p>
        </section>
        <section className="space-y-4">
          <h2 className="text-2xl">A planning companion</h2>
          <p className="leading-8">
            Pookie uses preset planning rules. It does not offer live coaching,
            GPS recording, watch sync, a live interval timer, race-specific
            training, or injury rehabilitation. The guides provide general
            information for adults; they do not assess your readiness to
            exercise.
          </p>
          <Link className="text-link" href="/guides/getting-back-into-running">
            Find your starting point →
          </Link>
        </section>
      </main>
    </MarketingShell>
  );
}
