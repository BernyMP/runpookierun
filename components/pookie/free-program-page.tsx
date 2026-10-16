import Link from "next/link";
import { priceLabel } from "@/config";
import type { PublicEdition } from "@/domain/editorial";
import { MarketingShell } from "./marketing-shell";
import { FreeProgram } from "./free-program";
import { Button } from "@/components/ui/button";
export function FreeProgramPage({
  edition,
  archived = false,
  unavailable = false,
  editions = [],
}: {
  edition: PublicEdition;
  archived?: boolean;
  unavailable?: boolean;
  editions?: PublicEdition[];
}) {
  return (
    <MarketingShell>
      <main id="main" className="app-width space-y-9 pb-20 pt-8">
        <div className="page-intro">
          <p className="eyebrow">
            YOUR FREE WEEKLY PLAN · NO ACCOUNT. NO CARD.
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl">
            {archived ? "Free running week" : "Free weekly running plan"}
          </h1>
          <p className="text-2xl font-bold">{edition.theme}</p>
          <p>{edition.introduction}</p>
          <p className="text-xs">
            {edition.articleSlug
              ? `Edition of ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Phoenix" }).format(edition.publishedAt)}`
              : "The starter week · Join whenever you're ready"}
          </p>
        </div>
        {unavailable && (
          <p role="status" className="rounded-2xl bg-accent p-4 text-sm">
            We couldn’t load the latest edition. The starter week below is ready
            to follow.
          </p>
        )}
        {archived && (
          <Link className="text-link" href="/try">
            See the latest free week →
          </Link>
        )}
        <FreeProgram key={edition.id} edition={edition} archived={archived} />
        <p className="text-xs leading-6 text-muted-foreground">
          General running guidance for adults, with warm-up and cool-down
          walking included. If you are concerned about starting exercise, seek
          appropriate professional advice.{" "}
          <a
            className="underline"
            href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/"
          >
            Read the NHS guidance.
          </a>
        </p>
        {edition.articleSlug && (
          <Link
            className="guide-banner"
            href={`/guides/${edition.articleSlug}`}
          >
            A little reading for this week →
          </Link>
        )}
        {editions.length > 1 && (
          <nav aria-label="Previous free programs">
            <h2 className="text-2xl">More little adventures</h2>
            <ul className="mt-4 space-y-3">
              {editions
                .filter((item) => item.id !== edition.id)
                .map((item) => (
                  <li key={item.id}>
                    <Link className="underline" href={`/try/${item.id}`}>
                      {item.theme}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        )}
        <section className="panel paid-program-cta space-y-4 text-center">
          <h2 className="text-3xl">Your week. With more you in it.</h2>
          <p className="text-sm leading-7">
            Free follows the shared week. Paid fits the week to your available
            days, time limit, and experience—with adjustments and saved history.
          </p>
          <Button asChild className="h-12 rounded-full px-7">
            <Link href="/sign-up">Start my 7-day free trial</Link>
          </Button>
          <p className="text-xs leading-6">
            Then {priceLabel}/month. Card required. Cancel before your trial
            ends to avoid a charge.
          </p>
          <Link className="text-link" href="/pricing">
            Cheaper than a cup of coffee! →
          </Link>
        </section>
      </main>
    </MarketingShell>
  );
}
